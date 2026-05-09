import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Student from '@/models/Student';
import Attendance from '@/models/Attendance';
import Log from '@/models/Logs';
import fs from 'fs/promises';
import path from 'path';

const PY_API = process.env.PY_API || "http://127.0.0.1:5007";
const ENROLLED_DIR = path.join(process.cwd(), 'public', 'Students_enrolled');
const CSV_PATH = path.join(process.cwd(), 'python_ai', 'dataset', 'students.csv');

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { action } = body;

    if (!['removeAllStudents', 'factoryReset'].includes(action)) {
      return NextResponse.json({ ok: false, message: 'Invalid action' }, { status: 400 });
    }

    if (action === 'removeAllStudents') {
      // 1. Delete all students from MongoDB
      await Student.deleteMany({});

      // 2. Delete all files in public/Students_enrolled
      try {
        const files = await fs.readdir(ENROLLED_DIR);
        for (const file of files) {
          if (file !== '.gitkeep') {
            await fs.unlink(path.join(ENROLLED_DIR, file)).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Could not read or empty Students_enrolled dir', err);
      }

      // 3. Clear the Python CSV
      try {
        const headers = ["username", ...Array.from({ length: 512 }, (_, i) => `emb_${i}`)].join(",");
        await fs.writeFile(CSV_PATH, headers + '\n');
      } catch (err) {
        console.warn('Could not clear CSV', err);
      }

      // 4. Trigger python model train (to update KNN model)
      try {
        await fetch(`${PY_API}/train`, { method: 'POST' });
      } catch (err) {
        console.warn('Could not trigger Python training after reset', err);
      }
    }

    if (action === 'factoryReset') {
      // Clear ONLY Attendance and Logs as requested
      await Attendance.deleteMany({});
      await Log.deleteMany({});
    }

    return NextResponse.json({ ok: true, message: `Successfully executed ${action}` });

  } catch (error) {
    console.error("Reset API error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
