import type { ValidationCheck } from "../types.js";
import type {
  FormPlugin,
  OrchestratorResult,
  TaxOrchestratorInput,
} from "./types.js";

// ---------------------------------------------------------------------------
// Tax Orchestrator
//
// Manages a registry of FormPlugin instances, determines which are triggered
// for a given input, resolves their dependency order via topological sort,
// and executes them in sequence — collecting results, validation checks, and
// merged form-line mappings along the way.
// ---------------------------------------------------------------------------

export class TaxOrchestrator {
  private plugins: Map<string, FormPlugin> = new Map();

  /** Register a form plugin. Overwrites any existing plugin with the same formId. */
  register(plugin: FormPlugin): void {
    this.plugins.set(plugin.formId, plugin);
  }

  /** Unregister a plugin by formId. Returns true if it existed. */
  unregister(formId: string): boolean {
    return this.plugins.delete(formId);
  }

  /** List all registered plugin IDs. */
  registeredPlugins(): string[] {
    return [...this.plugins.keys()];
  }

  /** Execute the full orchestration pipeline for the given input. */
  execute(input: TaxOrchestratorInput): OrchestratorResult {
    // 1. The core-1040 plugin must be registered — it is the root of every return.
    const corePlugin = this.plugins.get("core-1040");
    if (!corePlugin) {
      throw new Error(
        "TaxOrchestrator: 'core-1040' plugin is not registered. " +
          "Register it before calling execute().",
      );
    }

    // 2. Determine which plugins are triggered.
    const triggeredIds: string[] = [];
    for (const [id, plugin] of this.plugins) {
      if (plugin.triggerCondition(input)) {
        triggeredIds.push(id);
      }
    }

    // 3. Topologically sort triggered plugins by their dependencies.
    const sortedIds = this.topologicalSort(triggeredIds);

    // 4. Execute each plugin in dependency order.
    const intermediateResults = new Map<string, unknown>();
    const allValidationChecks: ValidationCheck[] = [];
    const formLinesMerged: Record<string, unknown> = {};
    let coreResult: unknown = undefined;

    for (const id of sortedIds) {
      const plugin = this.plugins.get(id)!;
      const result = plugin.calculate(input, intermediateResults);
      intermediateResults.set(id, result);

      if (id === "core-1040") {
        coreResult = result;
      }

      // Collect validation checks.
      const checks = plugin.validate(result, input);
      allValidationChecks.push(...checks);

      // Merge form lines.
      const lines = plugin.mapToFormLines(result);
      for (const [key, value] of Object.entries(lines)) {
        formLinesMerged[key] = value;
      }
    }

    return {
      coreResult,
      formResults: intermediateResults,
      allValidationChecks,
      triggeredForms: sortedIds,
      formLinesMerged,
    };
  }

  // -------------------------------------------------------------------------
  // Topological sort via Kahn's algorithm.
  //
  // Only considers plugins that are in the `pluginIds` set. If a dependency
  // is listed but not triggered (and not in the set), it is ignored — this
  // lets optional upstream plugins stay out of the graph when not needed.
  // -------------------------------------------------------------------------

  private topologicalSort(pluginIds: string[]): string[] {
    const idSet = new Set(pluginIds);

    // Build adjacency list and in-degree map for the triggered subset.
    const inDegree = new Map<string, number>();
    const dependents = new Map<string, string[]>(); // dependency -> [plugins that depend on it]

    for (const id of idSet) {
      if (!inDegree.has(id)) {
        inDegree.set(id, 0);
      }
      if (!dependents.has(id)) {
        dependents.set(id, []);
      }

      const plugin = this.plugins.get(id);
      if (!plugin) {
        throw new Error(
          `TaxOrchestrator: plugin '${id}' is triggered but not registered.`,
        );
      }

      for (const dep of plugin.dependencies) {
        if (!idSet.has(dep)) {
          // Dependency not triggered — skip it (the plugin will receive
          // no intermediate result for that dep, which is fine if it's optional).
          continue;
        }
        inDegree.set(id, (inDegree.get(id) ?? 0) + 1);
        if (!dependents.has(dep)) {
          dependents.set(dep, []);
        }
        dependents.get(dep)!.push(id);
      }
    }

    // Seed queue with zero-in-degree nodes.
    const queue: string[] = [];
    for (const [id, degree] of inDegree) {
      if (degree === 0) {
        queue.push(id);
      }
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      sorted.push(current);
      for (const dependent of dependents.get(current) ?? []) {
        const newDegree = (inDegree.get(dependent) ?? 1) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    if (sorted.length !== idSet.size) {
      const remaining = [...idSet].filter((id) => !sorted.includes(id));
      throw new Error(
        `TaxOrchestrator: dependency cycle detected among plugins: ${remaining.join(", ")}`,
      );
    }

    return sorted;
  }
}

// ---------------------------------------------------------------------------
// Default singleton orchestrator — plugins register themselves on import.
// ---------------------------------------------------------------------------

export const defaultOrchestrator = new TaxOrchestrator();
