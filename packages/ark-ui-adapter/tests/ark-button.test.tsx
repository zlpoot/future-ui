// @vitest-environment jsdom
import './setup.js';

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import '@testing-library/jest-dom/vitest';

import { ArkButton } from '../src/index.js';

describe('ArkButton — honest native composition (rendered)', () => {
  it('renders a real native <button>, explicitly labelled composition=native (NOT an Ark primitive)', () => {
    render(<ArkButton>Save</ArkButton>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toHaveAttribute('data-composition', 'native');
    expect(btn).toHaveAttribute('data-part', 'root');
  });

  it('defaults type="button" per the frozen contract (not native submit)', () => {
    render(<ArkButton>Save</ArkButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('passes submit/reset type through', () => {
    const { rerender } = render(<ArkButton type="submit">Go</ArkButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    rerender(<ArkButton type="reset">Go</ArkButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
  });
});

describe('ArkButton — interaction-verified', () => {
  it('fires onClick on activation', () => {
    const onClick = vi.fn();
    render(<ArkButton onClick={onClick}>Save</ArkButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled and renders the disabled attribute', () => {
    const onClick = vi.fn();
    render(<ArkButton disabled onClick={onClick}>Save</ArkButton>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading is host-pending only: native disabled + aria-busy, suppresses activation (no Ark loading feature)', () => {
    const onClick = vi.fn();
    render(<ArkButton loading onClick={onClick}>Saving</ArkButton>);
    const btn = screen.getByRole('button');
    // Frozen contract: loading IMPLIES native disabled, not only a guarded handler.
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('ArkButton — native form side-effects (Review 1 P1-B)', () => {
  it('an enabled submit button still submits its form (native activation works)', () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ArkButton type="submit">Save</ArkButton>
      </form>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('loading submit button does NOT submit the form (native disabled blocks activation)', () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ArkButton type="submit" loading>
          Saving
        </ArkButton>
      </form>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('disabled submit button does NOT submit the form', () => {
    const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <ArkButton type="submit" disabled>
          Save
        </ArkButton>
      </form>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('an enabled reset button resets the form (native activation works)', () => {
    const onReset = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onReset={onReset}>
        <ArkButton type="reset">Reset</ArkButton>
      </form>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('loading reset button does NOT reset the form (native disabled blocks activation)', () => {
    const onReset = vi.fn((e: FormEvent) => e.preventDefault());
    render(
      <form onReset={onReset}>
        <ArkButton type="reset" loading>
          Resetting
        </ArkButton>
      </form>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onReset).not.toHaveBeenCalled();
  });
});

describe('ArkButton — zero business binding', () => {
  it('has no capability/agent/binding/model hooks', () => {
    const { container } = render(<ArkButton>Save</ArkButton>);
    expect(container.querySelector('[data-capability],[data-agent],[data-binding],[data-model]')).toBeNull();
  });
});
