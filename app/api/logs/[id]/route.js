import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Log from '@/models/Logs';
import Attendance from '@/models/Attendance';
import Student from '@/models/Student';
import Subject from '@/models/subjects';

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;

    const log = await Log.findById(id);
    if (!log) {
      return NextResponse.json({ ok: false, message: "Log record not found" }, { status: 404 });
    }

    // Try to find and delete the corresponding Attendance record
    // 1. Find student
    const student = await Student.findOne({ enrollno: log.enrollno });
    // 2. Find subject
    const subject = await Subject.findOne({ name: log.subjectName });

    if (student && subject) {
      await Attendance.deleteOne({
        studentId: student._id,
        subjectId: subject._id,
        date: log.date,
        lectureKey: log.lectureKey
      });
    }

    // Delete the log entry
    await Log.findByIdAndDelete(id);

    return NextResponse.json({ ok: true, message: "Attendance record deleted successfully" });
  } catch (error) {
    console.error("Delete log error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
