import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import connectDB from '@/db/connectdb';
import Student from '@/models/Student';

const PY_API = process.env.PY_API || "http://127.0.0.1:5007";
const STUDENTS_ENROLLED_DIR = path.join(process.cwd(), 'public', 'Students_enrolled');

async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

function safeName(str) {
  return (str || "user")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]/g, "")
    .replace(/\s+/g, "_");
}

function uniqueId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function saveEnrollImageToFace({ imageDataUrl, fullname, enrollno, sampleId }) {
  const m = String(imageDataUrl || "").match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
  if (!m) {
    console.error("Image Save Failed: Not a valid dataURL");
    return { ok: false, message: "Not a dataURL image" };
  }

  // Always force saving as .png since we requested Python AI to return PNG
  const ext = "png";
  const base64Data = m[2];

  await ensureDir(STUDENTS_ENROLLED_DIR);

  // Use sampleId for unique filename if it's a sample
  const filename = sampleId 
    ? `${safeName(fullname)}_${safeName(enrollno)}_${sampleId}.${ext}`
    : `${safeName(fullname)}_${safeName(enrollno)}.${ext}`;
    
  const filepath = path.join(STUDENTS_ENROLLED_DIR, filename);

  console.log(`Saving image to: ${filepath}`);
  
  await fs.writeFile(filepath, Buffer.from(base64Data, "base64"));

  return { ok: true, filename, filepath, url: `/Students_enrolled/${filename}` };
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { fullname, enrollno, dept, image, isSample, isTraining } = body;

    if (!fullname || !image || !enrollno) {
      return NextResponse.json({ ok: false, message: "fullname, enrollno, and image are required" }, { status: 400 });
    }

    // 1. Forward to Python AI
    const pyRes = await fetch(`${PY_API}/enroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullname, enrollno, dept, image, is_training: isTraining }),
    });

    const data = await pyRes.json();
    if (!pyRes.ok || !data.ok) {
      return NextResponse.json(data, { status: pyRes.status || 400 });
    }

    const personKey = String(data?.personKey || `${safeName(fullname)}_${safeName(enrollno)}`).trim();
    const sampleId = String(data?.sampleId || uniqueId());
    const embedding = data?.embedding || [];

    if (isTraining && (!Array.isArray(embedding) || embedding.length < 100)) {
      return NextResponse.json({ ok: false, message: "Python did not return a valid embedding during training" }, { status: 500 });
    }

    // 2. Save face image (use the high-quality OpenCV crop from Python)
    const preferredImage = isSample 
      ? (data.face_image || data.profile_image || image)
      : (data.profile_image || data.face_image || image);

    let imagePath = "";
    // Save ALL images to disk (both profile and samples) so Rebuild can reprocess them
    const faceSave = await saveEnrollImageToFace({ 
      imageDataUrl: preferredImage, 
      fullname, 
      enrollno,
      sampleId: isSample ? sampleId : null
    });
    imagePath = faceSave.ok ? faceSave.url : String(data?.saved || "");

    // 3. Upsert student (No longer storing samples array in DB)
    const updateDoc = {
      $set: {
        fullname: String(fullname).trim(),
        dept: String(dept || "").trim(),
        personKey,
        enrollno: String(enrollno).trim(),
      }
    };

    // If it's NOT a sample (initial enrollment), we set the profilePic
    if (!isSample) {
      updateDoc.$set.profilePic = imagePath;
    } else {
      updateDoc.$inc = { sampleCount: 1 };
    }

    const updated = await Student.findOneAndUpdate(
      { enrollno: String(enrollno).trim() },
      updateDoc,
      { new: true, upsert: true }
    );

    return NextResponse.json({
      ...data,
      ok: true,
      imagePath,
      profilePic: updated.profilePic,
      message: isTraining ? "Embedding added to CSV and database" : (imagePath ? "Enrolled sample stored successfully" : "Enrolled sample stored but image save failed"),
      student: {
        id: updated._id,
        fullname: updated.fullname,
        enrollno: updated.enrollno,
        personKey: updated.personKey,
      }
    });

  } catch (error) {
    console.error("Enroll API error:", error);
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}
