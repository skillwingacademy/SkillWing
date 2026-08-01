const Session = require('../models/Session');
const Classroom = require('../models/Classroom');
const { uploadSessionFile, deleteSessionFile } = require('../services/gcsService');

/**
 * Helper: verify teacher owns the classroom that a session belongs to.
 */
async function verifySessionOwnership(sessionId, userId, role) {
  const session = await Session.findById(sessionId).populate('classroom');
  if (!session) return { error: 'Session not found', status: 404 };
  if (!session.classroom) return { error: 'Classroom not found for this session', status: 404 };

  if (
    role === 'teacher' &&
    session.classroom.teacher &&
    session.classroom.teacher.toString() !== userId
  ) {
    return { error: 'Access denied', status: 403 };
  }

  return { session, classroom: session.classroom };
}

// @desc    Upload a file attachment to a session (homework or teacherNotes)
// @route   POST /api/classrooms/sessions/:id/files
// @access  Private (teacher/admin)
const uploadFile = async (req, res) => {
  try {
    const { session, error, status } = await verifySessionOwnership(
      req.params.id, req.user.id, req.user.role
    );
    if (error) return res.status(status).json({ success: false, message: error });

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const field = req.body.field; // 'homework' or 'teacherNotes'
    if (!['homework', 'teacherNotes'].includes(field)) {
      return res.status(400).json({ success: false, message: 'field must be "homework" or "teacherNotes"' });
    }

    // Generate unique filename
    const ext = req.file.originalname.split('.').pop();
    const safeName = req.file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);
    const filename = `${Date.now()}-${safeName}`;

    // Upload to GCS
    const url = await uploadSessionFile(
      req.file.buffer,
      filename,
      req.file.mimetype,
      session._id.toString()
    );

    // Ensure the subdocument exists (backward compat)
    if (!session[field] || typeof session[field] === 'string') {
      session[field] = { content: session[field] || '', files: [] };
    }
    if (!session[field].files) {
      session[field].files = [];
    }

    // Push file metadata
    session[field].files.push({
      name: req.file.originalname,
      url,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
    });

    session.markModified(field);
    await session.save();

    res.status(200).json({
      success: true,
      data: session[field],
    });
  } catch (error) {
    console.error('uploadSessionFile error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete a file attachment from a session
// @route   DELETE /api/classrooms/sessions/:id/files
// @access  Private (teacher/admin)
const deleteFile = async (req, res) => {
  try {
    const { session, error, status } = await verifySessionOwnership(
      req.params.id, req.user.id, req.user.role
    );
    if (error) return res.status(status).json({ success: false, message: error });

    const { field, fileUrl } = req.body;
    if (!['homework', 'teacherNotes'].includes(field)) {
      return res.status(400).json({ success: false, message: 'field must be "homework" or "teacherNotes"' });
    }
    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'fileUrl is required' });
    }

    // Delete from GCS
    await deleteSessionFile(fileUrl);

    // Remove from the files array
    if (session[field] && session[field].files) {
      session[field].files = session[field].files.filter(
        (f) => f.url !== fileUrl
      );
    }

    session.markModified(field);
    await session.save();

    res.status(200).json({
      success: true,
      data: session[field],
    });
  } catch (error) {
    console.error('deleteSessionFile error:', error.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { uploadFile, deleteFile };
