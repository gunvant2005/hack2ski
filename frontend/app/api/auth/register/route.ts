import { NextResponse } from 'next/server';
import { registerUserStore } from '../../../../lib/server-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ detail: 'Name is required' }, { status: 422 });
    }
    if (!email || !email.includes('@')) {
      return NextResponse.json({ detail: 'Valid email address is required' }, { status: 422 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ detail: 'Password must be at least 8 characters' }, { status: 422 });
    }

    const result = registerUserStore(name, email, password);
    return NextResponse.json(result, { status: 201 });
  } catch (err: any) {
    const msg = err.message || 'Failed to create account.';
    const status = msg.includes('already exists') ? 409 : 400;
    return NextResponse.json({ detail: msg }, { status });
  }
}
