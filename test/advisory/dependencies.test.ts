import { describe, expect, test } from "vitest";

import {
  getDependencies,
  getDownstream,
  getUpstream,
  getAllDependencies,
} from "../../src/advisory/dependencies/graph.js";

describe("dependency graph", () => {
  test("naturalization has downstream deps including tax/1040, voter-registration, and passport", () => {
    const chain = getDependencies("immigration/naturalization");
    const downstreamIds = chain.downstream.map((d) => d.workflowId);

    expect(downstreamIds).toContain("tax/1040");
    expect(downstreamIds).toContain("identity/voter-registration");
    expect(downstreamIds).toContain("identity/passport");
  });

  test("job loss (unemployment/claim-intake) triggers healthcare and tax", () => {
    const chain = getDependencies("unemployment/claim-intake");
    const downstreamIds = chain.downstream.map((d) => d.workflowId);

    expect(downstreamIds).toContain("healthcare/aca-enrollment");
    expect(downstreamIds).toContain("tax/1040");
  });

  test("tax/1040 has upstream dependencies", () => {
    const chain = getDependencies("tax/1040");

    expect(chain.upstream.length).toBeGreaterThan(0);
    // Multiple workflows feed into tax
    const upstreamIds = chain.upstream.map((d) => d.workflowId);
    expect(upstreamIds).toContain("immigration/work-authorization");
  });

  test("unknown workflow returns empty arrays", () => {
    const chain = getDependencies("nonexistent/workflow");

    expect(chain.workflowId).toBe("nonexistent/workflow");
    expect(chain.downstream).toEqual([]);
    expect(chain.upstream).toEqual([]);
  });

  test("getDownstream returns transitive deps with depth", () => {
    const downstream = getDownstream("immigration/naturalization");

    // Direct deps should be depth 1
    const directDeps = downstream.filter((d) => d.depth === 1);
    expect(directDeps.length).toBeGreaterThan(0);

    // Transitive deps (depth 2+) should exist for naturalization
    // because naturalization → tax/1040 → benefits/snap (depth 2)
    const transitiveDeps = downstream.filter((d) => d.depth >= 2);
    expect(transitiveDeps.length).toBeGreaterThan(0);

    // All entries should have a depth >= 1
    for (const dep of downstream) {
      expect(dep.depth).toBeGreaterThanOrEqual(1);
    }
  });

  test("getUpstream works for voter-registration (naturalization and name-change feed into it)", () => {
    const upstream = getUpstream("identity/voter-registration");
    const upstreamIds = upstream.map((d) => d.workflowId);

    expect(upstreamIds).toContain("immigration/naturalization");
    expect(upstreamIds).toContain("identity/name-change");
  });

  test("getAllDependencies returns the full edge list", () => {
    const all = getAllDependencies();

    expect(all.length).toBeGreaterThanOrEqual(30);
    // Every edge should have the required fields
    for (const dep of all) {
      expect(dep.sourceWorkflowId).toBeTruthy();
      expect(dep.targetWorkflowId).toBeTruthy();
      expect(["triggers", "requires", "affects", "invalidates"]).toContain(dep.relationship);
      expect(typeof dep.description).toBe("string");
      expect(typeof dep.bidirectional).toBe("boolean");
    }
  });

  test("cycle detection prevents infinite loops", () => {
    // ACA ↔ Medicaid is bidirectional — graph traversal must not loop
    const chain = getDependencies("healthcare/aca-enrollment");
    const downstreamIds = chain.downstream.map((d) => d.workflowId);

    // Should include medicaid (bidirectional), but not loop back to aca-enrollment
    expect(downstreamIds).toContain("benefits/medicaid");
    expect(downstreamIds).not.toContain("healthcare/aca-enrollment");
  });

  test("results are sorted by depth", () => {
    const downstream = getDownstream("immigration/naturalization");

    for (let i = 1; i < downstream.length; i++) {
      expect(downstream[i]!.depth).toBeGreaterThanOrEqual(downstream[i - 1]!.depth);
    }
  });
});
