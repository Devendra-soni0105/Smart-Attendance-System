// API: GET /api/metrics
// Returns aggregate metrics: totals, today, week, month, top subjects, top depts
import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Log from '@/models/Logs';

function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().slice(0, 10);
}

function weekAgoIST() {
  const now = new Date();
  now.setDate(now.getDate() - 7);
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().slice(0, 10);
}

function monthAgoIST() {
  const now = new Date();
  now.setDate(now.getDate() - 30);
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().slice(0, 10);
}

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);

    const subject = searchParams.get('subject') || '';
    const dept = searchParams.get('dept') || '';
    const lecture = searchParams.get('lecture') || '';

    const filter = {};
    if (subject) filter.subjectName = subject;
    if (dept) filter.dept = dept;
    if (lecture) filter.lectureKey = lecture;

    const today = todayIST();
    const weekAgo = weekAgoIST();
    const monthAgo = monthAgoIST();

    const totals = await Log.countDocuments(filter);
    const todayCount = await Log.countDocuments({ ...filter, date: today });
    const weekCount = await Log.countDocuments({ ...filter, date: { $gte: weekAgo } });
    const monthCount = await Log.countDocuments({ ...filter, date: { $gte: monthAgo } });

    // Top subjects
    const bySubject = await Log.aggregate([
      { $match: filter },
      { $group: { _id: "$subjectName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Top departments
    const byDept = await Log.aggregate([
      { $match: filter },
      { $group: { _id: "$dept", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get distinct values for filters
    const subjects = await Log.distinct('subjectName');
    const depts = await Log.distinct('dept');
    const lectures = await Log.distinct('lectureKey');

    return NextResponse.json({
      totals,
      todayCount,
      weekCount,
      monthCount,
      bySubject: bySubject.filter(s => s._id),
      byDept: byDept.filter(d => d._id),
      subjects: subjects.filter(Boolean),
      depts: depts.filter(Boolean),
      lectures: lectures.filter(Boolean),
    });
  } catch (error) {
    console.error("Metrics API error:", error);
    return NextResponse.json({ totals: 0, todayCount: 0, weekCount: 0, monthCount: 0, bySubject: [], byDept: [] }, { status: 500 });
  }
}
