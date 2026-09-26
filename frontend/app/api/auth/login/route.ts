import { NextResponse } from 'next/server';
import { loginUserStore } from '../../../../lib/server-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ detail: 'Email and password are required' }, { status: 422 });
    }

    const result = loginUserStore(email, password);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || 'Incorrect email or password.' },
      { status: 401 }
    );
  }
}
