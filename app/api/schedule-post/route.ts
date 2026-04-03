import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { getInstagramAccount, scheduleVideoToInstagram } from '@/lib/zernio';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { files } = body as {
      files: { videoFileName: string; tweetText: string }[];
    };

    const { accountId, profileId } = await getInstagramAccount();
    const scheduled: { videoFileName: string; postId: string }[] = [];

    for (const file of files) {
      const videoPath = path.join(process.cwd(), 'exports', 'videos', file.videoFileName);
      const post = await scheduleVideoToInstagram(accountId, profileId, file.tweetText, videoPath);
      scheduled.push({ videoFileName: file.videoFileName, postId: post.id });
    }

    return NextResponse.json({ scheduled });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
