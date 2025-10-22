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

const redactUrl = (value: URL): string => {
  const sanitized = new URL(value.toString());
  sanitized.username = '';
  sanitized.password = '';
  sanitized.search = '';
  sanitized.hash = '';
  return sanitized.toString().replace(/\/$/, '');
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
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers,
    redirect: 'manual'
  };

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
  segments: string[],
  backend: URL | null
): Promise<Response> => {
  const path = segments.join('/');

  if (request.method === 'GET' && path === 'dashboard/summary') {
    const detail = backend
      ? `Fell back to demo metrics because the FastAPI backend at ${redactUrl(
          backend
        )} did not respond.`
      : 'Fell back to demo metrics because no FastAPI backend URL is configured.';

    return NextResponse.json(
      { ...fallbackDashboardSummary, detail },
      {
        status: 200,
        headers: fallbackHeaders('fallback-dashboard-summary')
      }
    );
  }

  if (request.method === 'POST' && path === 'imports/spreadsheet') {
    try {
      await request.formData();
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to parse import form payload during fallback', error);
      }
    }

    const detail = backend
      ? `Unable to reach the FastAPI backend at ${redactUrl(
          backend
        )}. Confirm the service is running, that \`CORS_ORIGINS\` allows this dashboard, and that server-to-server traffic is permitted.`
      : 'Unable to reach the FastAPI backend. Set NEXT_PUBLIC_API_URL or API_PROXY_TARGET to your API base URL (e.g. https://zoris.onrender.com) so imports can be forwarded.';

    const payload: Record<string, unknown> = {
      detail,
      exampleSummary: createMockImportSummary()
    };

    if (backend) {
      payload.attemptedBase = redactUrl(backend);
    }

    return NextResponse.json(payload, {
      status: 503,
      headers: fallbackHeaders('fallback-imports-spreadsheet')
    });
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: fallbackHeaders('fallback-options') });
  }

  const detail = backend
    ? `Upstream API at ${redactUrl(backend)} is unavailable. Start the FastAPI server or update API_PROXY_TARGET.`
    : 'Upstream API is unavailable because no backend URL is configured. Set NEXT_PUBLIC_API_URL or API_PROXY_TARGET to your FastAPI base URL.';

  return NextResponse.json(
    {
      message: detail,
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

  return handleFallback(request, segments, backend);
};

export { handler as DELETE };
export { handler as GET };
export { handler as HEAD };
export { handler as OPTIONS };
export { handler as PATCH };
export { handler as POST };
export { handler as PUT };
