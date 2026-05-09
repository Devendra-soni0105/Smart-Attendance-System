import { NextResponse } from "next/server";
import connectDB from "@/db/connectdb";
import Student from "@/models/Student";
import fs from 'fs/promises';
import path from 'path';

const PY_API = process.env.PY_API || "http://127.0.0.1:5007";

function safeName(str) {
  return (str || "user").toString().trim().toLowerCase().replace(/[^a-z0-9-_ ]/g, "").replace(/\s+/g, "_");
}

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const { deleteAll } = await request.json();

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ ok: false, message: "Student not found" }, { status: 404 });
    }

    const personKey = student.personKey;
    const filePrefix = `${safeName(student.fullname)}_${safeName(student.enrollno)}`;
    let deletedFiles = 0;

    // 1. Remove rows from CSV
    const CSV_PATH = path.join(process.cwd(), 'python_ai', 'dataset', 'students.csv');
    try {
      const csvContent = await fs.readFile(CSV_PATH, 'utf-8');
      const lines = csvContent.split('\n');
      const filtered = lines.filter((line, i) => {
        if (i === 0) return true; // keep header
        if (!line.trim()) return false;
        const firstCol = line.split(',')[0];
        return firstCol !== personKey;
      });
      await fs.writeFile(CSV_PATH, filtered.join('\n'));
    } catch (e) {
      console.warn("Could not update CSV:", e.message);
    }

    // 2. Delete sample image files from disk (keep profile pic if not deleteAll)
    const enrolledDir = path.join(process.cwd(), 'public', 'Students_enrolled');
    try {
      const files = await fs.readdir(enrolledDir);
      const toDelete = files.filter(f => {
        if (!f.startsWith(filePrefix)) return false;
        if (deleteAll) return true;
        // If not deleteAll, only delete sample files (ones with sampleId in name)
        // Profile pic is just name_id.ext, samples are name_id_sampleid.ext
        const nameNoExt = f.substring(0, f.lastIndexOf('.'));
        const afterPrefix = nameNoExt.substring(filePrefix.length);
        // If there's more after the prefix (e.g. _1234567), it's a sample
        return afterPrefix.length > 0;
      });

      for (const file of toDelete) {
        await fs.unlink(path.join(enrolledDir, file));
        deletedFiles++;
      }
    } catch (e) {
      console.warn("Error deleting sample images:", e.message);
    }

    // 3. Reset sample count in DB
    await Student.findByIdAndUpdate(id, { $set: { sampleCount: 0 } });

    // 4. Retrain the model
    try {
      await fetch(`${PY_API}/train`, { method: 'POST' });
    } catch (e) {
      console.warn("Could not retrain model after sample deletion:", e.message);
    }

    return NextResponse.json({ 
      ok: true, 
      message: `All samples deleted (${deletedFiles} files removed). Ready for re-collection.`
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
