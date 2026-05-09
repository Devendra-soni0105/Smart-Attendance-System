import { NextResponse } from "next/server";
import connectDB from "@/db/connectdb";
import Student from "@/models/Student";
import fs from 'fs';
import path from 'path';

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id, sampleId } = await params;

    const student = await Student.findById(id);
    if (!student) {
      return NextResponse.json({ ok: false, message: "Student not found" }, { status: 404 });
    }

    // Find the sample to get the image path
    const sampleIndex = student.samples.findIndex(s => s.sampleId === sampleId);
    if (sampleIndex === -1) {
      return NextResponse.json({ ok: false, message: "Sample not found" }, { status: 404 });
    }

    const sample = student.samples[sampleIndex];

    // 1. Delete file from disk if it exists
    if (sample.imagePath) {
      const fullPath = path.join(process.cwd(), 'public', sample.imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }

    // 2. Remove from array
    student.samples.splice(sampleIndex, 1);

    // 3. Re-calculate mean embedding
    if (student.samples.length > 0) {
      const count = student.samples.length;
      const sum = new Array(512).fill(0);
      
      student.samples.forEach(s => {
        if (s.embedding && s.embedding.length === 512) {
          for (let i = 0; i < 512; i++) {
            sum[i] += s.embedding[i];
          }
        }
      });
      
      student.meanEmbedding = sum.map(val => val / count);
    } else {
      student.meanEmbedding = [];
    }

    await student.save();

    return NextResponse.json({ ok: true, message: "Sample deleted" });
  } catch (error) {
    console.error("Delete sample error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
