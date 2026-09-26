import { NextResponse } from 'next/server';
import { getDocumentStore, deleteDocumentStore } from '../../../../lib/server-store';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const doc = getDocumentStore(params.id);
  if (!doc) {
    return NextResponse.json({ detail: 'Document not found' }, { status: 404 });
  }
  return NextResponse.json(doc);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  deleteDocumentStore(params.id);
  return NextResponse.json({ message: 'Document deleted successfully', id: params.id });
}
