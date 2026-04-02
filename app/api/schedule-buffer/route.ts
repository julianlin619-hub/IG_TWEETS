import { NextRequest, NextResponse } from 'next/server';
import { getInstagramChannelId, scheduleVideoToInstagram, introspectSchema } from '@/lib/buffer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Introspection mode: discover CreatePostInput schema
    if (body.introspect) {
      const schema = await introspectSchema();
      return NextResponse.json({ schema });
    }

    const { files } = body as {
      files: { videoFileName?: string; videoUrl?: string; tweetText: string }[];
    };
    const appUrl = process.env.APP_URL;
    const channelId = await getInstagramChannelId();
    const scheduled: { videoFileName?: string; postId: string }[] = [];
    for (const file of files) {
      const videoUrl = file.videoUrl ?? (appUrl ? `${appUrl}/api/download/${file.videoFileName}` : null);
      if (!videoUrl) throw new Error('Either videoUrl must be provided or APP_URL env var must be set');
      const post = await scheduleVideoToInstagram(channelId, file.tweetText, videoUrl);
      scheduled.push({ videoFileName: file.videoFileName, postId: post.id });
    }
    return NextResponse.json({ scheduled });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
