import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getDB } from '@/lib/db';
import { parseLegacyData, generateAuditSummary, commitMigration } from '@/lib/importer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const action = (formData.get('action') as string) || 'preview';
    const actor = (formData.get('actor') as string) || 'Super Admin';

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    // Safety checks on file size (maximum 150 MB for massive SQLite/CSV dumps)
    const MAX_SIZE = 150 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: `File exceeds maximum allowed upload size (${Math.round(MAX_SIZE / 1024 / 1024)}MB)` },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Ingestion Parser
    let parsedData;
    try {
      parsedData = parseLegacyData(buffer, file.name);
    } catch (parseErr) {
      return NextResponse.json(
        {
          success: false,
          error: `Parsing failed: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        },
        { status: 422 }
      );
    }

    // 2. Action: Dry-Run Inspection Preview
    if (action === 'preview') {
      const summary = generateAuditSummary(parsedData, file.name, buffer.length);
      return NextResponse.json({
        success: true,
        action: 'preview',
        summary,
      });
    }

    // 3. Action: Absorb & Integrate (Atomic Transaction + Safety Snapshot)
    if (action === 'commit') {
      const db = getDB();
      const commitResult = await commitMigration(db, parsedData, actor);

      if (!commitResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: commitResult.error || 'Failed to commit migration transaction',
            snapshotName: commitResult.snapshotName,
          },
          { status: 500 }
        );
      }

      revalidatePath('/', 'layout');
      return NextResponse.json({
        success: true,
        action: 'commit',
        result: commitResult,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action "${action}"` }, { status: 400 });
  } catch (error) {
    console.error('[API /api/migrate Error]', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
