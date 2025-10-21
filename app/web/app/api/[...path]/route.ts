import { NextRequest, NextResponse } from 'next/server';

import { fallbackDashboardSummary } from '../../dashboard-summary-data';
import { createMockImportSummary } from '../../imports/import-summary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const fallbackHeaders = (label: string): Headers => {
  const headers = new Headers();
  headers.set('cache-control', 'no-store');
  headers.set('x-api-proxy', label);
  return headers;
};

const absoluteUrl = (value: string | undefined | null): URL | null => {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url;
    }
    return null;
  } catch (error) {
    return null;
  }
};

const resolveBackendBase = (): URL | null => {
  const candidates = [
    process.env.API_INTERNAL_URL,
    process.env.API_PROXY_TARGET,
    process.env.NEXT_PUBLIC_API_URL
  ];

  for (const candidate of candidates) {
    const resolved = absoluteUrl(candidate ?? null);
    if (resolved) {
      return resolved;
    }
  }

  return null;
};

type RouteContext = {
  params?: {
    path?: string[];
  };
};

const buildTargetUrl = (base: URL, segments: string[], request: NextRequest): URL => {
  const target = new URL(base.toString());
  const path = segments.join('/');
  target.pathname = [target.pathname.replace(/\/$/, ''), path].filter(Boolean).join('/');
  target.search = request.nextUrl.search;
  return target;
};

const proxyToBackend = async (
  request: NextRequest,
  segments: string[],
  backend: URL
): Promise<Response | null> => {
  const target = buildTargetUrl(backend, segments, request);
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers: new Headers(request.headers),
    redirect: 'manual'
  };

  init.headers.delete('host');
  init.headers.delete('connection');
  init.headers.delete('content-length');

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
    init.duplex = 'half';
  }

  try {
    const response = await fetch(target, init);
    const headers = new Headers(response.headers);
    headers.set('x-api-proxy', 'upstream');
    headers.set('cache-control', headers.get('cache-control') ?? 'no-store');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to reach upstream API', target.toString(), error);
    }
    return null;
  }
};

const handleFallback = async (
  request: NextRequest,
  segments: string[]
): Promise<Response> => {
  const path = segments.join('/');

  if (request.method === 'GET' && path === 'dashboard/summary') {
    return NextResponse.json(fallbackDashboardSummary, {
      status: 200,
      headers: fallbackHeaders('fallback-dashboard-summary')
    });
  }

  if (request.method === 'POST' && path === 'imports/spreadsheet') {
    try {
      await request.formData();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to parse import form payload during fallback', error);
      }
    }

    return NextResponse.json(createMockImportSummary(), {
      status: 200,
      headers: fallbackHeaders('fallback-imports-spreadsheet')
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: fallbackHeaders('fallback-options') });
  }

  return NextResponse.json(
    {
      message: 'Upstream API is unavailable. Start the FastAPI server to access live data.',
      path
    },
    {
      status: 503,
      headers: fallbackHeaders('fallback-unavailable')
    }
  );
};

const handler = async (request: NextRequest, context: RouteContext): Promise<Response> => {
  const segments = Array.isArray(context.params?.path) ? context.params?.path ?? [] : [];
  const backend = resolveBackendBase();

  if (backend) {
    const response = await proxyToBackend(request, segments, backend);
    if (response) {
      return response;
    }
  }

  return handleFallback(request, segments);
};

export { handler as DELETE };
export { handler as GET };
export { handler as HEAD };
export { handler as OPTIONS };
export { handler as PATCH };
export { handler as POST };
export { handler as PUT };
