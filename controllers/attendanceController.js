const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Course = require('../models/Course');

// MARK ATTENDANCE (Student only)
const markAttendance = async (req, res) => {
  try {
    const { sessionToken, courseId } = req.body;

    // Get student's IP address
    const studentIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Find session by token instead of ID
    const session = await Session.findOne({ sessionToken });
    if (!session) {
      return res.status(404).json({ message: 'Invalid QR code. Session not found.' });
    }

    // Security Layer 1: Check if QR code has expired
    if (new Date() > new Date(session.qrCodeExpiresAt)) {
      return res.status(400).json({ message: 'QR code has expired. Attendance not recorded.' });
    }

    // Security Layer 2: Check if session is still active
    if (!session.isActive) {
      return res.status(400).json({ message: 'This session is no longer active.' });
    }

    // Security Layer 3: Check if student is enrolled in this course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const isEnrolled = course.students.some(
      studentId => studentId.toString() === req.user.id.toString()
    );
    if (!isEnrolled) {
      return res.status(403).json({ 
        message: 'Access denied. You are not enrolled in this course.' 
      });
    }

    // Security Layer 4: Check if student already marked attendance
    const existingAttendance = await Attendance.findOne({
      session: session._id,
      student: req.user.id
    });
    if (existingAttendance) {
      return res.status(400).json({ message: 'Attendance already marked for this session.' });
    }

    // Security Layer 5: Check if IP already used for this session
    if (session.scannedIPs.includes(studentIP)) {
      return res.status(400).json({ 
        message: 'This device has already been used to mark attendance for this session.' 
      });
    }

    // Add IP to scanned IPs
    session.scannedIPs.push(studentIP);
    await session.save();

    // Create attendance record
    const attendance = new Attendance({
      session: session._id,
      course: courseId,
      student: req.user.id,
      status: 'present'
    });

    // Save to database
    await attendance.save();

    res.status(201).json({ 
      message: 'Attendance marked successfully!', 
      attendance 
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET ATTENDANCE BY SESSION (Lecturer and Admin)
const getAttendanceBySession = async (req, res) => {
  try {
    const attendance = await Attendance.find({ session: req.params.sessionId })
      .populate('student', 'fullName email matriculationNumber')
      .populate('course', 'courseName courseCode');

    res.status(200).json({
      totalPresent: attendance.length,
      attendance
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET ATTENDANCE BY COURSE (Lecturer and Admin)
const getAttendanceByCourse = async (req, res) => {
  try {
    const attendance = await Attendance.find({ course: req.params.courseId })
      .populate('student', 'fullName email matriculationNumber')
      .populate('session', 'date startTime endTime');

    res.status(200).json({
      totalRecords: attendance.length,
      attendance
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET MY ATTENDANCE (Student only)
const getMyAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ student: req.user.id })
      .populate('course', 'courseName courseCode')
      .populate('session', 'date startTime endTime');

    res.status(200).json({
      totalClasses: attendance.length,
      attendance
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// GET ATTENDANCE REPORT BY COURSE (Lecturer and Admin)
const getAttendanceReport = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Get all sessions for this course
    const sessions = await Session.find({ course: courseId });
    const totalSessions = sessions.length;

    // Get all students enrolled in this course
    const course = await Course.findById(courseId)
      .populate('students', 'fullName email matriculationNumber');

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Calculate attendance percentage for each student
    const report = await Promise.all(
      course.students.map(async (student) => {
        const attendanceCount = await Attendance.countDocuments({
          course: courseId,
          student: student._id
        });

        const percentage = totalSessions > 0
          ? ((attendanceCount / totalSessions) * 100).toFixed(1)
          : 0;

        return {
          student: {
            id: student._id,
            fullName: student.fullName,
            email: student.email,
            matriculationNumber: student.matriculationNumber
          },
          attendanceCount,
          totalSessions,
          percentage: `${percentage}%`
        };
      })
    );

    res.status(200).json({
      course: {
        name: course.courseName,
        code: course.courseCode
      },
      totalSessions,
      report
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { 
  markAttendance, 
  getAttendanceBySession, 
  getAttendanceByCourse, 
  getMyAttendance,
  getAttendanceReport
};