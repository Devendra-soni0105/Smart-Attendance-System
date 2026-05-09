// API: POST /api/manual-override
// Manually mark a student present/absent for a subject+date+lecture
import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Student from '@/models/Student';
import Attendance from '@/models/Attendance';
import Subject from '@/models/subjects';
import Log from '@/models/Logs';
import { initializeAbsentStudents } from '@/lib/attendanceUtils';

function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().slice(0, 10);
}

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const date = searchParams.get("date") || todayIST();
    const lectureKey = searchParams.get("lectureKey") || "";

    if (!subjectId) {
      return NextResponse.json({ ok: false, message: "subjectId is required" }, { status: 400 });
    }

    const records = await Attendance.find({ subjectId, date, lectureKey }).lean();
    
    return NextResponse.json({ ok: true, records });
  } catch (error) {
    console.error("Fetch attendance error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { enrollno, subjectId, status, lectureKey, date } = body;

    if (!enrollno || !subjectId) {
      return NextResponse.json({ ok: false, message: "enrollno and subjectId are required" }, { status: 400 });
    }

    const student = await Student.findOne({ enrollno: enrollno.trim() });
    if (!student) {
      return NextResponse.json({ ok: false, message: "Student not found" }, { status: 404 });
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return NextResponse.json({ ok: false, message: "Subject not found" }, { status: 404 });
    }

    const attDate = date || todayIST();
    const lKey = lectureKey || "";
    const attStatus = status || "Present";

    // Auto-mark others as absent if not already marked
    await initializeAbsentStudents(subjectId, attDate, lKey);

    // Upsert attendance
    const att = await Attendance.findOneAndUpdate(
      { studentId: student._id, subjectId: subject._id, date: attDate, lectureKey: lKey },
      {
        $set: {
          status: attStatus,
          confidence: 1.0,
          mode: "manual",
        }
      },
      { upsert: true, new: true }
    );

    // Create or update log entry
    await Log.findOneAndUpdate(
      { enrollno: student.enrollno, subjectName: subject.name, date: attDate, lectureKey: lKey },
      {
        $set: {
          fullname: student.fullname,
          dept: student.dept,
          profilePic: student.profilePic,
          confidence: 1.0,
          status: attStatus,
          mode: "manual",
        }
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      ok: true,
      message: `Attendance ${attStatus} recorded for ${student.fullname}`,
      attendance: att,
    });

  } catch (error) {
    console.error("Manual override error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
