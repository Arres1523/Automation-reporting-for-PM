import { describe, it, expect } from 'vitest';
import { extendExpectedReportWindows } from '../../src/status/calendar-extension';

describe('extendExpectedReportWindows', () => {
  it('should be a function', () => {
    expect(typeof extendExpectedReportWindows).toBe('function');
  });

  it('should accept sheet parameters', () => {
    expect(extendExpectedReportWindows.length).toBe(2);
  });
});
