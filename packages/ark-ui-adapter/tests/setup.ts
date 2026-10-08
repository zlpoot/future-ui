// jsdom polyfills required by the Ark/zag primitives under test.
// Imported explicitly by the jsdom-environment test files in this package.

if (typeof window !== 'undefined') {
  if (!('ResizeObserver' in globalThis)) {
    class ResizeObserverStub {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    (globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }).ResizeObserver =
      ResizeObserverStub;
  }
  if (!('IntersectionObserver' in globalThis)) {
    class IntersectionObserverStub {
      root = null;
      rootMargin = '';
      thresholds = [];
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
      takeRecords() {
        return [];
      }
    }
    (
      globalThis as unknown as { IntersectionObserver: typeof IntersectionObserverStub }
    ).IntersectionObserver = IntersectionObserverStub;
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
    Element.prototype.setPointerCapture = () => {};
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  }

  // jsdom has NO layout engine: offsetWidth/Height are 0 and getClientRects()
  // returns an empty list for every element. zag's focus/dismissable layer
  // gates focusability and outside-click on isElementVisible(), which consults
  // exactly those three values. Without this shim zag would (correctly, for a
  // real browser) conclude every control is invisible, fall back to focusing
  // the content container, and never register the dismissable layer — a test
  // artifact, not an adapter behaviour. We therefore report connected
  // elements as laid out. We do NOT touch focusability rules, ARIA, key
  // handling or zag internals, so the code paths under test remain the real
  // zag machine. A real browser needs no shim (documented in the Phase C doc).
  const elementProto = window.Element.prototype as unknown as {
    getClientRects: () => DOMRectList;
  };
  elementProto.getClientRects = function patchedGetClientRects(this: Element): DOMRectList {
    if (this.isConnected) return [{ x: 0, y: 0, top: 0, left: 0, right: 1, bottom: 1, width: 1, height: 1, toJSON: () => ({}) }] as unknown as DOMRectList;
    return { length: 0 } as unknown as DOMRectList;
  };
  try {
    Object.defineProperty(window.HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 1 });
    Object.defineProperty(window.HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => 1 });
  } catch {
    // jsdom may make these non-configurable in some versions; getClientRects
    // alone already satisfies zag's isElementVisible() OR-chain.
  }
}
