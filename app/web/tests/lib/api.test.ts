import { vi } from 'vitest';

import { resolveDefaultApiBase } from '../../lib/api';

const createLocationMock = (hostname: string, original: Location): Location => ({
  ancestorOrigins: original.ancestorOrigins,
  assign: vi.fn() as Location['assign'],
  reload: vi.fn() as Location['reload'],
  replace: vi.fn() as Location['replace'],
  hash: '',
  host: hostname,
  hostname,
  href: '',
  origin: '',
  pathname: '',
  port: '',
  protocol: '',
  search: '',
  toString: () => ''
});

describe('resolveDefaultApiBase', () => {
  const originalPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalLocation = window.location;

  let locationGetterSpy: ReturnType<typeof vi.spyOn<typeof window, 'location'>> | null = null;

  const setWindowHostname = (hostname: string): void => {
    locationGetterSpy?.mockRestore();
    locationGetterSpy = vi
      .spyOn(window, 'location', 'get')
      .mockReturnValue(createLocationMock(hostname, originalLocation));
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
    setWindowHostname('localhost');

    expect(resolveDefaultApiBase()).toBe('/api');
  });

  it('uses the configured API URL when it is not a localhost address', () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    setWindowHostname('app.example.com');

    expect(resolveDefaultApiBase()).toBe('https://api.example.com');
  });

  it('ignores localhost API URLs when the browser is not on a local host', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
    setWindowHostname('app.example.com');

    expect(resolveDefaultApiBase()).toBe('/api');
  });

  it('respects localhost API URLs when running on localhost', () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000';
    setWindowHostname('localhost');

    expect(resolveDefaultApiBase()).toBe('http://localhost:8000');
  });
});
