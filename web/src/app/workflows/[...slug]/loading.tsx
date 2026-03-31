export default function WorkflowLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Skeleton header */}
        <div className="mb-8 animate-pulse">
          <div className="h-3 w-16 rounded bg-surface mb-3" />
          <div className="h-7 w-64 rounded bg-surface mb-2" />
          <div className="h-4 w-96 rounded bg-surface" />
        </div>

        {/* Skeleton progress bar */}
        <div className="mb-8 animate-pulse">
          <div className="h-1.5 w-full rounded-full bg-surface mb-4" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-6 w-20 rounded-full bg-surface" />
            ))}
          </div>
        </div>

        {/* Skeleton card */}
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 animate-pulse">
          <div className="mb-6">
            <div className="h-5 w-32 rounded bg-white/5 mb-2" />
            <div className="h-3 w-48 rounded bg-white/5" />
          </div>
          <div className="space-y-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="h-3 w-24 rounded bg-white/5 mb-2" />
                <div className="h-11 w-full rounded-lg bg-white/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
