import { vi } from 'vitest';

import { resolveDefaultApiBase } from '../../../lib/api';

type LocationOptions = {
  protocol?: 'http:' | 'https:';
  port?: string;
};

const createLocationMock = (
  hostname: string,
  original: Location,
  { protocol = 'https:', port = '' }: LocationOptions = {}
): Location => {
  const host = port ? `${hostname}:${port}` : hostname;
  const origin = `${protocol}//${host}`;

  return {
    ancestorOrigins: original.ancestorOrigins,
    assign: vi.fn() as Location['assign'],
    reload: vi.fn() as Location['reload'],
    replace: vi.fn() as Location['replace'],
    hash: '',
    host,
    hostname,
    href: `${origin}/`,
    origin,
    pathname: '/',
    port,
    protocol,
    search: '',
    toString: () => `${origin}/`
  };
};

describe('resolveDefaultApiBase', () => {
  const originalPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalLocation = window.location;

  let locationGetterSpy: ReturnType<typeof vi.spyOn<typeof window, 'location'>> | null = null;

  const setWindowLocation = (hostname: string, options?: LocationOptions): void => {
    locationGetterSpy?.mockRestore();
    locationGetterSpy = vi
      .spyOn(window, 'location', 'get')
      .mockReturnValue(createLocationMock(hostname, originalLocation, options));
  };

  afterEach(() => {
    if (originalPublicApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalPublicApiUrl;
    }

    locationGetterSpy?.mockRestore();
    locationGetterSpy = null;
  });

  it('falls back to /api in the browser when no public API URL is set', () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    setWindowLocation('localhost', { protocol: 'http:' });

    expect(resolveDefaultApiBase()).toBe('/api');
  });

  it('uses the configured API URL when it is not a localhost address', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    setWindowLocation('app.example.com');

    expect(resolveDefaultApiBase()).toBe('https://api.example.com');
  });

  it('ignores localhost API URLs when the browser is not on a local host', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
    setWindowLocation('app.example.com');

    expect(resolveDefaultApiBase()).toBe('/api');
  });

  it('respects localhost API URLs when running on localhost', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
    setWindowLocation('localhost', { protocol: 'http:' });

    expect(resolveDefaultApiBase()).toBe('http://localhost:8000');
  });

  it('falls back to /api when the configured API URL points to the current origin root', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://app.example.com';
    setWindowLocation('app.example.com');

    expect(resolveDefaultApiBase()).toBe('/api');
  });

  it('returns only the pathname when the configured API URL matches the current origin', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://app.example.com/internal-api/';
    setWindowLocation('app.example.com');

    expect(resolveDefaultApiBase()).toBe('/internal-api');
  });
});
