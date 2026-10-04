// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { Button } from '../src/button.js';
import { buttonContract, validateButtonContract } from '../src/button-contract.js';
import { FutureUIProvider } from '../src/provider.js';

describe('button contract', () => {
  it('declares a contract that is valid against the frozen Component schema (positive)', () => {
    expect(validateButtonContract()).toEqual([]);
  });

  it('declares only the supported features as true (negative: no silent degradation)', () => {
    expect(buttonContract.componentType).toBe('future-ui.button');
    expect(buttonContract.features.disabled).toBe(true);
    expect(buttonContract.features.loading).toBe(true);
    expect((buttonContract.features as Record<string, boolean>).searchable ?? false).toBe(false);
    expect(buttonContract.state.ownership).toBe('uncontrolled');
  });
});

describe('Button', () => {
  it('renders a native button with accessible name from its text (positive)', () => {
    render(<Button>Save</Button>);
    const btn = screen.getByRole('button', { name: 'Save' });
    expect(btn).toBeInTheDocument();
  });

  it('accepts an explicit accessible name via aria-label (positive)', () => {
    render(
      <Button aria-label="Close dialog">×</Button>,
    );
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
  });

  it('disables activation when disabled (negative: click is not fired)', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('loading implies disabled and exposes aria-busy (positive)', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('fires click with the app scope context on pointer activation (positive)', () => {
    const onClick = vi.fn();
    render(
      <FutureUIProvider appId="billing">
        <Button onClick={onClick}>Save</Button>
      </FutureUIProvider>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.calls[0][0].appId).toBe('billing');
    expect(onClick.mock.calls[0][0].originalEvent).toBeDefined();
  });

  it('supports keyboard activation via Enter (positive keyboard path)', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard activation via Space (positive keyboard path)', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire click while disabled even on keyboard activation (negative)', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Enter' });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('does not activate on unrelated keys (negative)', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const btn = screen.getByRole('button');
    fireEvent.keyDown(btn, { key: 'Tab' });
    expect(onClick).not.toHaveBeenCalled();
  });
});
