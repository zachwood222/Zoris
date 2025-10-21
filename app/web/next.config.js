const normaliseBaseUrl = (value) => value.replace(/\/$/, '');

const PROXY_PROBE_PATHS = ['/health', '/'];

const joinUrl = (base, path) => {
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return new URL(path, prefix);
};

const canReachProxyTarget = async (target) => {
  let lastError;
  for (const probePath of PROXY_PROBE_PATHS) {
    try {
      const url = joinUrl(target, probePath);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 700);
      try {
        await fetch(url, { method: 'HEAD', signal: controller.signal });
        return true;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn('next.config.js could not reach API proxy target', target, lastError);
  }

  return false;
};

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

const isLocalHostname = (hostname) => {
  if (!hostname) {
    return false;
  }

  const value = hostname.trim().toLowerCase();
  if (LOCAL_HOSTNAMES.has(value)) {
    return true;
  }

  if (value.endsWith('.local')) {
    return true;
  }

  return false;
};

const coerceUrl = (value) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('next.config.js could not parse URL value', value, error);
    }
    return null;
  }
};

const shouldEnableProxyRewrite = () => {
  const rawPublicBase = process.env.NEXT_PUBLIC_API_URL;
  if (!rawPublicBase || rawPublicBase.trim().length === 0) {
    return true;
  }

  const trimmed = rawPublicBase.trim();
  if (trimmed.startsWith('/')) {
    return true;
  }

  let publicUrl;
  try {
    publicUrl = new URL(trimmed);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('next.config.js could not resolve NEXT_PUBLIC_API_URL', trimmed, error);
    }
    return true;
  }

  if (isLocalHostname(publicUrl.hostname)) {
    return true;
  }

  const deploymentOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_APP_BASE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_URL,
    process.env.SITE_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null
  ];

  for (const origin of deploymentOrigins) {
    const resolved = coerceUrl(origin);
    if (resolved && resolved.origin === publicUrl.origin) {
      return true;
    }
  }

  return false;
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    if (!shouldEnableProxyRewrite()) {
      return [];
    }

    const target = normaliseBaseUrl(process.env.API_PROXY_TARGET ?? 'http://localhost:8000');

    if (!(await canReachProxyTarget(target))) {
      return [];
    }

    return [
      {
        source: '/api/:path*',
        destination: `${target}/:path*`
      }
    ];
  }
};

module.exports = nextConfig;
