import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, AlertTriangle } from 'lucide-react';
import { LIFE_EVENT_CARDS } from '@/lib/life-events';
import { cn } from '@/lib/utils';
import { LifeEventClient } from './client';

interface LifeEventPageProps {
  params: Promise<{ eventId: string }>;
}

export async function generateStaticParams() {
  return LIFE_EVENT_CARDS.map((event) => ({ eventId: event.id }));
}

export async function generateMetadata({ params }: LifeEventPageProps) {
  const { eventId } = await params;
  const event = LIFE_EVENT_CARDS.find((e) => e.id === eventId);
  if (!event) return { title: 'Not Found' };
  return {
    title: `${event.label} -- Your Action Plan`,
    description: event.description,
  };
}

export default async function LifeEventPage({ params }: LifeEventPageProps) {
  const { eventId } = await params;
  const event = LIFE_EVENT_CARDS.find((e) => e.id === eventId);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to life events
      </Link>

      <div className="flex items-start gap-4 mb-8">
        {event.urgent && (
          <div className="flex-shrink-0 mt-1">
            <AlertTriangle className="h-6 w-6 text-urgent" />
          </div>
        )}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {event.label}
          </h1>
          <p className="mt-2 text-muted text-lg">{event.description}</p>
          {event.urgent && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-urgent/10 border border-urgent/30 px-3 py-1 text-xs font-medium text-urgent">
              <Clock className="h-3 w-3" />
              Time-sensitive -- some deadlines are days away
            </span>
          )}
        </div>
      </div>

      <LifeEventClient eventId={eventId} />
    </div>
  );
}
