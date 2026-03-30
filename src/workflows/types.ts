import type { z } from "zod";

import type {
  WorkflowBundle,
  WorkflowDefinitionSummary,
  WorkflowQuestionSection,
} from "../types.js";

export interface WorkflowDefinition<TInput> {
  summary: WorkflowDefinitionSummary;
  inputSchema: z.ZodType<TInput>;
  starterData: TInput;
  sections: WorkflowQuestionSection[];
  buildBundle: (input: TInput) => WorkflowBundle;
}
