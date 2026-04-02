import { NextRequest, NextResponse } from 'next/server';
import { getTikTokChannelId, scheduleVideoToTikTok } from '@/lib/buffer';

export async function POST(req: NextRequest) {
  try {
    const { files } = await req.json() as {
      files: { videoFileName?: string; videoUrl?: string; tweetText: string }[];
    };
    const appUrl = process.env.APP_URL;
    const channelId = await getTikTokChannelId();
    const scheduled: { videoFileName?: string; postId: string }[] = [];
    for (const file of files) {
      const videoUrl = file.videoUrl ?? (appUrl ? `${appUrl}/api/download/${file.videoFileName}` : null);
      if (!videoUrl) throw new Error('Either videoUrl must be provided or APP_URL env var must be set');
      const post = await scheduleVideoToTikTok(channelId, file.tweetText, videoUrl);
      scheduled.push({ videoFileName: file.videoFileName, postId: post.id });
    }
    return NextResponse.json({ scheduled });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
