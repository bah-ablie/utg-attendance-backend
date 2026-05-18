const Session = require('../models/Session');
const QRCode = require('qrcode');
const crypto = require('crypto');

// CREATE A SESSION AND GENERATE QR CODE (Lecturer only)
const createSession = async (req, res) => {
  try {
    const { course, startTime, endTime } = req.body;

    // Generate unique session token
    const sessionToken = crypto.randomBytes(32).toString('hex');

    // Create new session
    const newSession = new Session({
      course,
      lecturer: req.user.id,
      startTime,
      endTime,
      sessionToken
    });

    // Save session to get its ID
    await newSession.save();

    // Generate QR code using session token (NOT session ID)
    const qrData = JSON.stringify({
      sessionToken: sessionToken,
      courseId: course,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    // Convert to QR code image (base64)
    const qrCode = await QRCode.toDataURL(qrData);

    // Set expiry time to 5 minutes from now
    newSession.qrCode = qrCode;
    newSession.qrCodeExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save again with QR code
    await newSession.save();

    res.status(201).json({
      message: 'Session created and QR code generated successfully',
      session: {
        id: newSession._id,
        course: newSession.course,
        date: newSession.date,
        startTime: newSession.startTime,
        endTime: newSession.endTime,
        qrCode: newSession.qrCode,
        sessionToken: newSession.sessionToken,
        qrCodeExpiresAt: newSession.qrCodeExpiresAt
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET ALL SESSIONS (Admin and Lecturer)
const getAllSessions = async (req, res) => {
  try {
    const sessions = await Session.find()
      .populate('course', 'courseName courseCode')
      .populate('lecturer', 'fullName email');

    res.status(200).json(sessions);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET A SINGLE SESSION
const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('course', 'courseName courseCode')
      .populate('lecturer', 'fullName email');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.status(200).json(session);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET SESSIONS BY LECTURER
const getLecturerSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ lecturer: req.user.id })
      .populate('course', 'courseName courseCode');

    res.status(200).json(sessions);

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { createSession, getAllSessions, getSessionById, getLecturerSessions };