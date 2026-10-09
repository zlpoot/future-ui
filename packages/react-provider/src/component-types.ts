/**
 * Browser-safe component type constants (pure, zero imports).
 *
 * R1-RC-001 (#86) first-failure fix: the adapter mapping tables imported these
 * constants from the react-provider INDEX, whose re-exports transitively pull
 * @future-ui/contracts (validateComponent → node:fs AJV schema reads at module
 * load) — which vite externalizes, so ANY browser graph touching the mapping
 * tables crashed. The constants themselves are pure strings; this module is
 * their single source of truth, reachable via the "./component-types" export.
 *
 * The *-contract modules and the package index keep re-exporting the same
 * constants (public surface unchanged); only the browser-facing consumers
 * (adapter "/browser" barrels) import from here.
 */
export const BUTTON_COMPONENT_TYPE = 'future-ui.button';
export const DIALOG_COMPONENT_TYPE = 'future-ui.dialog';
export const TEXT_INPUT_COMPONENT_TYPE = 'future-ui.text-input';
