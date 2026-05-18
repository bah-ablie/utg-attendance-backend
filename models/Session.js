const mongoose = require('mongoose');
const crypto = require('crypto');

const SessionSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  lecturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  qrCode: {
    type: String,
    default: null
  },
  sessionToken: {
    type: String,
    default: null
  },
  qrCodeExpiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  scannedIPs: [{
    type: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);