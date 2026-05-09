import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Student from '@/models/Student';
import fs from 'fs/promises';
import path from 'path';

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    
    const updated = await Student.findByIdAndUpdate(
      id,
      { $set: body },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return NextResponse.json({ ok: false, message: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, student: updated });
  } catch (error) {
    console.error("Update student error:", error);
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    
    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ ok: false, message: "Student not found" }, { status: 404 });
    }

    const personKey = student.personKey;
    const safeName = (str) => (str || "user").toString().trim().toLowerCase().replace(/[^a-z0-9-_ ]/g, "").replace(/\s+/g, "_");
    const filePrefix = `${safeName(student.fullname)}_${safeName(student.enrollno)}`;

    // 1. Remove all rows for this student from the CSV
    const CSV_PATH = path.join(process.cwd(), 'python_ai', 'dataset', 'students.csv');
    try {
      const csvContent = await fs.readFile(CSV_PATH, 'utf-8');
      const lines = csvContent.split('\n');
      // Keep header (line 0) and any line whose first column does NOT match the personKey
      const filtered = lines.filter((line, i) => {
        if (i === 0) return true; // keep header
        if (!line.trim()) return false; // remove empty lines
        const firstCol = line.split(',')[0];
        return firstCol !== personKey;
      });
      await fs.writeFile(CSV_PATH, filtered.join('\n'));
      console.log(`Removed CSV rows for personKey: ${personKey}`);
    } catch (e) {
      console.warn("Could not update CSV:", e.message);
    }

    // 2. Delete all associated images from disk
    const enrolledDir = path.join(process.cwd(), 'public', 'Students_enrolled');
    try {
      const files = await fs.readdir(enrolledDir);
      const toDelete = files.filter(f => f.startsWith(filePrefix));
      for (const file of toDelete) {
        await fs.unlink(path.join(enrolledDir, file));
      }
      console.log(`Deleted ${toDelete.length} image files for ${student.enrollno}`);
    } catch (e) {
      console.warn("Error deleting student images:", e.message);
    }

    // 3. Delete the record from DB
    await Student.findByIdAndDelete(id);

    // 4. Retrain the KNN model so it no longer recognizes this student
    const PY_API = process.env.PY_API || "http://127.0.0.1:5007";
    try {
      await fetch(`${PY_API}/train`, { method: 'POST' });
      console.log("KNN model retrained after student deletion");
    } catch (e) {
      console.warn("Could not retrain model after deletion:", e.message);
    }

    return NextResponse.json({ ok: true, message: "Student and all associated data deleted successfully" });
  } catch (error) {
    console.error("Delete student error:", error);
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}
