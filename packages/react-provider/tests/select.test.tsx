// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { Select } from '../src/select.js';
import { selectContract, validateSelectContract } from '../src/select-contract.js';
import { FutureUIProvider } from '../src/provider.js';

const options = [
  { label: 'React', value: 'react' },
  { label: 'Solid', value: 'solid' },
  { label: 'Vue', value: 'vue' },
];

describe('select contract', () => {
  it('declares a contract that is valid against the frozen Component schema (positive)', () => {
    expect(validateSelectContract()).toEqual([]);
  });

  it('explicitly rejects unsupported extensions (negative: no silent degradation)', () => {
    expect(selectContract.componentType).toBe('future-ui.select');
    expect(selectContract.features.disabled).toBe(true);
    expect(selectContract.features.searchable).toBe(false);
    expect(selectContract.features.multi).toBe(false);
    expect(selectContract.state.ownership).toBe('uncontrolled');
  });
});

describe('Select', () => {
  it('renders a select with options from the collection (positive)', () => {
    render(<Select options={options} />);
    const sel = screen.getByRole('combobox');
    expect(sel).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('option', { name: 'Vue' })).toHaveAttribute('value', 'vue');
  });

  it('renders a placeholder as an empty-value option when provided (positive)', () => {
    render(<Select options={options} placeholder="Pick a framework" />);
    const placeholder = screen.getByRole('option', { name: 'Pick a framework' });
    expect(placeholder).toHaveAttribute('value', '');
  });

  it('selects the defaultValue initially (positive)', () => {
    render(<Select options={options} defaultValue="solid" />);
    expect(screen.getByRole('combobox')).toHaveValue('solid');
  });

  it('fires valueChange with the app scope on selection (positive)', () => {
    const onValueChange = vi.fn();
    render(
      <FutureUIProvider appId="frameworks">
        <Select options={options} onValueChange={onValueChange} />
      </FutureUIProvider>,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'vue' } });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0].value).toBe('vue');
    expect(onValueChange.mock.calls[0][0].appId).toBe('frameworks');
  });

  it('reports null when the placeholder empty-value option is chosen (positive)', () => {
    const onValueChange = vi.fn();
    render(<Select options={options} placeholder="Pick a framework" onValueChange={onValueChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange.mock.calls[0][0].value).toBeNull();
  });

  it('does not fire valueChange while disabled (negative)', () => {
    const onValueChange = vi.fn();
    render(<Select options={options} disabled onValueChange={onValueChange} />);
    const sel = screen.getByRole('combobox');
    expect(sel).toBeDisabled();
    fireEvent.change(sel, { target: { value: 'vue' } });
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
