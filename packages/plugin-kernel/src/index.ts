export { createPluginKernel } from './kernel.js';
export type { KernelOptions, PluginKernel, RequestScope } from './kernel.js';
export { PluginRegistry } from './registry.js';
export type { RegistryOptions } from './registry.js';
export { checkCompatibility, checkManifest, satisfies } from './compat.js';
export type { CompatibilityContext } from './compat.js';
export * from './types.js';
export { nodeNotFoundDiagnostic, releaseAll } from './lifecycle.js';
