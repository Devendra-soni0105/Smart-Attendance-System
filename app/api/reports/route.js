// API: GET /api/reports
// Returns attendance percentage per student, optionally filtered by subject
import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Student from '@/models/Student';
import Attendance from '@/models/Attendance';
import Subject from '@/models/subjects';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const subjectFilter = searchParams.get('subject') || '';

    // Get all subjects for dropdown
    const subjects = await Subject.find({ isActive: true }).lean();

    // Get all students
    const students = await Student.find().lean();

    // Build attendance query
    const attQuery = {};
    if (subjectFilter) {
      const subj = await Subject.findById(subjectFilter).lean();
      if (subj) attQuery.subjectId = subj._id;
    }

    // Get total distinct lectures (dates + lectureKeys)
    const allAttendance = await Attendance.find(attQuery).lean();

    // Count unique lectures
    const lectureSet = new Set();
    allAttendance.forEach(a => {
      lectureSet.add(`${a.subjectId}_${a.date}_${a.lectureKey}`);
    });
    const totalLectures = lectureSet.size;

    // Build per-student report
    const report = students.map(student => {
      const attended = allAttendance.filter(
        a => a.studentId.toString() === student._id.toString() && a.status === 'Present'
      ).length;

      // Count total lectures for this student (they should have records for all)
      const total = totalLectures;
      const percentage = total > 0 ? ((attended / total) * 100).toFixed(1) : '0.0';

      return {
        enrollno: student.enrollno,
        fullname: student.fullname,
        dept: student.dept,
        attended,
        total,
        percentage: parseFloat(percentage),
      };
    });

    return NextResponse.json({
      report,
      totalLectures,
      enrolledStudents: students.length,
      subjects: subjects.map(s => ({ _id: s._id, name: s.name, code: s.code })),
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ report: [], error: error.message }, { status: 500 });
  }
}
