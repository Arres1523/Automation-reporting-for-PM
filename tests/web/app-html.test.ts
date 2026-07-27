import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

class FakeClassList {
  private classes = new Set<string>();

  constructor(initial: string[] = []) {
    initial.forEach(className => this.classes.add(className));
  }

  add(className: string): void {
    this.classes.add(className);
  }

  remove(className: string): void {
    this.classes.delete(className);
  }

  contains(className: string): boolean {
    return this.classes.has(className);
  }

  toggle(className: string, force?: boolean): void {
    if (force === true) this.classes.add(className);
    else if (force === false) this.classes.delete(className);
    else if (this.classes.has(className)) this.classes.delete(className);
    else this.classes.add(className);
  }
}

interface FakeElement {
  id: string;
  classList: FakeClassList;
  dataset: Record<string, string>;
  disabled: boolean;
  textContent: string;
  innerHTML: string;
  value: string;
  getAttribute(name: string): string | null;
  addEventListener(_event: string, _handler: () => void): void;
  querySelectorAll(_selector: string): FakeElement[];
}

function createFakeElement(id: string, classes: string[] = []): FakeElement {
  return {
    id,
    classList: new FakeClassList(classes),
    dataset: {},
    disabled: false,
    textContent: '',
    innerHTML: '',
    value: '',
    getAttribute: () => null,
    addEventListener: () => undefined,
    querySelectorAll: () => [],
  };
}

function getScript(): string {
  const html = readFileSync('src/web/app.html', 'utf8');
  const match = html.match(/<script>([\s\S]*)<\/script>/);

  expect(match).not.toBeNull();
  return match![1];
}

describe('app.html script', () => {
  it('parses without syntax errors so inline handlers can run', () => {
    expect(() => new Function(getScript())).not.toThrow();
  });

  it('shows the dashboard immediately when Google login starts', () => {
    const elements = new Map<string, FakeElement>();
    for (const id of [
      'login-button',
      'login-view',
      'app-view',
      'current-user',
      'portfolio-grid',
      'property-list',
      'property-title',
      'property-financials',
      'property-timeline',
      'report-health',
      'exception-list',
      'control-timeline',
      'status-filter',
      'current-role',
      'capability-list',
      'sync-button',
      'toast',
    ]) {
      elements.set(id, createFakeElement(id, id === 'app-view' ? ['hidden'] : []));
    }

    const fakeDocument = {
      getElementById: (id: string) => elements.get(id) || null,
      querySelectorAll: () => [],
    };
    const fakeWindow = {
      clearTimeout: () => undefined,
      setTimeout: () => 1,
    };
    const app = new Function(
      'document',
      'window',
      'google',
      `${getScript()}; return { loginWithGoogle };`
    )(fakeDocument, fakeWindow, undefined) as { loginWithGoogle: () => void };

    app.loginWithGoogle();

    expect(elements.get('login-view')!.classList.contains('hidden')).toBe(true);
    expect(elements.get('app-view')!.classList.contains('hidden')).toBe(false);
    expect(elements.get('current-user')!.textContent).toBe('Connecting to Google');
    expect(elements.get('portfolio-grid')!.innerHTML).toContain('Oasis');
    expect(elements.get('portfolio-grid')!.innerHTML).toContain('August');
    expect(elements.get('portfolio-grid')!.innerHTML).toContain('La Jolla');
    expect(elements.get('portfolio-grid')!.innerHTML).toContain('Dalecrest');
  });
});
