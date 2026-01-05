import { NextResponse } from 'next/server';
import { lgVideoLibrary } from '@/lib/lg-video-library';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const videoId = searchParams.get('v');

  try {
    switch (action) {
      case 'stats':
        return NextResponse.json(lgVideoLibrary.getStats());

      case 'list':
        return NextResponse.json({ videos: lgVideoLibrary.getAllVideos() });

      case 'info':
        if (!videoId) {
          return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
        }
        const info = lgVideoLibrary.getVideoInfo(videoId);
        return NextResponse.json({ video: info });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Library API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    const body = await request.json();
    const { videoId } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
    }

    switch (action) {
      case 'save':
        const success = lgVideoLibrary.moveToSaved(videoId);
        return NextResponse.json({ success, videoId });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Library API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
