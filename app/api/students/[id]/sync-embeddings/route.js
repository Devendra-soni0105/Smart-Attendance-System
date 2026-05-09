import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Student from '@/models/Student';
import fs from 'fs';
import path from 'path';

const PY_API = process.env.PY_API || "http://127.0.0.1:5001";

export async function POST(request, { params }) {
  console.log(`Sync request started. PY_API configured as: ${PY_API}`);
  try {
    await connectDB();
    const { id } = await params;
    const student = await Student.findById(id);

    if (!student) {
      return NextResponse.json({ ok: false, message: "Student not found" }, { status: 404 });
    }

    const username = `${student.fullname.replace(/\s+/g, "_").toLowerCase()}_${student.enrollno.toLowerCase()}`;
    const CSV_PATH = path.join(process.cwd(), 'python_ai', 'dataset', 'students_embedding.csv');
    
    let updatedCount = 0;
    const newRows = [];

    console.log(`Starting sync for ${student.fullname}. Samples in DB: ${student.samples.length}`);
    if (student.samples.length > 0) {
      console.log(`First sample path: ${student.samples[0].imagePath}`);
    }

    // 1. Process each sample
    for (let i = 0; i < student.samples.length; i++) {
      const sample = student.samples[i];
      if (!sample.imagePath) continue;

      try {
        const res = await fetch(`${PY_API}/reprocess_local`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filepath: sample.imagePath }),
        });

        if (!res.ok) {
          console.error(`Sample ${i} failed with status ${res.status}`);
          continue;
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error(`Sample ${i} returned non-JSON response`);
          continue;
        }

        const data = await res.json();
        if (data.ok && data.embedding) {
          // Update MongoDB record
          student.samples[i].embedding = data.embedding;
          
          // Prepare for CSV
          const row = [username, ...data.embedding].join(",");
          newRows.push(row);
          updatedCount++;
        }
      } catch (err) {
        console.error(`Error syncing sample ${i} for ${student.fullname}:`, err);
      }
    }

    // 2. Recalculate mean embedding
    if (student.samples.length > 0) {
      const sum = new Array(512).fill(0);
      let count = 0;
      student.samples.forEach(s => {
        if (s.embedding && s.embedding.length === 512) {
          for (let i = 0; i < 512; i++) sum[i] += s.embedding[i];
          count++;
        }
      });
      if (count > 0) {
        student.meanEmbedding = sum.map(v => v / count);
      }
    }

    await student.save();

    // 3. Append to CSV if rows were generated
    if (newRows.length > 0) {
      if (!fs.existsSync(CSV_PATH)) {
        const header = ["username", ...Array.from({ length: 512 }, (_, i) => `emb_${i}`)].join(",");
        fs.writeFileSync(CSV_PATH, header + "\n");
      }
      fs.appendFileSync(CSV_PATH, newRows.join("\n") + "\n");
    }

    return NextResponse.json({ 
      ok: true, 
      message: `Successfully synced ${updatedCount} samples for ${student.fullname}`,
      student
    });

  } catch (error) {
    console.error("Sync embeddings error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
