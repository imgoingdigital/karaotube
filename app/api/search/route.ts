import { NextRequest, NextResponse } from 'next/server';
import { YouTubeSearchResult } from '@/types';
import { configManager } from '@/lib/config-manager';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    // Get API key from config (rotates automatically)
    const apiKey = configManager.getYouTubeApiKey();
    
    const searchQuery = `${query} karaoke`;
    // Add videoEmbeddable=true to filter out videos that can't be embedded
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoEmbeddable=true&maxResults=10&key=${apiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('YouTube API error:', response.status, errorData);
      
      // If quota exceeded, the key rotation will use the next key on next request
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();

    const results: YouTubeSearchResult[] = data.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium.url,
      duration: '0:00', // Would need additional API call to get duration
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search YouTube' },
      { status: 500 }
    );
  }
}
