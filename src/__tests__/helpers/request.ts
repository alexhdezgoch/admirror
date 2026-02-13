import { NextRequest } from 'next/server';

export function createMockRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function createRawBodyRequest(rawBody: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/stripe/webhook', {
    method: 'POST',
    headers,
    body: rawBody,
  });
}
