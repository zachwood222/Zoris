import { resolveDefaultApiBase } from '../../lib/api';

describe('resolveDefaultApiBase', () => {
  const originalPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    if (originalPublicApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalPublicApiUrl;
    }
  });

  it('falls back to /api in the browser when no public API URL is set', () => {
    delete process.env.NEXT_PUBLIC_API_URL;

    expect(resolveDefaultApiBase()).toBe('/api');
  });
});
