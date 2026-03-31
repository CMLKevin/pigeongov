import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { describeWorkflow, listWorkflows } from "@/lib/engine";
import { WorkflowWizard } from "@/components/workflow-wizard";
import { submitWorkflow } from "../actions";

// ---------------------------------------------------------------------------
// Static generation — pre-render every known workflow at build time.
// The engine registry is immutable at runtime so this is both safe and fast:
// pages go from ~1.5 s (cold CLI spawn per request) to instant static serves.
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const workflows = listWorkflows();
  return workflows.map((w) => ({ slug: w.id.split("/") }));
}

// Any slug NOT returned by generateStaticParams should 404 immediately rather
// than attempting a dynamic render that would just fail anyway.
export const dynamicParams = false;

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

interface WorkflowPageProps {
  params: Promise<{ slug: string[] }>;
}

export async function generateMetadata({
  params,
}: WorkflowPageProps): Promise<Metadata> {
  const { slug } = await params;
  const workflowId = slug.join("/");

  try {
    const workflow = describeWorkflow(workflowId);
    return {
      title: `${workflow.title}`,
      description: workflow.summary,
    };
  } catch {
    return {
      title: "Workflow",
      description: "Government workflow wizard",
    };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { slug } = await params;
  const workflowId = slug.join("/");

  let workflow;
  try {
    workflow = describeWorkflow(workflowId);
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back nav */}
      <div className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </div>

      {/* Wizard */}
      <WorkflowWizard
        workflowId={workflowId}
        title={workflow.title}
        summary={workflow.summary}
        domain={workflow.domain}
        sections={workflow.sections}
        starterData={workflow.starterData}
        submitAction={submitWorkflow}
      />
    </div>
  );
}
