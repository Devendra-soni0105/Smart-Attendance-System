import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Student from '@/models/Student';

export async function GET() {
  try {
    await connectDB();
    const students = await Student.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { fullname, enrollno, dept, embedding, imagePath, sampleId } = body;

    if (!fullname || !enrollno) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let student = await Student.findOne({ enrollno });

    if (student) {
      // Just update details if student exists
      student.fullname = fullname;
      student.dept = dept || student.dept;
      if (imagePath) student.profilePic = imagePath;
      await student.save();
      return NextResponse.json({ success: true, message: "Updated existing student details", student });
    } else {
      // Create new student
      student = await Student.create({
        fullname,
        enrollno,
        dept: dept || "",
        personKey: `${fullname.replace(/\s+/g, "_").toLowerCase()}_${enrollno.toLowerCase()}`,
        profilePic: imagePath || "",
      });
      return NextResponse.json({ success: true, message: "Student enrolled successfully", student });
    }

  } catch (error) {
    console.error("Error creating student:", error);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
