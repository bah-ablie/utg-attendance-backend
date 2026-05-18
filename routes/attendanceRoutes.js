const express = require('express');
const router = express.Router();
const {
  markAttendance,
  getAttendanceBySession,
  getAttendanceByCourse,
  getMyAttendance,
  getAttendanceReport
} = require('../controllers/attendanceController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Mark attendance - Student only
router.post('/', protect, authorizeRoles('student'), markAttendance);

// Get attendance by session - Lecturer and Admin
router.get('/session/:sessionId', protect, authorizeRoles('lecturer', 'admin'), getAttendanceBySession);

// Get attendance by course - Lecturer and Admin
router.get('/course/:courseId', protect, authorizeRoles('lecturer', 'admin'), getAttendanceByCourse);

// Get attendance report by course - Lecturer and Admin
router.get('/report/:courseId', protect, authorizeRoles('lecturer', 'admin'), getAttendanceReport);

// Get my attendance - Student only
router.get('/my-attendance', protect, authorizeRoles('student'), getMyAttendance);

module.exports = router;