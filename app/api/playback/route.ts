import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue-manager';

// POST /api/playback - Control playback
export async function POST(request: NextRequest) {
  try {
    const { action, index } = await request.json();

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
