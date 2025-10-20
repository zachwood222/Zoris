const normaliseBaseUrl = (value: string): string => value.replace(/\/$/, '');

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

const resolveDefaultApiBase = (): string => {
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
    return publicBase;
  }

  return '/api';
};

export const apiBase = resolveDefaultApiBase();

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
