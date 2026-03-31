import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  icon?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  backHref = '/',
  backLabel = 'Back',
  icon,
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>
      <div className="flex items-start gap-4">
        {icon && (
          <div className="flex-shrink-0 mt-1">{icon}</div>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-muted text-lg max-w-2xl">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
