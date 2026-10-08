// @vitest-environment jsdom
import './setup.js';

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { ArkTextInput } from '../src/index.js';

describe('ArkTextInput — real Ark Field rendering (rendered)', () => {
  it('renders a native input wired by Field (data-part=root)', () => {
    render(<ArkTextInput name="title" />);
    const input = screen.getByRole('textbox');
    expect(input.tagName).toBe('INPUT');
    expect(input).toHaveAttribute('data-part', 'root');
    expect(input).toHaveAttribute('name', 'title');
    expect(input).toHaveAttribute('aria-label', 'title');
  });

  it('description -> Field auto aria-describedby pointing at the helper text', () => {
    render(<ArkTextInput name="title" description="Enter a title" />);
    const input = screen.getByRole('textbox');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const helper = document.getElementById(describedBy as string);
    expect(helper?.textContent).toBe('Enter a title');
  });

  it('error -> invalid state maps to aria-invalid', () => {
    render(<ArkTextInput error />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('disabled/readOnly project to native attributes', () => {
    const { rerender } = render(<ArkTextInput disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    rerender(<ArkTextInput readOnly />);
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  });

  it('placeholder and the seven contracted types are accepted', () => {
    const { rerender } = render(<ArkTextInput type="email" placeholder="p" />);
    let input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'p');
    for (const t of ['text', 'password', 'number', 'search', 'tel', 'url'] as const) {
      rerender(<ArkTextInput type={t} />);
      input = document.querySelector('input') as HTMLInputElement;
      expect(input).toHaveAttribute('type', t);
    }
  });
});

describe('ArkTextInput — interaction-verified', () => {
  it('user edits emit valueChange {value}', () => {
    const onValueChange = vi.fn();
    render(<ArkTextInput onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toEqual({ value: 'hello' });
  });

  it('controlled value is reflected and programmatic sets do not emit', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<ArkTextInput value="a" onValueChange={onValueChange} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('a');
    rerender(<ArkTextInput value="b" onValueChange={onValueChange} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('b');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('uncontrolled defaultValue seeds the input', () => {
    render(<ArkTextInput defaultValue="seed" />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('seed');
  });

  it('no valueChange while disabled or readOnly', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<ArkTextInput disabled onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'x' } });
    rerender(<ArkTextInput readOnly onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'y' } });
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe('ArkTextInput — honest cross-type role limitation (rendered, maps to unsupported conclusion)', () => {
  it('text is a textbox', () => {
    render(<ArkTextInput type="text" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('number is exposed as spinbutton, NOT textbox (the frozen role=textbox guarantee cannot hold)', () => {
    render(<ArkTextInput type="number" />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  it('search is searchbox, not textbox', () => {
    render(<ArkTextInput type="search" />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('password has no textbox/other ARIA role (implicit password input)', () => {
    render(<ArkTextInput type="password" />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.querySelector('input[type=password]')).toBeInTheDocument();
  });

  it('never fakes role=textbox via an explicit override on number/search/password', () => {
    for (const t of ['number', 'search', 'password'] as const) {
      const { unmount } = render(<ArkTextInput type={t} />);
      const input = document.querySelector('input') as HTMLInputElement;
      expect(input.getAttribute('role')).not.toBe('textbox');
      unmount();
    }
  });
});

describe('ArkTextInput — zero business binding', () => {
  it('has no capability/agent/binding/model hooks', () => {
    const { container } = render(<ArkTextInput name="t" />);
    expect(container.querySelector('[data-capability],[data-agent],[data-binding],[data-model]')).toBeNull();
  });
});
