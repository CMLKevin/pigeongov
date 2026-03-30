import { listWorkflows, workflowDomains } from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = {};

export const metadata = {
  title: "List workflows",
  description: "List supported PigeonGov workflows across tax and non-tax domains.",
};

export default function listWorkflowsTool(): any {
  return withStructuredContent({
    ok: true,
    domains: workflowDomains(),
    workflows: listWorkflows(),
    flaggedFields: [],
  });
}
