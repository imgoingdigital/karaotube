import { NextResponse } from 'next/server';
import { lgVideoLibrary } from '@/lib/lg-video-library';
import fs from 'fs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('v');
  const title = searchParams.get('title') || 'Unknown';

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
  }

  try {
    // Check if video exists in library
    let videoPath = lgVideoLibrary.getVideoPath(videoId);
    
    // If not, download and encode it
    if (!videoPath) {
      console.log(`Video ${videoId} not in library, downloading...`);
      videoPath = await lgVideoLibrary.downloadAndEncode(videoId, title);
    } else {
      console.log(`Serving cached video: ${videoId}`);
    }

    // Record play
    lgVideoLibrary.recordPlay(videoId);

    // Stream the video file
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = request.headers.get('range');

    if (range) {
      // Handle range request for seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      
      return new Response(file as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize.toString(),
          'Content-Type': 'video/mp4',
        },
      });
    } else {
      // Send full file
      const file = fs.createReadStream(videoPath);
      
      return new Response(file as any, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000',
        },
      });
    }
  } catch (error: any) {
    console.error('LG video error:', error);
    return NextResponse.json(
      { error: 'Failed to process video', details: error.message },
      { status: 500 }
    );
  }
}
