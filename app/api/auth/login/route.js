import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

const FACULTY_USERNAME = process.env.FACULTY_USERNAME || 'faculty';
const FACULTY_PASSWORD = process.env.FACULTY_PASSWORD || 'faculty123';
const SESSION_SECRET = process.env.SESSION_SECRET || 'secret';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (username === FACULTY_USERNAME && password === FACULTY_PASSWORD) {
      const token = jwt.sign(
        { username, role: 'faculty' },
        SESSION_SECRET,
        { expiresIn: '24h' }
      );

      const cookie = serialize('session_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return NextResponse.json(
        { success: true },
        {
          status: 200,
          headers: { 'Set-Cookie': cookie },
        }
      );
    }

    return NextResponse.json(
      { error: 'Invalid username or password' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
