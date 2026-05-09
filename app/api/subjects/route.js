// API: GET /api/subjects
// Returns all active subjects
import { NextResponse } from 'next/server';
import connectDB from '@/db/connectdb';
import Subject from '@/models/subjects';

export async function GET() {
  try {
    await connectDB();
    const subjects = await Subject.find({ isActive: true }).sort({ name: 1 }).lean();
    return NextResponse.json({ subjects });
  } catch (error) {
    console.error("Subjects API error:", error);
    return NextResponse.json({ subjects: [], error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, code, type, faculty, dept } = body;

    if (!name || !code || !type) {
      return NextResponse.json({ ok: false, message: "Name, code, and type are required" }, { status: 400 });
    }

    const newSubject = await Subject.create({
      name,
      code,
      type,
      faculty: faculty || "",
      dept: dept || "General", // Using a default if dept isn't provided
    });

    return NextResponse.json({ ok: true, subject: newSubject, message: "Subject added successfully" });
  } catch (error) {
    console.error("Subject POST error:", error);
    // Handle duplicate code error
    if (error.code === 11000) {
      return NextResponse.json({ ok: false, message: "Subject code already exists" }, { status: 400 });
    }
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ ok: false, message: "ID is required" }, { status: 400 });

    await Subject.findByIdAndDelete(id);
    return NextResponse.json({ ok: true, message: "Subject deleted" });
  } catch (error) {
    console.error("Subject DELETE error:", error);
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
}
