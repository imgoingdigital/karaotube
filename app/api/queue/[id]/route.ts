import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue-manager';

// DELETE /api/queue/[id] - Remove specific song
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  queueManager.removeSong(id);
  return NextResponse.json({ success: true });
}
