import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../lib/api')>('../lib/api');
  return {
    ...actual,
    buildAuthHeaders: vi.fn(async (additional?: Record<string, string>) => ({
      ...actual.mockAuthHeaders,
      ...(additional ?? {})
    }))
  };
});

process.env.NEXT_PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
