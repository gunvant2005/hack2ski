import { NextResponse } from 'next/server';
import { verifyToken, saveUploadedDocument } from '../../../../lib/server-store';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const userId = verifyToken(authHeader);

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ detail: 'No file provided' }, { status: 400 });
    }

    const filename = file.name || 'uploaded_agreement.docx';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const doc = saveUploadedDocument(userId, filename, buffer);
    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to upload document' }, { status: 500 });
  }
}
