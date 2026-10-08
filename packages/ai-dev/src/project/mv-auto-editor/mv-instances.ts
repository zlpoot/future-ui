import {
  identityRefFor,
  InstanceRegistry,
  type InstanceRegistration,
} from '@future-ui/ai-contract-core';
import type { ProjectAIView } from '@future-ui/ai-contract-core';
import type { MvProjectContext } from './mv-project.js';

/**
 * R1-04 (#70) Phase A — explicit instance registration for the REAL
 * MV-Auto-Editor asset edit & approval scenario.
 *
 * Instances are registered EXPLICITLY by the dev host (never scanned from
 * JSX/DOM/source). Each real asset card (人物/场景/道具) is one instance of the
 * asset editor panel in canvas.html. No capabilityBindings → zero business
 * tools are generated (R1-PRJ-CAPABILITY).
 */
export interface MvAssetInstanceOptions {
  instanceId?: string;
  scopeId?: string;
  blocking?: boolean;
  pending?: boolean;
  /** projected state keys that are safe to expose. */
  allowedState?: string[];
  sensitive?: string[];
}

export interface MvAssetCardRef {
  cardId: string;
  cardName: string;
  /** real card type in MV: character | scene | prop */
  type: 'character' | 'scene' | 'prop';
}

/** The four real asset cards of project song-20260928043747 (Phase A sample). */
export const REAL_MV_ASSET_CARDS: MvAssetCardRef[] = [
  { cardId: 'character-f8cb8312', cardName: '我', type: 'character' },
  { cardId: 'character-1b3a85e7', cardName: '你', type: 'character' },
  { cardId: 'scene-0dc1aac4', cardName: '傍晚沿江步道', type: 'scene' },
  { cardId: 'prop-167d9989', cardName: '有线耳机', type: 'prop' },
];

/**
 * Register one real asset card editor instance against the MV Project AI View.
 * Draft form values and prompt textareas are NOT on the allowlist.
 */
export function registerMvAssetEditInstance(
  ctx: MvProjectContext,
  card: MvAssetCardRef,
  options: MvAssetInstanceOptions = {},
): InstanceRegistration {
  const def = ctx.view.definitions.find((d) => d.componentType === 'future-ui.dialog');
  if (def === undefined) throw new Error('future-ui.dialog definition missing from MV project view');

  const registration: InstanceRegistration = {
    instanceId: options.instanceId ?? `assets/cards/${card.cardId}/edit`,
    componentType: 'future-ui.dialog',
    scopeId: options.scopeId ?? 'canvas/asset-edit',
    identityRef: identityRefFor(def.identity),
    metadata: {
      path: `canvas.html #inspector #detail · ${card.cardName} (${card.type} asset card editor)`,
      blocking: options.blocking,
      declared: { pending: options.pending ?? true },
    },
    // Draft prompt/field values are hidden by default; only the safe state
    // keys (open / selectedVersionId / lockedVersionId / status) are allowed.
    visibleState: {
      allow: options.allowedState ?? ['open', 'selectedVersionId', 'lockedVersionId', 'status'],
      sensitive: options.sensitive ?? [],
    },
    capabilityBindings: [],
  };

  const result = ctx.registry.register(registration);
  if (result.diagnostics.length > 0) {
    throw new Error(
      `register MV asset instance failed: ${result.diagnostics.map((d) => `${d.code}@${d.path}`).join(', ')}`,
    );
  }
  return registration;
}

/** Register all four real cards of project song-20260928043747. */
export function registerRealMvAssetInstances(ctx: MvProjectContext): InstanceRegistration[] {
  return REAL_MV_ASSET_CARDS.map((card) => registerMvAssetEditInstance(ctx, card));
}

export type { ProjectAIView, InstanceRegistry };
