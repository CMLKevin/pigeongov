import type { WorkflowQuestionField, WorkflowQuestionSection } from "../../types.js";
import type { PromptClient } from "./common.js";
import { parseCurrency, validateSsn } from "./common.js";

function setPath(target: Record<string, unknown>, key: string, value: unknown): void {
  const parts = key.split(".");
  let cursor: Record<string, unknown> = target;

  for (const part of parts.slice(0, -1)) {
    const current = cursor[part];
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      cursor[part] = {};
    }
    cursor = cursor[part] as Record<string, unknown>;
  }

  const last = parts.at(-1);
  if (last) {
    cursor[last] = value;
  }
}

function getPath(target: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((accumulator, part) => {
    if (typeof accumulator !== "object" || accumulator === null) {
      return undefined;
    }
    return (accumulator as Record<string, unknown>)[part];
  }, target);
}

async function askField(
  prompts: PromptClient,
  field: WorkflowQuestionField,
  draft: Record<string, unknown>,
): Promise<void> {
  const existing = getPath(draft, field.key);
  const defaultValue =
    typeof existing === "string" || typeof existing === "number" ? String(existing) : undefined;

  switch (field.type) {
    case "confirm": {
      const value = await prompts.confirm(field.label, {
        default: typeof existing === "boolean" ? existing : false,
      });
      setPath(draft, field.key, value);
      return;
    }
    case "select": {
      const value = await prompts.select(
        field.label,
        (field.options ?? []).map((option) => ({
          name: option.label,
          value: option.value,
        })),
      );
      setPath(draft, field.key, value);
      return;
    }
    case "currency": {
      const value = await prompts.input(field.label, defaultValue ? { default: defaultValue } : {});
      setPath(draft, field.key, parseCurrency(value));
      return;
    }
    case "number": {
      const value = await prompts.input(field.label, defaultValue ? { default: defaultValue } : {});
      setPath(draft, field.key, Number(value || 0));
      return;
    }
    default: {
      const value = await prompts.input(field.label, {
        ...(defaultValue ? { default: defaultValue } : {}),
        ...((field.key.endsWith(".ssn") || field.key === "taxpayer.ssn")
          ? { validate: validateSsn }
          : {}),
      });
      setPath(draft, field.key, value);
    }
  }
}

export async function collectWorkflowData(
  prompts: PromptClient,
  sections: WorkflowQuestionSection[],
  starterData: unknown,
): Promise<Record<string, unknown>> {
  const draft = structuredClone(starterData) as Record<string, unknown>;

  for (const section of sections) {
    for (const field of section.fields) {
      await askField(prompts, field, draft);
    }
  }

  return draft;
}
