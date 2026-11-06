import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { getTransactionImagesFromDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  noStore();
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ images: [], error: 'Missing transaction ID' }, { status: 400 });
    }

    const images = await getTransactionImagesFromDB(decodeURIComponent(id));

    return NextResponse.json(
      { id, images },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('[API GET /api/transactions/[id]/image Error]', error);
    return NextResponse.json({ images: [], error: String(error) }, { status: 500 });
  }
}

