// API: POST /api/python-proxy/recognize
// Forwards frame to Python AI, then matches embedding against DB students
import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Student from '@/models/Student';
import Attendance from '@/models/Attendance';
import Subject from '@/models/subjects';
import Log from '@/models/Logs';
import { initializeAbsentStudents } from '@/lib/attendanceUtils';

const PY_API = process.env.PY_API || "http://127.0.0.1:5007";

function todayIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().slice(0, 10);
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { image, subjectId, lectureKey } = body;

    if (!image) {
      return NextResponse.json({ ok: false, message: "No image provided" }, { status: 400 });
    }

    // 1. Send frame to Python AI for face detection + embedding
    const pyRes = await fetch(`${PY_API}/recognize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });

    const pyData = await pyRes.json();

    if (!pyData.ok || pyData.face_count === 0) {
      return NextResponse.json({
        ok: true,
        recognized: false,
        face_count: pyData.face_count || 0,
        results: [],
        message: pyData.message || "No face detected",
      });
    }

    // 2. Process all recognition results
    const results = pyData.results || [];
    const recognizedStudents = [];
    let attendanceCount = 0;

    // Auto-mark others as absent if not already marked
    if (subjectId) {
      await initializeAbsentStudents(subjectId, todayIST(), lectureKey);
    }

    for (const res of results) {
      const isRecognized = res.predicted_user && res.predicted_user !== "Unknown";
      if (!isRecognized) continue;

      const student = await Student.findOne({ personKey: res.predicted_user }).lean();
      if (!student) continue;

      recognizedStudents.push({
        _id: student._id,
        fullname: student.fullname,
        enrollno: student.enrollno,
        dept: student.dept,
        profilePic: student.profilePic,
        faceImage: res.face_image, // Include the live face crop
        confidence: res.confidence,
        box: res.box
      });

      // 3. Record attendance if subjectId provided
      if (subjectId) {
        const today = todayIST();
        const lKey = lectureKey || "";

        try {
          const subject = await Subject.findById(subjectId).lean();
          
          await Attendance.findOneAndUpdate(
            { studentId: student._id, subjectId, date: today, lectureKey: lKey },
            {
              $set: {
                status: "Present",
                confidence: res.confidence,
                mode: "auto",
                faceBox: res.box,
              }
            },
            { upsert: true, new: true }
          );
          attendanceCount++;

          // Also update/create a log entry
          await Log.findOneAndUpdate(
            { enrollno: student.enrollno, subjectName: subject ? subject.name : "", date: today, lectureKey: lKey },
            {
              $set: {
                fullname: student.fullname,
                dept: student.dept,
                profilePic: student.profilePic,
                confidence: res.confidence,
                status: "Present",
                mode: "auto",
              }
            },
            { upsert: true, new: true }
          );
        } catch (err) {
          console.error(`Error updating attendance for ${student.fullname}:`, err);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      recognized: recognizedStudents.length > 0,
      face_count: pyData.face_count,
      results: recognizedStudents,
      attendanceCount,
      message: recognizedStudents.length > 0 
        ? `Recognized ${recognizedStudents.length} face(s)` 
        : "No recognized faces found",
    });

  } catch (error) {
    console.error("Recognize API error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
