import { NextResponse } from 'next/server';
import { verifyToken, getUserById } from '../../../../lib/server-store';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const userId = verifyToken(authHeader);
  const user = getUserById(userId);

  if (!user) {
    return NextResponse.json({ detail: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(user);
}
