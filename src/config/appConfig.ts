/**
 * Centralized application configuration.
 * Single source of truth for product name, version and authorship metadata.
 * Never hardcode the version string anywhere else in the codebase.
 */
export const APP_CONFIG = {
  name: "Bako's Master System",
  version: "v1.5",
  author: "Bako Bayan Madhhar",
  contact: "07705488654",
  copyrightYear: 2026,
} as const;

/** Version without the leading "v" (e.g. "1.5"). */
export const APP_VERSION_NUMBER: string = APP_CONFIG.version.replace(/^v/i, "");
