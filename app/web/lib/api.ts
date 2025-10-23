const normaliseBaseUrl = (value: string): string => value.replace(/\/$/, '');

const ensureLeadingSlash = (value: string): string => (value.startsWith('/') ? value : `/${value}`);

const resolveSameOriginBase = (value: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const resolved = new URL(value, window.location.origin);

    if (resolved.origin !== window.location.origin) {
      return null;
    }

    const normalisedPath = resolved.pathname.replace(/\/$/, '');
    if (!normalisedPath || normalisedPath === '/') {
      return '/api';
    }

    return ensureLeadingSlash(normalisedPath);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('resolveDefaultApiBase could not resolve public API URL', value, error);
    }
    return '/api';
  }
};

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]']);

const isLocalHostname = (hostname: string | null | undefined): boolean => {
  if (!hostname) {
    return false;
  }

  const value = hostname.trim().toLowerCase();
  if (LOCAL_HOSTNAMES.has(value)) {
    return true;
  }

  // Treat *.local domains as development hosts as well.
  if (value.endsWith('.local')) {
    return true;
  }

  return false;
};

const isLocalUrl = (value: string): boolean => {
  try {
    const { hostname } = new URL(value);
    return isLocalHostname(hostname);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('resolveDefaultApiBase received invalid URL', value, error);
    }
    return false;
  }
};

const browserIsOnLocalhost = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return isLocalHostname(window.location.hostname);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('resolveDefaultApiBase could not inspect window.location', error);
    }
    return false;
  }
};

const coerceBaseUrl = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  return normaliseBaseUrl(trimmed);
};

export const resolveDefaultApiBase = (): string => {
  const publicBase = coerceBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? null);

  if (typeof window === 'undefined') {
    const internalBase = coerceBaseUrl(process.env.API_INTERNAL_URL ?? null);
    if (internalBase) {
      return internalBase;
    }

    if (publicBase) {
      return publicBase;
    }

    return 'http://localhost:8000';
  }

  if (publicBase) {
    const sameOriginBase = resolveSameOriginBase(publicBase);
    if (sameOriginBase) {
      return sameOriginBase;
    }

    if (isLocalUrl(publicBase) && !browserIsOnLocalhost()) {
      return '/api';
    }

    return publicBase;
  }

  return '/api';
};

let serverSideApiBase: string | null = null;
let clientSideApiBase: string | null = null;

export const getApiBase = (): string => {
  if (typeof window === 'undefined') {
    if (serverSideApiBase === null) {
      serverSideApiBase = resolveDefaultApiBase();
    }
    return serverSideApiBase;
  }

  if (clientSideApiBase === null) {
    clientSideApiBase = resolveDefaultApiBase();
  }

  return clientSideApiBase;
};

export const mockAuthHeaders: Record<string, string> = {
  'X-User-Id': 'demo',
  'X-User-Roles': 'Purchasing'
};

type AuthTokenResolver = () => string | null | Promise<string | null>;

let resolveAuthToken: AuthTokenResolver = () => null;

export function registerAuthTokenResolver(resolver: AuthTokenResolver): void {
  resolveAuthToken = resolver;
}

export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await resolveAuthToken();
    if (typeof token === 'string' && token.trim().length > 0) {
      return token;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to resolve auth token', error);
    }
  }

  if (typeof window !== 'undefined') {
    const globalToken = (window as unknown as { __zorisAuthToken?: unknown }).__zorisAuthToken;
    if (typeof globalToken === 'string' && globalToken.trim().length > 0) {
      return globalToken;
    }
  }

  return null;
}

export function setAuthToken(token: string | null): void {
  resolveAuthToken = () => token ?? null;
}

export async function buildAuthHeaders(
  additional?: Record<string, string>
): Promise<Record<string, string>> {
  const token = await getAuthToken();

  const baseHeaders = token
    ? { Authorization: `Bearer ${token}` }
    : { ...mockAuthHeaders };

  return { ...baseHeaders, ...(additional ?? {}) };
}
