import type { DependencyChain, WorkflowDependency } from "../../types.js";
import { WORKFLOW_DEPENDENCIES } from "./data.js";

/**
 * Returns the full dependency chain for a workflow — both what it triggers
 * downstream and what feeds into it upstream.
 */
export function getDependencies(workflowId: string): DependencyChain {
  return {
    workflowId,
    downstream: getDownstream(workflowId),
    upstream: getUpstream(workflowId),
  };
}

/**
 * Transitive downstream traversal with cycle detection.
 * "If I complete workflow X, what else do I need to deal with?"
 */
export function getDownstream(
  workflowId: string,
  maxDepth: number = 3,
): DependencyChain["downstream"] {
  const results: DependencyChain["downstream"] = [];
  const visited = new Set<string>();

  function walk(currentId: string, depth: number): void {
    if (depth > maxDepth) return;

    for (const dep of WORKFLOW_DEPENDENCIES) {
      const isForward = dep.sourceWorkflowId === currentId;
      const isReverse = dep.bidirectional && dep.targetWorkflowId === currentId;

      if (!isForward && !isReverse) continue;

      const targetId = isForward ? dep.targetWorkflowId : dep.sourceWorkflowId;

      if (visited.has(targetId)) continue;
      visited.add(targetId);

      results.push({
        workflowId: targetId,
        relationship: dep.relationship,
        description: dep.description,
        depth,
      });

      walk(targetId, depth + 1);
    }
  }

  visited.add(workflowId);
  walk(workflowId, 1);

  return results.sort((a, b) => a.depth - b.depth);
}

/**
 * Reverse traversal — what workflows feed into this one?
 */
export function getUpstream(
  workflowId: string,
  maxDepth: number = 3,
): DependencyChain["upstream"] {
  const results: DependencyChain["upstream"] = [];
  const visited = new Set<string>();

  function walk(currentId: string, depth: number): void {
    if (depth > maxDepth) return;

    for (const dep of WORKFLOW_DEPENDENCIES) {
      const isTarget = dep.targetWorkflowId === currentId;
      const isBidiSource = dep.bidirectional && dep.sourceWorkflowId === currentId;

      if (!isTarget && !isBidiSource) continue;

      const sourceId = isTarget ? dep.sourceWorkflowId : dep.targetWorkflowId;

      if (visited.has(sourceId)) continue;
      visited.add(sourceId);

      results.push({
        workflowId: sourceId,
        relationship: dep.relationship,
        description: dep.description,
        depth,
      });

      walk(sourceId, depth + 1);
    }
  }

  visited.add(workflowId);
  walk(workflowId, 1);

  return results.sort((a, b) => a.depth - b.depth);
}

/**
 * Returns the raw dependency array — useful for graph visualisation
 * or bulk export.
 */
export function getAllDependencies(): WorkflowDependency[] {
  return WORKFLOW_DEPENDENCIES;
}
