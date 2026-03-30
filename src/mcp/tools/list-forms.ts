import { listForms } from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = {};

export const metadata = {
  title: "List forms",
  description: "List supported PigeonGov schemas for the current tax year.",
};

export default function listFormsTool(_input?: unknown): any {
  return withStructuredContent({
    ok: true,
    flaggedFields: [],
    forms: listForms(),
  });
}
