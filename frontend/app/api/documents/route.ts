import { NextResponse } from 'next/server';
import { verifyToken, listDocumentsStore } from '../../../lib/server-store';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization') || '';
  const userId = verifyToken(authHeader);
  const docs = listDocumentsStore(userId);
  return NextResponse.json(docs);
}
