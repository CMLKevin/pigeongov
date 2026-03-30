// Import all form plugins to trigger auto-registration with the default orchestrator.
export { core1040Plugin } from "./core-1040.js";
export { scheduleBPlugin } from "./schedule-b.js";
export { form8949Plugin } from "./form-8949.js";
export { scheduleDPlugin } from "./schedule-d.js";

// Re-export result types for consumers.
export type { ScheduleBResult } from "./schedule-b.js";
export type { Form8949Result, Form8949Transaction } from "./form-8949.js";
export type { ScheduleDResult } from "./schedule-d.js";
