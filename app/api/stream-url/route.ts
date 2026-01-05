import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);
const YT_DLP_PATH = path.join(process.cwd(), 'app', 'bin', 'yt-dlp.exe');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('v');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
  }

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    console.log(`Getting stream URL for: ${videoId}`);
    
    // Get direct video URL without downloading using yt-dlp
    const { stdout } = await execFileAsync(YT_DLP_PATH, [
      '--dump-json',
      '--no-warnings',
      '--format', 'best[ext=mp4]/best',
      url
    ]);

    const info = JSON.parse(stdout);
    
    // yt-dlp returns video info including direct URL
    const streamUrl = info.url || info.formats?.[0]?.url;
    
    if (!streamUrl) {
      throw new Error('Could not extract stream URL');
    }

    console.log(`Stream URL found for ${videoId}`);
    
    return NextResponse.json({
      videoId,
      title: info.title,
      streamUrl,
      duration: info.duration,
      thumbnail: info.thumbnail
    });

  } catch (error: any) {
    console.error('Stream URL extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to get stream URL', details: error.message },
      { status: 500 }
    );
  }
}
