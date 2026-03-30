import {
  calculateTaxFromInput,
  calculateTaxInputSchema,
} from "../shared.js";
import { withStructuredContent } from "../result.js";

export const schema = calculateTaxInputSchema.shape;

export const metadata = {
  title: "Calculate tax",
  description: "Run deterministic federal tax calculations for the 2025 tax year.",
};

export default function calculateTaxTool(input: unknown): any {
  const parsed = calculateTaxInputSchema.parse(input);
  const calculation = calculateTaxFromInput(parsed.data);

  return withStructuredContent({
    ok: true,
    flaggedFields: [],
    calculation,
  });
}
