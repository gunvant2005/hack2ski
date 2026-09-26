import { NextResponse } from 'next/server';
import { chatDocumentStore } from '../../../lib/server-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const documentId = body.document_id || body.documentId || '';
    const message = body.message || body.question || body.query || '';

    if (!documentId) {
      return NextResponse.json({ detail: 'document_id is required' }, { status: 422 });
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ detail: 'message cannot be empty' }, { status: 422 });
    }

    const result = chatDocumentStore(documentId, message);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Chat error' }, { status: 500 });
  }
}
