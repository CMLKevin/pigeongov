import { f1040Meta, f1040Schema } from "./f1040.js";
import { f1099IntMeta, f1099IntSchema } from "./f1099-int.js";
import { f1099NecMeta, f1099NecSchema } from "./f1099-nec.js";
import { form8949Meta, form8949Schema } from "./form-8949.js";
import { schedule1Meta, schedule1Schema } from "./schedule-1.js";
import { scheduleBMeta, scheduleBSchema } from "./schedule-b.js";
import { scheduleCMeta, scheduleCSchema } from "./schedule-c.js";
import { scheduleDMeta, scheduleDSchema } from "./schedule-d.js";
import { w2Meta, w2Schema } from "./w2.js";

export { f1040Meta, f1040Schema } from "./f1040.js";
export { f1099IntMeta, f1099IntSchema } from "./f1099-int.js";
export { f1099NecMeta, f1099NecSchema } from "./f1099-nec.js";
export { form8949Meta, form8949Schema } from "./form-8949.js";
export { schedule1Meta, schedule1Schema } from "./schedule-1.js";
export { scheduleBMeta, scheduleBSchema } from "./schedule-b.js";
export { scheduleCMeta, scheduleCSchema } from "./schedule-c.js";
export { scheduleDMeta, scheduleDSchema, type ScheduleDSchema } from "./schedule-d.js";
export { w2Meta, w2Schema } from "./w2.js";

export const schemaRegistry = {
  "1040": {
    meta: f1040Meta,
    schema: f1040Schema,
  },
  "schedule-1": {
    meta: schedule1Meta,
    schema: schedule1Schema,
  },
  "schedule-b": {
    meta: scheduleBMeta,
    schema: scheduleBSchema,
  },
  "schedule-c": {
    meta: scheduleCMeta,
    schema: scheduleCSchema,
  },
  "schedule-d": {
    meta: scheduleDMeta,
    schema: scheduleDSchema,
  },
  "form-8949": {
    meta: form8949Meta,
    schema: form8949Schema,
  },
  w2: {
    meta: w2Meta,
    schema: w2Schema,
  },
  "1099-nec": {
    meta: f1099NecMeta,
    schema: f1099NecSchema,
  },
  "1099-int": {
    meta: f1099IntMeta,
    schema: f1099IntSchema,
  },
} as const;

export type SupportedSchemaId = keyof typeof schemaRegistry;

export function getSchemaDefinition(schemaId: SupportedSchemaId) {
  return schemaRegistry[schemaId];
}
