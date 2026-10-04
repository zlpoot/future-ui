import { createContext, useContext, type ReactNode } from 'react';
import type { JSX } from 'react';

export interface FutureUIProviderOptions {
  /**
   * Application identifier used for request/app scope isolation (D07 M0).
   * Components read the scope from the enclosing provider.
   */
  appId?: string;
}

export interface FutureUIProviderContextValue {
  appId: string;
}

const FutureUIContext = createContext<FutureUIProviderContextValue | null>(null);

/**
 * Minimal React framework adapter root. Only provides scope context; it does
 * not own capability/protocol/model concerns (M1-01A: UI-only consumer).
 */
export function FutureUIProvider({
  appId = 'default',
  children,
}: FutureUIProviderOptions & { children: ReactNode }): JSX.Element {
  return <FutureUIContext.Provider value={{ appId }}>{children}</FutureUIContext.Provider>;
}

/** Reads the enclosing app scope; falls back to a default when no provider exists. */
export function useFutureUIContext(): FutureUIProviderContextValue {
  const ctx = useContext(FutureUIContext);
  return ctx ?? { appId: 'default' };
}
