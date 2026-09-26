import { NextResponse } from 'next/server';
import { getDocumentAnalysisStore } from '../../../../../lib/server-store';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const analysis = getDocumentAnalysisStore(params.id);
  if (!analysis) {
    return NextResponse.json({ detail: 'Analysis not found' }, { status: 404 });
  }
  return NextResponse.json(analysis);
}
