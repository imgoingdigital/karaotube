import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue-manager';

// POST /api/playback - Control playback
export async function POST(request: NextRequest) {
  try {
    const { action, index, fromIndex, toIndex } = await request.json();

    let result;
    switch (action) {
      case 'next':
        result = queueManager.playNext();
        break;
      case 'previous':
        result = queueManager.playPrevious();
        break;
      case 'play':
        queueManager.setPlayingState(true);
        result = queueManager.getCurrentSong();
        break;
      case 'pause':
        queueManager.setPlayingState(false);
        result = queueManager.getCurrentSong();
        break;
      case 'play_at':
        if (typeof index === 'number') {
          result = queueManager.playSongAt(index);
        }
        break;
      case 'complete':
        result = queueManager.removeCurrentAndMoveNext();
        break;
      case 'skip':
        // Skip is same as complete - remove current and move to next
        result = queueManager.removeCurrentAndMoveNext();
        break;
      case 'reorder':
        if (typeof fromIndex === 'number' && typeof toIndex === 'number') {
          const success = queueManager.reorderQueue(fromIndex, toIndex);
          return NextResponse.json({ success });
        }
        return NextResponse.json({ error: 'fromIndex and toIndex required' }, { status: 400 });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, song: result });
  } catch (error) {
    console.error('Playback error:', error);
    return NextResponse.json(
      { error: 'Playback action failed' },
      { status: 500 }
    );
  }
}
