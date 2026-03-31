import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LIFE_EVENT_CARDS } from '@/lib/life-events';
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
    title: `${event.label} \u2014 Your Action Plan`,
    description: event.description,
  };
}

export default async function LifeEventPage({ params }: LifeEventPageProps) {
  const { eventId } = await params;
  const event = LIFE_EVENT_CARDS.find((e) => e.id === eventId);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[#9d8ec2] hover:text-white font-mono transition-colors mb-6"
      >
        <span aria-hidden="true">&larr;</span>
        cd ..
      </Link>

      <LifeEventClient eventId={eventId} />
    </div>
  );
}
