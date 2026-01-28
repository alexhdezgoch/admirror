import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('url');

    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    // Decode the URL
    let decodedUrl: string;
    try {
      decodedUrl = decodeURIComponent(videoUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL encoding' },
        { status: 400 }
      );
    }

    // Validate URL is from Facebook CDN or Supabase Storage
    const url = new URL(decodedUrl);
    const validHosts = ['fbcdn.net', 'facebook.com', 'fb.com'];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      const supabaseHost = new URL(supabaseUrl).hostname;
      validHosts.push(supabaseHost);
    }
    const isValidHost = validHosts.some(host =>
      url.hostname.endsWith(host) || url.hostname.includes(host)
    );

    if (!isValidHost) {
      return NextResponse.json(
        { error: 'Only Facebook CDN and Supabase Storage URLs are allowed' },
        { status: 403 }
      );
    }

    // Fetch the video from Facebook CDN
    const response = await fetch(decodedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'video/*,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.facebook.com/',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch video: ${response.status}` },
        { status: response.status }
      );
    }

    // Get content type and length from the response
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = response.headers.get('content-length');

    // Validate that the response is actually a video
    const isVideo = contentType.startsWith('video/') ||
                    contentType === 'application/octet-stream';
    if (!isVideo) {
      console.error(`Video proxy received non-video content-type: ${contentType}`);
      return NextResponse.json(
        { error: `Not a video file (${contentType})` },
        { status: 415 }
      );
    }

    // Stream the response back with proper headers
    const headers: HeadersInit = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
      'Cache-Control': 'public, max-age=3600',
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }

    // Handle range requests for video seeking
    const rangeHeader = request.headers.get('range');
    if (rangeHeader && response.headers.get('accept-ranges')) {
      headers['Accept-Ranges'] = 'bytes';
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        headers['Content-Range'] = contentRange;
      }
    }

    return new NextResponse(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error('Video proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Range',
    },
  });
}
