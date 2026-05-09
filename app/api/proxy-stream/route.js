import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return new Response('Missing URL', { status: 400 });
  }

  try {
    const response = await fetch(url);
    
    // Create a new response with the same body but added CORS headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // We want to keep the content-type (e.g. multipart/x-mixed-replace)
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  } catch (error) {
    console.error('Proxy Error:', error);
    return new Response('Proxy Error', { status: 500 });
  }
}
