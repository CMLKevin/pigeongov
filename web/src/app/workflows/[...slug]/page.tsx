import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { describeWorkflow } from "@/lib/engine";
import { WorkflowWizard } from "@/components/workflow-wizard";
import { submitWorkflow } from "../actions";

// Force dynamic rendering -- the engine bridge shells out to the CLI at request
// time, so we cannot statically generate these pages.
export const dynamic = "force-dynamic";

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
