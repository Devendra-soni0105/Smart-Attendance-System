import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Attendance from '@/models/Attendance';
import Log from '@/models/Logs';

export async function DELETE(request) {
  try {
    await connectDB();
    
    // Delete all attendance records
    const attResult = await Attendance.deleteMany({});
    
    // Delete all log entries (since they are related to attendance)
    const logResult = await Log.deleteMany({});
    
    return NextResponse.json({ 
      ok: true, 
      message: "System reset successful", 
      details: {
        attendanceDeleted: attResult.deletedCount,
        logsDeleted: logResult.deletedCount
      }
    });
  } catch (error) {
    console.error("Clear attendance error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
