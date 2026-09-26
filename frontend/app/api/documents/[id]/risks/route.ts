import { NextResponse } from 'next/server';
import { getDocumentAnalysisStore } from '../../../../../lib/server-store';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const analysis = getDocumentAnalysisStore(params.id);
  return NextResponse.json({ risk_level: analysis.risk_level, risks: analysis.risks || [] });
}
