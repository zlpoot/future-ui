// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { FutureUIProvider, useFutureUIContext } from '../src/provider.js';

function Probe({ label }: { label: string }) {
  const { appId } = useFutureUIContext();
  return <span data-testid={label}>{appId}</span>;
}

describe('FutureUIProvider', () => {
  it('provides a default app scope without an explicit provider (positive)', () => {
    render(<Probe label="no-provider" />);
    expect(screen.getByTestId('no-provider')).toHaveTextContent('default');
  });

  it('overrides the app scope id inside a provider (positive)', () => {
    render(
      <FutureUIProvider appId="checkout">
        <Probe label="inside" />
      </FutureUIProvider>,
    );
    expect(screen.getByTestId('inside')).toHaveTextContent('checkout');
  });

  it('does not leak scope to a sibling rendered outside the provider (negative)', () => {
    render(
      <>
        <FutureUIProvider appId="checkout">
          <Probe label="inside" />
        </FutureUIProvider>
        <Probe label="outside" />
      </>,
    );
    expect(screen.getByTestId('inside')).toHaveTextContent('checkout');
    expect(screen.getByTestId('outside')).toHaveTextContent('default');
  });
});
