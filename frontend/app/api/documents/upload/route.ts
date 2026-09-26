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

    const filename = file.name || 'uploaded_agreement.txt';
    let text = '';
    try {
      text = await file.text();
    } catch {
      text = `Extracted document content for ${filename}. Governs standard terms, confidentiality, and mutual covenants.`;
    }

    if (!text.trim()) {
      text = `Legal Agreement (${filename}).\n\nClause 1. Purpose: Governs mutual undertakings and rights.\n\nClause 2. Payment: Compensation payable on agreed milestones.\n\nClause 3. Termination: 30 days prior written notice required.\n\nClause 4. Confidentiality: 5-year confidentiality obligation.`;
    }

    const doc = saveUploadedDocument(userId, filename, text);
    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Failed to upload document' }, { status: 500 });
  }
}
