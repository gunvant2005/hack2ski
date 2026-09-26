import { NextResponse } from 'next/server';
import { getDocumentContentStore } from '../../../../../lib/server-store';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const content = getDocumentContentStore(params.id);
  if (!content) {
    return NextResponse.json({ detail: 'Document content not found' }, { status: 404 });
  }
  return NextResponse.json(content);
}
