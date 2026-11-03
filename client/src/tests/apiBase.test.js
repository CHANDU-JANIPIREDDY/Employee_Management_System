import { describe, expect, it } from 'vitest';
import { resolveApiBase } from '../services/api';

describe('resolveApiBase', () => {
  it('keeps a base that already ends with /api', () => {
    expect(resolveApiBase('https://employee-management-system-nbn5.onrender.com/api')).toBe(
      'https://employee-management-system-nbn5.onrender.com/api',
    );
  });

  it('adds /api when the host is given without it', () => {
    expect(resolveApiBase('https://employee-management-system-nbn5.onrender.com')).toBe(
      'https://employee-management-system-nbn5.onrender.com/api',
    );
  });

  it('drops a health suffix so login is not posted under /api/health', () => {
    expect(resolveApiBase('https://employee-management-system-nbn5.onrender.com/api/health')).toBe(
      'https://employee-management-system-nbn5.onrender.com/api',
    );
  });
});
