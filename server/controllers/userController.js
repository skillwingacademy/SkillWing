const User = require('../models/User');
const path = require('path');
const { uploadToGCS, deleteFromGCS } = require('../services/gcsService');

// @desc    Get current user's profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('enrolledCourses', 'title description price thumbnailImage isActive')
      .populate('intendedCourse', 'title');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
    });
  }
};

// @desc    Get any user's profile by ID
// @route   GET /api/users/profile/:id
// @access  Private
const getProfileById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('enrolledCourses', 'title description price thumbnailImage isActive')
      .populate('intendedCourse', 'title');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const userObj = user.toObject();

    // Strip email & phone for non-admin viewers who are not the profile owner
    const isOwner = req.user.id === req.params.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      delete userObj.email;
      if (userObj.profile) {
        delete userObj.profile.phoneNumber;
      }
      delete userObj.phoneNumber;
    }

    res.status(200).json({
      success: true,
      data: userObj,
    });
  } catch (error) {
    console.error('Get profile by id error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile',
    });
  }
};

// @desc    Update current user's profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // ── Whitelist: only these fields can be updated ──
    // Root-level
    if (req.body.name !== undefined) {
      user.name = req.body.name;
    }

    // Profile-level — extract from req.body.profile
    const p = req.body.profile || {};
    const allowedProfileFields = [
      'phoneNumber',
      'gender',
      'dob',
      'bio',
      'timezone',
      'qualifications',
      'yearsOfExperience',
      'schoolOrCollege',
    ];

    // Initialise profile if it doesn't exist
    if (!user.profile) {
      user.profile = {};
    }

    for (const field of allowedProfileFields) {
      if (p[field] !== undefined) {
        user.profile[field] = p[field];
      }
    }

    // Address — nested object
    if (p.address && typeof p.address === 'object') {
      if (!user.profile.address) {
        user.profile.address = {};
      }
      const allowedAddressFields = ['street', 'city', 'state', 'zipCode'];
      for (const field of allowedAddressFields) {
        if (p.address[field] !== undefined) {
          user.profile.address[field] = p.address[field];
        }
      }
    }

    user.markModified('profile');
    await user.save();

    // Return updated user without password
    const updated = await User.findById(user._id).select('-password');

    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Update profile error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile',
    });
  }
};

// @desc    Upload avatar image to Google Cloud Storage
// @route   POST /api/users/profile/avatar
// @access  Private
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete old avatar from GCS if it exists
    if (user.profile?.avatarUrl) {
      await deleteFromGCS(user.profile.avatarUrl);
    }

    // Generate a unique filename
    const ext = path.extname(req.file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `avatar-${req.user.id}-${uniqueSuffix}${ext}`;

    // Upload to GCS and get the public URL
    const avatarUrl = await uploadToGCS(req.file.buffer, filename, req.file.mimetype);

    // Save the URL to the user profile
    if (!user.profile) {
      user.profile = {};
    }
    user.profile.avatarUrl = avatarUrl;
    user.markModified('profile');
    await user.save();

    res.status(200).json({
      success: true,
      data: { avatarUrl },
    });
  } catch (error) {
    console.error('Upload avatar error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error uploading avatar',
    });
  }
};

// @desc    Remove avatar image from Google Cloud Storage
// @route   DELETE /api/users/profile/avatar
// @access  Private
const removeAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (user.profile?.avatarUrl) {
      // Delete from GCS
      await deleteFromGCS(user.profile.avatarUrl);

      // Clear the URL in the database
      user.profile.avatarUrl = '';
      user.markModified('profile');
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Avatar removed successfully',
    });
  } catch (error) {
    console.error('Remove avatar error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error removing avatar',
    });
  }
};

module.exports = { getProfile, getProfileById, updateProfile, uploadAvatar, removeAvatar };

