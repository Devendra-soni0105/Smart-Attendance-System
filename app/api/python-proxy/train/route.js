import { NextResponse } from 'next/server';

const PY_API = process.env.PY_API || "http://127.0.0.1:5007";

export async function POST() {
  try {
    const pyRes = await fetch(`${PY_API}/train`, {
      method: "POST",
    });

    const data = await pyRes.json();
    if (!pyRes.ok || !data.ok) {
      return NextResponse.json(data, { status: pyRes.status || 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Train proxy error:", error);
    return NextResponse.json({ ok: false, message: "Failed to connect to Python AI for training" }, { status: 500 });
  }
}
