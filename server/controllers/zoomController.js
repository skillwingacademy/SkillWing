const Session = require('../models/Session');
const Classroom = require('../models/Classroom');
const { createMeeting } = require('../services/ZoomService');

/**
 * @desc    Generate a Zoom meeting link for a session (time-gated to 15 min before class)
 * @route   POST /api/classrooms/sessions/:id/generate-zoom-link
 * @access  Private (teacher/admin)
 */
const generateZoomLink = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id).populate('classroom');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!session.classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found for this session' });
    }

    // Ownership check: teacher must own the classroom
    if (
      req.user.role === 'teacher' &&
      session.classroom.teacher.toString() !== req.user.id
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Only allow for scheduled sessions
    if (session.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: `Cannot generate a link for a session with status "${session.status}".`,
      });
    }

    // ── Time-Gate Validation ──────────────────────────
    const now = new Date();
    const sessionStart = new Date(session.startTime);
    const minutesBefore = (sessionStart.getTime() - now.getTime()) / (1000 * 60);

    if (minutesBefore > 15) {
      return res.status(400).json({
        success: false,
        message: 'Meeting links can only be generated 15 minutes prior to class start time.',
      });
    }

    // If a link already exists, return it without creating a new meeting
    if (session.googleMeetLink) {
      return res.status(200).json({
        success: true,
        data: { joinUrl: session.googleMeetLink },
        message: 'Meeting link already exists for this session.',
      });
    }

    // ── Generate Zoom Meeting ──────────────────────────
    const durationMinutes = Math.round(
      (new Date(session.endTime).getTime() - sessionStart.getTime()) / (1000 * 60)
    ) || 60;

    const zoomResult = await createMeeting(
      session.title || `Session ${session.sessionNumber}`,
      session.startTime,
      durationMinutes
    );

    // ── Update ONLY the meeting link fields (zero disruption) ──
    session.googleMeetLink = zoomResult.joinUrl;
    session.zoomMeetingId = String(zoomResult.meetingId);
    session.joinEnabled = true;

    // Use markModified to ensure Mongoose detects the change
    session.markModified('googleMeetLink');
    session.markModified('joinEnabled');
    await session.save();

    res.status(200).json({
      success: true,
      data: {
        joinUrl: zoomResult.joinUrl,
        startUrl: zoomResult.startUrl,
        meetingId: zoomResult.meetingId,
      },
      message: 'Zoom meeting link generated successfully.',
    });
  } catch (error) {
    console.error('generateZoomLink error:', error.message);

    // Provide a more helpful error for Zoom API failures
    if (error.response && error.response.data) {
      console.error('Zoom API error details:', JSON.stringify(error.response.data));
      return res.status(502).json({
        success: false,
        message: `Zoom API error: ${error.response.data.message || 'Unknown error'}`,
      });
    }

    res.status(500).json({ success: false, message: 'Server error generating Zoom link' });
  }
};

module.exports = { generateZoomLink };
