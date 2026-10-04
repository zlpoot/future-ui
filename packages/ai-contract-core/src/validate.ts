import { validateBinding, validateCapability, validateComponent, validatePlugin } from '@future-ui/contracts';
import type { ValidationContext, ValidationResult } from '@future-ui/contracts';

/**
 * Deterministic validate/diagnostics for the AI Contract Core. Directly
 * consumes the M0-02 contract validators and the frozen M0 error codes and
 * diagnostic structure (D14 rule 3): no second error system, no second schema.
 */

export type ContractKind = 'component' | 'capability' | 'binding' | 'plugin';

/** Validate an instance document against the authoritative contract for `kind`. */
export function validateContract(kind: ContractKind, data: unknown, context?: ValidationContext): ValidationResult {
  switch (kind) {
    case 'component':
      return validateComponent(data);
    case 'capability':
      return validateCapability(data);
    case 'binding':
      return validateBinding(data, context);
    case 'plugin':
      return validatePlugin(data);
    default:
      throw new Error(`unknown contract kind: ${String(kind)}`);
  }
}
