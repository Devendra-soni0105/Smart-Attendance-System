import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    const { fullname, enrollno } = body;

    if (!fullname && !enrollno) {
      return NextResponse.json({ ok: false, message: "Must provide at least enrollno or fullname" }, { status: 400 });
    }

    const safeName = (str) => (str || "").toString().trim().toLowerCase().replace(/[^a-z0-9-_ ]/g, "").replace(/\s+/g, "_");
    
    const enrolledDir = path.join(process.cwd(), 'public', 'Students_enrolled');
    
    let files = [];
    try {
      files = await fs.readdir(enrolledDir);
    } catch (err) {
      console.warn("Could not read Students_enrolled directory:", err);
      return NextResponse.json({ ok: false, message: "Directory not found or inaccessible" }, { status: 404 });
    }

    let toDelete = [];
    
    if (fullname && enrollno) {
        const filePrefix = `${safeName(fullname)}_${safeName(enrollno)}`;
        toDelete = files.filter(f => f.startsWith(filePrefix));
    } else if (enrollno) {
        const safeEnroll = safeName(enrollno);
        // Matching _enrollno_ pattern since files are saved like fullname_enrollno_0.jpg
        toDelete = files.filter(f => f.includes(`_${safeEnroll}_`) || f.startsWith(`${safeEnroll}_`));
    } else if (fullname) {
        const safeFullname = safeName(fullname);
        toDelete = files.filter(f => f.startsWith(`${safeFullname}_`));
    }

    let deletedCount = 0;
    for (const file of toDelete) {
      try {
        await fs.unlink(path.join(enrolledDir, file));
        deletedCount++;
      } catch (err) {
        console.warn(`Failed to delete file ${file}:`, err);
      }
    }
    
    console.log(`Deleted ${deletedCount} image files for student ${fullname || ''} ${enrollno || ''}`);
    return NextResponse.json({ 
      ok: true, 
      message: `Deleted ${deletedCount} images successfully`, 
      count: deletedCount 
    });

  } catch (error) {
    console.error("Delete images API error:", error);
    return NextResponse.json({ ok: false, message: "Internal Server Error" }, { status: 500 });
  }
}
