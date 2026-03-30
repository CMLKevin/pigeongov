import type { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import chalk from "chalk";

import { input, confirm } from "@inquirer/prompts";
import { isNonInteractive } from "../output.js";

interface SectionSpec {
  id: string;
  title: string;
  fieldCount: number;
}

function toTitleCase(s: string): string {
  return s.replace(/(?:^|[\s-])(\w)/g, (_, c: string) => ` ${c.toUpperCase()}`).trim();
}

function toCamelCase(s: string): string {
  return s
    .replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(\w)/, (_, c: string) => c.toLowerCase());
}

function toPascalCase(s: string): string {
  const camel = toCamelCase(s);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function generateSchemaFile(domain: string, _sections: SectionSpec[]): string {
  const typeName = `${toPascalCase(domain)}WorkflowInput`;
  return `import { z } from "zod";

import { identitySchema } from "./common.js";

export const ${toCamelCase(domain)}InputSchema = z
  .object({
    applicant: identitySchema,
    // TODO: add domain-specific fields
    notes: z.string().trim().optional(),
  })
  .strict();

export type ${typeName} = z.infer<typeof ${toCamelCase(domain)}InputSchema>;
`;
}

function generateDomainFile(
  domain: string,
  workflowName: string,
  sections: SectionSpec[],
): string {
  const pascalDomain = toPascalCase(domain);
  const schemaVar = `${toCamelCase(domain)}InputSchema`;
  const typeName = `${pascalDomain}WorkflowInput`;
  const workflowId = `${domain}/${workflowName}`;
  const exportName = `${toCamelCase(domain)}Workflows`;

  const sectionLiteral = sections
    .map((s) => {
      const fields = Array.from({ length: s.fieldCount }, (_, i) => {
        const key = `field${i + 1}`;
        return `          { key: "${key}", label: "${toTitleCase(s.id)} field ${i + 1}", type: "text" as const },`;
      }).join("\n");
      return `      {
        id: "${s.id}",
        title: "${s.title}",
        fields: [
${fields}
        ],
      },`;
    })
    .join("\n");

  return `import type { WorkflowBundle } from "../../types.js";
import { buildEvidenceItem, buildGenericSummary, genericArtifacts, makeCheck } from "../helpers.js";
import { ${schemaVar} } from "../schemas/${domain}.js";
import type { ${typeName} } from "../schemas/${domain}.js";
import type { WorkflowDefinition } from "../types.js";

export const ${exportName} = {
  "${workflowId}": {
    summary: {
      id: "${workflowId}",
      domain: "${domain}",
      title: "${toTitleCase(workflowName)} workflow",
      summary: "TODO: describe what this workflow does.",
      status: "preview",
      audience: "individual",
      tags: ["${domain}", "${workflowName}"],
    },
    inputSchema: ${schemaVar},
    starterData: {
      applicant: {
        firstName: "",
        lastName: "",
        ssn: "000-00-0000",
        address: {
          street1: "",
          city: "",
          state: "CA",
          zipCode: "",
        },
      },
    } satisfies ${typeName},
    sections: [
${sectionLiteral}
    ],
    buildBundle(input: ${typeName}): WorkflowBundle {
      const evidence = [
        buildEvidenceItem("identity", "Applicant identity", true, !!input.applicant.firstName),
      ];

      const flags = [];
      const checks = [
        makeCheck("identity-check", "Applicant name provided", !!input.applicant.firstName, "error", "First name is required"),
      ];

      const review = buildGenericSummary(
        "${toTitleCase(workflowName)}",
        evidence.every((e) => e.status === "provided") ? "Ready" : "Incomplete",
        evidence,
        flags,
        ["Review all sections before submission."],
      );

      return {
        workflowId: "${workflowId}",
        domain: "${domain}",
        title: "${toTitleCase(workflowName)} workflow",
        summary: "TODO: describe what this workflow does.",
        applicant: input.applicant,
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {},
        validation: { checks, flaggedFields: flags },
        review,
        outputArtifacts: genericArtifacts("${workflowId}", evidence),
        provenance: ["scaffolded by pigeongov scaffold"],
      };
    },
  } satisfies WorkflowDefinition<${typeName}>,
} as const;
`;
}

function generateWorkflowAppendBlock(
  domain: string,
  workflowName: string,
  sections: SectionSpec[],
): string {
  const pascalDomain = toPascalCase(domain);
  const schemaVar = `${toCamelCase(domain)}InputSchema`;
  const typeName = `${pascalDomain}WorkflowInput`;
  const workflowId = `${domain}/${workflowName}`;

  const sectionLiteral = sections
    .map((s) => {
      const fields = Array.from({ length: s.fieldCount }, (_, i) => {
        const key = `field${i + 1}`;
        return `          { key: "${key}", label: "${toTitleCase(s.id)} field ${i + 1}", type: "text" as const },`;
      }).join("\n");
      return `      {
        id: "${s.id}",
        title: "${s.title}",
        fields: [
${fields}
        ],
      },`;
    })
    .join("\n");

  return `
  // ---- scaffolded: ${workflowId} ----
  "${workflowId}": {
    summary: {
      id: "${workflowId}",
      domain: "${domain}",
      title: "${toTitleCase(workflowName)} workflow",
      summary: "TODO: describe what this workflow does.",
      status: "preview" as const,
      audience: "individual" as const,
      tags: ["${domain}", "${workflowName}"],
    },
    inputSchema: ${schemaVar},
    starterData: {
      applicant: {
        firstName: "",
        lastName: "",
        ssn: "000-00-0000",
        address: { street1: "", city: "", state: "CA", zipCode: "" },
      },
    } satisfies ${typeName},
    sections: [
${sectionLiteral}
    ],
    buildBundle(input: ${typeName}): WorkflowBundle {
      const evidence = [
        buildEvidenceItem("identity", "Applicant identity", true, !!input.applicant.firstName),
      ];
      const flags: import("../../types.js").ValidationFlag[] = [];
      const checks = [
        makeCheck("identity-check", "Applicant name provided", !!input.applicant.firstName, "error", "First name is required"),
      ];
      const review = buildGenericSummary(
        "${toTitleCase(workflowName)}",
        evidence.every((e) => e.status === "provided") ? "Ready" : "Incomplete",
        evidence,
        flags,
        ["Review all sections before submission."],
      );
      return {
        workflowId: "${workflowId}",
        domain: "${domain}",
        title: "${toTitleCase(workflowName)} workflow",
        summary: "TODO: describe what this workflow does.",
        applicant: input.applicant,
        household: [],
        evidence,
        answers: input as unknown as Record<string, unknown>,
        derived: {},
        validation: { checks, flaggedFields: flags },
        review,
        outputArtifacts: genericArtifacts("${workflowId}", evidence),
        provenance: ["scaffolded by pigeongov scaffold"],
      };
    },
  },
`;
}

export function registerScaffoldCommand(program: Command): void {
  program
    .command("scaffold <domainSlashWorkflow>")
    .description(
      "Scaffold a new workflow (e.g. pigeongov scaffold education/student-loan)",
    )
    .option("--sections <names>", "Comma-separated section names (non-interactive)")
    .option("--fields-per-section <n>", "Fields per section", "3")
    .action(async (domainSlashWorkflow: string, options) => {
      const parts = domainSlashWorkflow.split("/");
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        console.error(
          chalk.red("Usage: pigeongov scaffold <domain>/<workflow-name>"),
        );
        process.exitCode = 1;
        return;
      }

      const [domain, workflowName] = parts as [string, string];
      const srcRoot = path.resolve("src/workflows");

      // Determine sections
      let sections: SectionSpec[];
      const fieldsPerSection = Number(options.fieldsPerSection) || 3;

      if (options.sections) {
        sections = (options.sections as string).split(",").map((s) => ({
          id: s.trim(),
          title: toTitleCase(s.trim()),
          fieldCount: fieldsPerSection,
        }));
      } else if (isNonInteractive()) {
        // Default sections if non-interactive and no --sections flag
        sections = [
          { id: "basics", title: "Basics", fieldCount: fieldsPerSection },
        ];
      } else {
        // Interactive mode: ask for sections
        sections = [];
        let addMore = true;
        while (addMore) {
          const sectionName = await input({
            message: `Section name (e.g. "personal-info"):`,
          });
          const countStr = await input({
            message: `Number of fields for "${sectionName}":`,
            default: String(fieldsPerSection),
          });
          sections.push({
            id: sectionName,
            title: toTitleCase(sectionName),
            fieldCount: Number(countStr) || fieldsPerSection,
          });
          addMore = await confirm({
            message: "Add another section?",
            default: false,
          });
        }
      }

      // --- Schema file ---
      const schemaDir = path.join(srcRoot, "schemas");
      const schemaFile = path.join(schemaDir, `${domain}.ts`);
      if (!existsSync(schemaDir)) mkdirSync(schemaDir, { recursive: true });

      if (!existsSync(schemaFile)) {
        writeFileSync(schemaFile, generateSchemaFile(domain, sections), "utf-8");
        console.log(chalk.green(`Created schema: ${schemaFile}`));
      } else {
        console.log(chalk.dim(`Schema already exists: ${schemaFile}`));
      }

      // --- Domain file ---
      const domainDir = path.join(srcRoot, "domains");
      const domainFile = path.join(domainDir, `${domain}.ts`);
      if (!existsSync(domainDir)) mkdirSync(domainDir, { recursive: true });

      if (!existsSync(domainFile)) {
        writeFileSync(
          domainFile,
          generateDomainFile(domain, workflowName, sections),
          "utf-8",
        );
        console.log(chalk.green(`Created domain: ${domainFile}`));
      } else {
        // Append a new workflow block to existing domain file
        const existingContent = readFileSync(domainFile, "utf-8");
        // Find the last `} as const;` and insert before it
        const appendBlock = generateWorkflowAppendBlock(
          domain,
          workflowName,
          sections,
        );
        const marker = "} as const;";
        const lastMarkerIdx = existingContent.lastIndexOf(marker);
        if (lastMarkerIdx >= 0) {
          const updated =
            existingContent.slice(0, lastMarkerIdx) +
            appendBlock +
            existingContent.slice(lastMarkerIdx);
          writeFileSync(domainFile, updated, "utf-8");
          console.log(
            chalk.green(`Appended workflow to existing domain: ${domainFile}`),
          );
        } else {
          appendFileSync(domainFile, appendBlock, "utf-8");
          console.log(
            chalk.yellow(
              `Could not find insertion point; appended to end: ${domainFile}`,
            ),
          );
        }
      }

      console.log(
        chalk.bold(
          `\nScaffolded ${domain}/${workflowName} with ${sections.length} section${sections.length === 1 ? "" : "s"}.`,
        ),
      );
      console.log(
        chalk.dim(
          "Next steps: edit the schema and buildBundle to add real fields, then register in src/workflows/registry.ts",
        ),
      );
    });
}
