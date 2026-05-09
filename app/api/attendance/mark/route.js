import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Attendance from '@/models/Attendance';
import Subject from '@/models/subjects';
import Log from '@/models/Logs';
import Student from '@/models/Student';
import { initializeAbsentStudents } from '@/lib/attendanceUtils';

function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().slice(0, 10);
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { studentId, subjectId, lectureKey, confidence, faceBox } = body;

    if (!studentId || !subjectId) {
      return NextResponse.json({ ok: false, message: "studentId and subjectId are required" }, { status: 400 });
    }

    const today = todayIST();
    const student = await Student.findById(studentId).lean();
    if (!student) return NextResponse.json({ ok: false, message: "Student not found" }, { status: 404 });

    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return NextResponse.json({ ok: false, message: "Subject not found" }, { status: 404 });

    // Auto-mark others as absent if not already marked
    await initializeAbsentStudents(subjectId, today, lectureKey);

    try {
      await Attendance.findOneAndUpdate(
        { studentId, subjectId, date: today, lectureKey: lectureKey || "" },
        {
          $set: {
            status: "Present",
            confidence: confidence || 0,
            mode: "manual",
            faceBox: faceBox || null,
          }
        },
        { upsert: true, new: true }
      );

      // Log the event - update existing log for same lecture/date/student if exists
      await Log.findOneAndUpdate(
        { enrollno: student.enrollno, subjectName: subject.name, date: today, lectureKey: lectureKey || "" },
        {
          $set: {
            fullname: student.fullname,
            dept: student.dept,
            profilePic: student.profilePic,
            confidence: confidence || 0,
            status: "Present",
            mode: "manual",
          }
        },
        { upsert: true, new: true }
      );

      return NextResponse.json({ ok: true, message: `Attendance marked/updated for ${student.fullname}` });

    } catch (err) {
      throw err;
    }

  } catch (error) {
    console.error("Mark attendance error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
