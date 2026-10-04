// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  FutureUIProvider,
  TextInput,
  textInputContract,
  validateTextInputContract,
} from '@future-ui/react-provider';

const appId = 'text-input-app';

describe('TextInput contract (#17)', () => {
  it('contract is structurally valid against the frozen Component schema', () => {
    expect(validateTextInputContract()).toEqual([]);
    expect(textInputContract.componentType).toBe('future-ui.text-input');
    expect(textInputContract.state.ownership).toBe('hybrid');
  });

  it('renders a native textbox with a single value authority (controlled)', () => {
    render(
      <FutureUIProvider appId={appId}>
        <TextInput value="hello" />
      </FutureUIProvider>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('hello');
  });

  it('controlled value is the single source of truth: programmatic re-render updates it and fires no valueChange', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <FutureUIProvider appId={appId}>
        <TextInput value="v1" onValueChange={onValueChange} />
      </FutureUIProvider>,
    );
    rerender(
      <FutureUIProvider appId={appId}>
        <TextInput value="v2" onValueChange={onValueChange} />
      </FutureUIProvider>,
    );
    expect(screen.getByRole('textbox')).toHaveValue('v2');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('user edit in controlled mode reports valueChange but never mutates the controlled value itself', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <FutureUIProvider appId={appId}>
        <TextInput value="a" onValueChange={onValueChange} />
      </FutureUIProvider>,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ab' } });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0]).toMatchObject({ value: 'ab', appId });
    // The adapter never re-writes the controlled value: it still renders "a".
    expect(screen.getByRole('textbox')).toHaveValue('a');
    rerender(
      <FutureUIProvider appId={appId}>
        <TextInput value="ab" onValueChange={onValueChange} />
      </FutureUIProvider>,
    );
    expect(screen.getByRole('textbox')).toHaveValue('ab');
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it('uncontrolled mode initializes once from defaultValue and tracks user edits', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <FutureUIProvider appId={appId}>
        <TextInput defaultValue="init" onValueChange={onValueChange} />
      </FutureUIProvider>,
    );
    expect(screen.getByRole('textbox')).toHaveValue('init');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'next' } });
    expect(screen.getByRole('textbox')).toHaveValue('next');
    expect(onValueChange).toHaveBeenCalledTimes(1);
    // defaultValue is not re-applied on re-render (no dual authority).
    rerender(
      <FutureUIProvider appId={appId}>
        <TextInput defaultValue="changed" onValueChange={onValueChange} />
      </FutureUIProvider>,
    );
    expect(screen.getByRole('textbox')).toHaveValue('next');
  });

  it('disabled blocks edits and valueChange', () => {
    const onValueChange = vi.fn();
    render(
      <FutureUIProvider appId={appId}>
        <TextInput defaultValue="x" disabled onValueChange={onValueChange} />
      </FutureUIProvider>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    fireEvent.change(input, { target: { value: 'y' } });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('readOnly blocks edits but keeps focusability and DOM semantics', () => {
    const onValueChange = vi.fn();
    render(
      <FutureUIProvider appId={appId}>
        <TextInput defaultValue="x" readOnly onValueChange={onValueChange} />
      </FutureUIProvider>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readonly');
    expect(input).not.toBeDisabled();
    input.focus();
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'y' } });
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('error maps to aria-invalid and name maps to the native attribute', () => {
    render(
      <FutureUIProvider appId={appId}>
        <TextInput error name="email" />
      </FutureUIProvider>,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('name', 'email');
  });

  it('description is wired via aria-describedby to a rendered description part', () => {
    render(
      <FutureUIProvider appId={appId}>
        <TextInput description="Enter your email address" />
      </FutureUIProvider>,
    );
    const input = screen.getByRole('textbox');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const descriptionEl = document.getElementById(describedBy as string);
    expect(descriptionEl).toBeTruthy();
    expect(descriptionEl?.textContent).toBe('Enter your email address');
  });

  it('aria-label is honored when provided (accessible name source)', () => {
    render(
      <FutureUIProvider appId={appId}>
        <TextInput aria-label="Search" />
      </FutureUIProvider>,
    );
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
  });

  it('type prop maps to the native input type', () => {
    render(
      <FutureUIProvider appId={appId}>
        <TextInput type="email" />
      </FutureUIProvider>,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email');
  });

  it('is a pure UI consumer: no capability effect, no business validation, no agent visibility leaks', () => {
    const { container } = render(
      <FutureUIProvider appId={appId}>
        <TextInput defaultValue="x" />
      </FutureUIProvider>,
    );
    // No data-* capability wiring, no effect nodes, no agent-visible metadata.
    expect(container.querySelector('[data-capability]')).toBeNull();
    expect(container.querySelector('[data-agent-visible]')).toBeNull();
    expect(textInputContract.events.valueChange.description).not.toMatch(/business|effect/i);
  });
});
