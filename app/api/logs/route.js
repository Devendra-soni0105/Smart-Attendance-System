// API: GET /api/logs
// Returns: logs array with optional query filters
import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Log from '@/models/Logs';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const q = searchParams.get('q') || '';
    const subject = searchParams.get('subject') || '';
    const dept = searchParams.get('dept') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const lecture = searchParams.get('lecture') || '';
    const status = searchParams.get('status') || '';

    const filter = {};

    if (q) {
      filter.$or = [
        { fullname: { $regex: q, $options: 'i' } },
        { enrollno: { $regex: q, $options: 'i' } },
        { subjectName: { $regex: q, $options: 'i' } },
      ];
    }
    if (subject) filter.subjectName = subject;
    if (dept) filter.dept = dept;
    if (lecture) filter.lectureKey = lecture;
    if (status) filter.status = status;

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const logs = await Log.find(filter).sort({ createdAt: -1 }).limit(500).lean();

    // Get distinct values for filter dropdowns
    const subjects = await Log.distinct('subjectName');
    const depts = await Log.distinct('dept');
    const lectures = await Log.distinct('lectureKey');

    return NextResponse.json({
      logs,
      total: logs.length,
      subjects: subjects.filter(Boolean),
      depts: depts.filter(Boolean),
      lectures: lectures.filter(Boolean),
    });
  } catch (error) {
    console.error("Logs API error:", error);
    return NextResponse.json({ logs: [], total: 0, error: error.message }, { status: 500 });
  }
}
