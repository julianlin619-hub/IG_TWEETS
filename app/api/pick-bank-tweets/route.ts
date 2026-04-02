import { NextResponse } from 'next/server';
import { pickRandomUnused, markUsed } from '@/lib/tweet-bank';

const BATCH_SIZE = 10;

export async function POST() {
  const { picked, remainingUnused } = pickRandomUnused(BATCH_SIZE);

  if (picked.length === 0) {
    return NextResponse.json({ tweets: [], remainingUnused: 0 });
  }

  // Mark as used immediately so refreshing picks new ones
  markUsed(picked.map((t) => t.hash));

  const tweets = picked.map((t) => ({
    id: t.hash,
    text: t.text,
  }));

  return NextResponse.json({ tweets, remainingUnused });
}
