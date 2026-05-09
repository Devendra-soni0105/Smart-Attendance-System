import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import { initializeAbsentStudents } from '@/lib/attendanceUtils';

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { subjectId, date, lectureKey } = body;

    if (!subjectId || !date) {
      return NextResponse.json({ ok: false, message: "subjectId and date are required" }, { status: 400 });
    }

    await initializeAbsentStudents(subjectId, date, lectureKey);

    return NextResponse.json({ ok: true, message: "Remaining students marked as absent" });

  } catch (error) {
    console.error("Mark remaining absent error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
