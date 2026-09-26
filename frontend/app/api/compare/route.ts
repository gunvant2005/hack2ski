import { NextResponse } from 'next/server';
import { compareDocsStore } from '../../../lib/server-store';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const docA = formData.get('doc_a') as File | null;
    const docB = formData.get('doc_b') as File | null;

    let textA = '';
    let textB = '';
    let nameA = 'Document Version A';
    let nameB = 'Document Version B';

    if (docA) {
      nameA = docA.name || 'Document Version A';
      try {
        textA = await docA.text();
      } catch {
        textA = 'Sample terms for Document A.';
      }
    }
    if (docB) {
      nameB = docB.name || 'Document Version B';
      try {
        textB = await docB.text();
      } catch {
        textB = 'Sample terms for Document B.';
      }
    }

    const result = compareDocsStore(nameA, textA, nameB, textB);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || 'Comparison failed' }, { status: 500 });
  }
}
