import Link from "next/link";

export default function WorkflowNotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-6xl font-bold font-mono text-pigeon-purple mb-4">
          404
        </p>
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Workflow not found
        </h1>
        <p className="text-sm text-muted mb-6 max-w-md mx-auto">
          That workflow ID does not exist in the PigeonGov registry. Double-check
          the URL or browse available workflows from the home page.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-pigeon-purple px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-pigeon-purple/25 transition-all duration-200 hover:bg-pigeon-purple/80"
        >
          Browse workflows
        </Link>
      </div>
    </div>
  );
}
