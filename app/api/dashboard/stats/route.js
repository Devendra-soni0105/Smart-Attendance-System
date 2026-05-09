// API: GET /api/dashboard/stats
// Returns: enrolledUsers, todaysAttendance, avgConfidence, systemStatus
import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Student from '@/models/Student';
import Attendance from '@/models/Attendance';

function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    await connectDB();

    const enrolledUsers = await Student.countDocuments();
    const today = todayIST();
    const todaysAttendance = await Attendance.countDocuments({ date: today, status: "Present" });

    // Average confidence from today's records
    const confAgg = await Attendance.aggregate([
      { $match: { date: today, status: "Present" } },
      { $group: { _id: null, avg: { $avg: "$confidence" } } },
    ]);
    const avgConfidence = confAgg.length > 0 ? (confAgg[0].avg * 100).toFixed(1) + "%" : "0.0%";

    return NextResponse.json({
      enrolledUsers,
      todaysAttendance,
      avgConfidence,
      systemStatus: "Online",
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({
      enrolledUsers: 0,
      todaysAttendance: 0,
      avgConfidence: "0.0%",
      systemStatus: "Error",
    }, { status: 500 });
  }
}
