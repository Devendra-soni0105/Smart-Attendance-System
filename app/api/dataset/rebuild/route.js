import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Student from '@/models/Student';
import fs from 'fs/promises';
import path from 'path';

const PY_API = process.env.PY_API || "http://127.0.0.1:5007";

export async function POST() {
  try {
    await connectDB();
    const students = await Student.find().lean();
    
    // Create a map of personKey to student for quick lookup
    const studentMap = new Map();
    for (const s of students) {
      studentMap.set(s.personKey, s);
    }

    const CSV_PATH = path.join(process.cwd(), 'python_ai', 'dataset', 'students.csv');
    const ENROLLED_DIR = path.join(process.cwd(), 'public', 'Students_enrolled');
    
    // Prepare CSV header
    const headers = ["username", ...Array.from({ length: 512 }, (_, i) => `emb_${i}`)].join(",");
    const rows = [headers];

    let processedCount = 0;
    let errorCount = 0;

    // Scan the directory for samples
    let files = [];
    try {
      files = await fs.readdir(ENROLLED_DIR);
    } catch (e) {
      console.warn("Students_enrolled directory not found");
    }

    for (const file of files) {
      if (!file.endsWith('.jpg') && !file.endsWith('.jpeg') && !file.endsWith('.png')) continue;

      // Extract prefix (fullname_enrollno)
      // Filename format: name_id_sampleid.ext or name_id.ext
      const parts = file.split('_');
      if (parts.length < 2) continue;
      
      // Try to find matching student
      // We'll try to find a personKey that is a prefix of the filename (without extension)
      const filenameNoExt = file.substring(0, file.lastIndexOf('.'));
      let matchedKey = null;
      
      for (const key of studentMap.keys()) {
        if (filenameNoExt.startsWith(key)) {
          matchedKey = key;
          break;
        }
      }

      if (!matchedKey) continue;

      try {
        const res = await fetch(`${PY_API}/reprocess_local`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filepath: `/Students_enrolled/${file}` }),
        });

        const data = await res.json();
        if (data.ok && data.embedding) {
          const row = [matchedKey, ...data.embedding].join(",");
          rows.push(row);
          processedCount++;
        } else {
          errorCount++;
        }
      } catch (err) {
        console.error(`Error processing file ${file}:`, err);
        errorCount++;
      }
    }

    // Write to file
    await fs.writeFile(CSV_PATH, rows.join("\n"));

    // Also trigger training in Python AI
    try {
      await fetch(`${PY_API}/train`, { method: 'POST' });
    } catch (e) {
      console.warn("Could not trigger Python training after rebuild");
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Rebuild complete. Processed ${processedCount} samples. Errors: ${errorCount}`,
      path: 'python_ai/dataset/students.csv'
    });

  } catch (error) {
    console.error("Rebuild Dataset Error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
