import { listWorkflowSummaries, listDomains } from "../workflows/registry.js";

/**
 * Build an OpenAPI 3.1.0 spec from the current workflow registry.
 * Intentionally minimal — no external dependencies, just data structures.
 */
export function generateOpenApiSpec(): Record<string, unknown> {
  const workflows = listWorkflowSummaries();
  const domains = listDomains();

  const workflowIdEnum = workflows.map((w) => w.id);

  return {
    openapi: "3.1.0",
    info: {
      title: "PigeonGov REST API",
      description:
        "Local-first API for U.S. government workflows, bundles, and forms.",
      version: "0.2.0",
      contact: { name: "PigeonGov", url: "https://github.com/pigeongov" },
      license: { name: "MIT" },
    },
    servers: [
      { url: "http://localhost:3847", description: "Local development" },
    ],
    paths: {
      "/api/workflows": {
        get: {
          operationId: "listWorkflows",
          summary: "List all available workflows",
          tags: ["workflows"],
          responses: {
            "200": {
              description: "List of workflow summaries",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      workflows: {
                        type: "array",
                        items: { $ref: "#/components/schemas/WorkflowSummary" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/workflows/{id}": {
        get: {
          operationId: "describeWorkflow",
          summary: "Describe a workflow's fields, sections, and schema",
          tags: ["workflows"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", enum: workflowIdEnum },
            },
          ],
          responses: {
            "200": {
              description: "Workflow description",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/WorkflowDescription" },
                },
              },
            },
            "404": {
              description: "Workflow not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api/workflows/{id}/fill": {
        post: {
          operationId: "fillWorkflow",
          summary: "Build a complete workflow bundle from input data",
          tags: ["workflows"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", enum: workflowIdEnum },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "Workflow-specific input data",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Built workflow bundle",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/WorkflowBundle" },
                },
              },
            },
            "404": { description: "Workflow not found" },
            "422": { description: "Validation error" },
          },
        },
      },
      "/api/workflows/{id}/validate": {
        post: {
          operationId: "validateWorkflow",
          summary: "Validate input data against a workflow and return validation results",
          tags: ["workflows"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", enum: workflowIdEnum },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  description: "Workflow-specific input data",
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Validation results",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      workflowId: { type: "string" },
                      validation: {
                        $ref: "#/components/schemas/Validation",
                      },
                    },
                  },
                },
              },
            },
            "404": { description: "Workflow not found" },
            "422": { description: "Schema validation error" },
          },
        },
      },
      "/api/deadlines": {
        get: {
          operationId: "listDeadlines",
          summary: "List upcoming workflow deadlines",
          tags: ["deadlines"],
          responses: {
            "200": {
              description: "List of deadlines",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      deadlines: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/WorkflowDeadline",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/openapi.json": {
        get: {
          operationId: "getOpenApiSpec",
          summary: "This OpenAPI specification",
          tags: ["meta"],
          responses: {
            "200": {
              description: "OpenAPI 3.1 specification",
              content: { "application/json": { schema: { type: "object" } } },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        WorkflowSummary: {
          type: "object",
          properties: {
            id: { type: "string" },
            domain: { type: "string", enum: domains },
            title: { type: "string" },
            summary: { type: "string" },
            status: {
              type: "string",
              enum: ["active", "preview", "planned"],
            },
            audience: {
              type: "string",
              enum: ["individual", "household", "business"],
            },
            tags: { type: "array", items: { type: "string" } },
            year: { type: "number" },
            legacyFormId: { type: "string" },
          },
          required: ["id", "domain", "title", "summary", "status", "audience", "tags"],
        },
        WorkflowDescription: {
          type: "object",
          properties: {
            id: { type: "string" },
            domain: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            sections: {
              type: "array",
              items: { $ref: "#/components/schemas/QuestionSection" },
            },
            inputSchema: { type: "array" },
            starterData: { type: "object" },
          },
        },
        QuestionSection: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            fields: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  key: { type: "string" },
                  label: { type: "string" },
                  type: {
                    type: "string",
                    enum: [
                      "text",
                      "textarea",
                      "currency",
                      "number",
                      "select",
                      "confirm",
                      "date",
                    ],
                  },
                  helpText: { type: "string" },
                  placeholder: { type: "string" },
                },
                required: ["key", "label", "type"],
              },
            },
          },
          required: ["id", "title", "fields"],
        },
        WorkflowBundle: {
          type: "object",
          description: "Complete workflow output bundle with evidence, validation, and review.",
          properties: {
            workflowId: { type: "string" },
            domain: { type: "string" },
            title: { type: "string" },
            summary: { type: "string" },
            household: { type: "array" },
            evidence: { type: "array" },
            answers: { type: "object" },
            derived: { type: "object" },
            validation: { $ref: "#/components/schemas/Validation" },
            review: { $ref: "#/components/schemas/ReviewSummary" },
            outputArtifacts: { type: "array" },
            provenance: { type: "array", items: { type: "string" } },
          },
          required: [
            "workflowId",
            "domain",
            "title",
            "summary",
            "validation",
            "review",
          ],
        },
        Validation: {
          type: "object",
          properties: {
            checks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  label: { type: "string" },
                  passed: { type: "boolean" },
                  severity: {
                    type: "string",
                    enum: ["warning", "error"],
                  },
                  message: { type: "string" },
                },
              },
            },
            flaggedFields: {
              type: "array",
              items: { $ref: "#/components/schemas/ValidationFlag" },
            },
          },
        },
        ValidationFlag: {
          type: "object",
          properties: {
            field: { type: "string" },
            severity: {
              type: "string",
              enum: ["warning", "error", "review"],
            },
            message: { type: "string" },
            source: { type: "string" },
          },
          required: ["field", "severity", "message"],
        },
        ReviewSummary: {
          type: "object",
          properties: {
            headline: { type: "string" },
            notes: { type: "array", items: { type: "string" } },
            flaggedFields: {
              type: "array",
              items: { $ref: "#/components/schemas/ValidationFlag" },
            },
          },
        },
        WorkflowDeadline: {
          type: "object",
          properties: {
            workflowId: { type: "string" },
            label: { type: "string" },
            date: { type: "string", format: "date" },
            type: { type: "string", enum: ["hard", "soft"] },
            consequence: { type: "string" },
            extensionAvailable: { type: "boolean" },
          },
          required: [
            "workflowId",
            "label",
            "date",
            "type",
            "consequence",
            "extensionAvailable",
          ],
        },
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
          },
          required: ["error", "message"],
        },
      },
    },
  };
}
