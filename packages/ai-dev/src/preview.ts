import { validateComponent } from '@future-ui/contracts';
import type { ComponentContract, ComponentProp } from '@future-ui/contracts';
import { createDomButton, createDomSelect } from '@future-ui/conformance';
import { buttonContract, selectContract } from '@future-ui/react-provider';
import type { DevDiagnostic } from './errors.js';

/**
 * ui.preview — controlled development fixture rendering (M0-08 §2.1).
 *
 * Starts ONLY a controlled dev fixture/render target: jsdom + the conformance
 * dom-provider (framework-agnostic, no React/Ark), host whitelist 'dom'. No
 * server, no browser live session, no network, no real website loading. Never
 * becomes a production runtime capability; the renderer rejects anything that
 * is not a contract-declared prop (no arbitrary JS / template strings / remote
 * URLs).
 */

export type PreviewComponentId = 'button' | 'select';

export type PreviewHost = 'dom';

export interface PreviewInput {
  componentId: PreviewComponentId;
  /** Controlled component props — only contract-declared fields (D04/D05). */
  props?: Record<string, unknown>;
  /** First version supports only the DOM host (conformance second implementation). */
  host?: PreviewHost;
}

export interface RenderNode {
  /** Locatable path, e.g. '/button[0]' or '/select[0]/option[1]'. */
  path: string;
  /** data-part value when the element exposes one (part of the public contract). */
  part?: string;
  tag: string;
  attrs: Record<string, string>;
  text?: string;
}

export interface RenderTarget {
  rootPath: string;
  nodes: RenderNode[];
}

export interface PreviewOutput {
  renderTarget: RenderTarget;
  /** M0 Diagnostic-shaped diagnostics; contract-validation diagnostics plus dev codes. */
  diagnostics: DevDiagnostic[];
  componentId: string;
  host: 'dom';
}

/** Frozen representative components only (M0-08 §2.1: 'button' | 'select'). */
export const PREVIEW_CONTRACTS: Record<PreviewComponentId, ComponentContract> = {
  button: buttonContract,
  select: selectContract,
};

function devDiag(
  code: DevDiagnostic['code'],
  path: string,
  expected: unknown,
  actual: unknown,
  explanation: string,
  repairHint?: string,
): DevDiagnostic {
  return { code, path, expected, actual, explanation, repairHint };
}

function typeMatches(type: ComponentProp['type'], value: unknown): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'null':
      return value === null;
    default:
      return false;
  }
}

function isOption(value: unknown): value is { label: string; value: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { label?: unknown }).label !== undefined &&
    typeof (value as { label: unknown }).label === 'string' &&
    (value as { value?: unknown }).value !== undefined &&
    typeof (value as { value: unknown }).value === 'string'
  );
}

/**
 * Restricts props to contract-declared fields with matching types — the
 * renderer never accepts arbitrary code, template strings or remote URLs
 * (M0-08 §2.1 limits).
 */
export function validatePreviewProps(contract: ComponentContract, props: Record<string, unknown>): DevDiagnostic[] {
  const out: DevDiagnostic[] = [];
  for (const [key, value] of Object.entries(props)) {
    const prop = contract.props[key];
    if (prop === undefined) {
      out.push(
        devDiag(
          'preview_invalid_props',
          `/props/${key}`,
          'a declared contract prop',
          `unknown prop '${key}'`,
          'props are restricted to contract-declared fields; arbitrary code/template/URL inputs are rejected',
          `use only declared props: ${Object.keys(contract.props).join(', ')}`,
        ),
      );
      continue;
    }
    if (!typeMatches(prop.type, value)) {
      out.push(
        devDiag(
          'preview_invalid_props',
          `/props/${key}`,
          `type '${prop.type}'`,
          typeof value,
          'prop value does not match the contract-declared type',
          `pass a ${prop.type} value for '${key}'`,
        ),
      );
      continue;
    }
    if (prop.type === 'array' && key === 'options') {
      const options = value as unknown[];
      if (!options.every(isOption)) {
        out.push(
          devDiag(
            'preview_invalid_props',
            `/props/options`,
            'array of { label: string; value: string }',
            'malformed option entry',
            'select options must be declarative { label, value } pairs',
            'provide options as [{ label: string; value: string }, ...]',
          ),
        );
      }
    }
  }
  return out;
}

function collectNodes(element: Element, rootPath: string): RenderNode[] {
  const nodes: RenderNode[] = [];
  const walk = (node: Element, path: string): void => {
    const attrs: Record<string, string> = {};
    for (const name of node.getAttributeNames()) {
      attrs[name] = node.getAttribute(name) ?? '';
    }
    const text = node.textContent;
    const part = node.getAttribute('data-part') ?? undefined;
    const entry: RenderNode = { path, tag: node.tagName.toLowerCase(), attrs };
    if (part !== undefined) entry.part = part;
    if (text !== undefined && text !== '') entry.text = text;
    nodes.push(entry);
    for (let i = 0; i < node.children.length; i += 1) {
      walk(node.children[i], `${path}/${node.children[i].tagName.toLowerCase()}[${i}]`);
    }
  };
  walk(element, rootPath);
  return nodes;
}

/** Event capture sink used by ui.test; preview() renders without observers. */
export interface PreviewEventSink {
  click?: (event: { appId: string }) => void;
  valueChange?: (event: { value: string | null; appId: string }) => void;
}

/** Renders the controlled fixture with the DOM provider; caller owns cleanup. */
export function renderPreview(
  componentId: PreviewComponentId,
  props: Record<string, unknown>,
  sink?: PreviewEventSink,
): HTMLElement {
  if (componentId === 'button') {
    const el = createDomButton({
      appId: 'preview',
      onClick: sink?.click === undefined ? undefined : (e) => sink.click?.({ appId: e.appId }),
    });
    const disabled = props['disabled'];
    const loading = props['loading'];
    if (typeof disabled === 'boolean' && disabled) el.disabled = true;
    if (typeof loading === 'boolean' && loading) {
      el.disabled = true;
      el.setAttribute('aria-busy', 'true');
    }
    const type = props['type'];
    if (typeof type === 'string') el.type = type as 'button' | 'submit' | 'reset';
    return el;
  }
  const el = createDomSelect({
    appId: 'preview',
    options: (props['options'] as { label: string; value: string }[] | undefined) ?? [],
    onValueChange: sink?.valueChange === undefined ? undefined : (e) => sink.valueChange?.({ value: e.value, appId: e.appId }),
  });
  const defaultValue = props['defaultValue'];
  if (typeof defaultValue === 'string') el.value = defaultValue;
  const placeholder = props['placeholder'];
  if (typeof placeholder === 'string' && placeholder !== '') {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = placeholder;
    el.insertBefore(empty, el.firstChild);
  }
  const disabled = props['disabled'];
  if (typeof disabled === 'boolean' && disabled) el.disabled = true;
  return el;
}

/** ui.preview — deterministic controlled fixture render (M0-08 §2.1). */
export function preview(input: PreviewInput): PreviewOutput {
  const componentId = input.componentId;
  const host = input.host ?? 'dom';

  if (host !== 'dom') {
    return {
      renderTarget: { rootPath: '', nodes: [] },
      diagnostics: [
        devDiag(
          'preview_unsupported_host',
          '/host',
          "'dom'",
          host,
          'only the frozen DOM host is supported in this version',
          "use host: 'dom'",
        ),
      ],
      componentId,
      host: 'dom',
    };
  }

  const contract = PREVIEW_CONTRACTS[componentId];
  if (contract === undefined) {
    return {
      renderTarget: { rootPath: '', nodes: [] },
      diagnostics: [
        devDiag(
          'preview_unsupported_component',
          '/componentId',
          "'button' | 'select'",
          componentId,
          'componentId is not in the frozen preview component set',
          'use a frozen representative component (button, select)',
        ),
      ],
      componentId,
      host,
    };
  }

  const contractDiagnostics = validateComponent(contract).diagnostics as DevDiagnostic[];
  const props = input.props ?? {};
  const propDiagnostics = validatePreviewProps(contract, props);
  const allDiagnostics = [...contractDiagnostics, ...propDiagnostics];
  const invalid = propDiagnostics.length > 0 || contractDiagnostics.length > 0;

  if (invalid) {
    return {
      renderTarget: { rootPath: '', nodes: [] },
      diagnostics: allDiagnostics,
      componentId,
      host,
    };
  }

  const element = renderPreview(componentId, props);
  const rootPath = `/${componentId}[0]`;
  const nodes = collectNodes(element, rootPath);
  element.remove();

  return {
    renderTarget: { rootPath, nodes },
    diagnostics: allDiagnostics,
    componentId,
    host,
  };
}
