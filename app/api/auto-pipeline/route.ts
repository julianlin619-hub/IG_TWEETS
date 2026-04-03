import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { pickRandomUnused, markUsed, getNextBankBatchNumber } from '@/lib/tweet-bank';
import { normalizeTweetText } from '@/lib/tweet-normalize';
import { renderTweetToBuffer } from '@/lib/canvas-render';
import { renderPngToVideo } from '@/lib/video-render';
import { createFolder, uploadToDrive } from '@/lib/google-drive';
import { getInstagramAccount, scheduleVideoToInstagram } from '@/lib/zernio';

const BATCH_SIZE = 10;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Pick tweets
  const { picked, remainingUnused } = pickRandomUnused(BATCH_SIZE);
  if (picked.length === 0) {
    return NextResponse.json({ message: 'No unused tweets remaining in bank', remainingUnused: 0 });
  }

  // 2. Generate PNG + MP4
  const imagesDir = path.join(process.cwd(), 'exports', 'bank-images');
  const videosDir = path.join(process.cwd(), 'exports', 'bank-videos');
  await fs.mkdir(imagesDir, { recursive: true });
  await fs.mkdir(videosDir, { recursive: true });

  const generated: { hash: string; text: string; pngPath: string; mp4Path: string }[] = [];
  for (const tweet of picked) {
    const normalized = normalizeTweetText(tweet.text);
    const buffer = await renderTweetToBuffer(normalized);
    const pngPath = path.join(imagesDir, `tweet-${tweet.hash}.png`);
    const mp4Path = path.join(videosDir, `tweet-${tweet.hash}.mp4`);
    await fs.writeFile(pngPath, buffer);
    await renderPngToVideo(pngPath, mp4Path);
    generated.push({ hash: tweet.hash, text: tweet.text, pngPath, mp4Path });
  }

  // 3. Upload to Google Drive
  const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const batchNum = getNextBankBatchNumber();
  const batchFolder = await createFolder(`Bank Batch #${batchNum}`, parentFolderId);
  const videosFolder = await createFolder('Videos', batchFolder.id);

  for (const g of generated) {
    await uploadToDrive(g.pngPath, `tweet-${g.hash}.png`, batchFolder.id);
    await uploadToDrive(g.mp4Path, `tweet-${g.hash}.mp4`, videosFolder.id);
  }

  // 4. Schedule on Zernio (upload videos directly from local disk)
  const { accountId, profileId } = await getInstagramAccount();
  const scheduled: { hash: string; postId: string }[] = [];
  for (const g of generated) {
    const post = await scheduleVideoToInstagram(accountId, profileId, g.text, g.mp4Path);
    scheduled.push({ hash: g.hash, postId: post.id });
  }

  // 5. Mark tweets as used only after full success
  markUsed(picked.map((t) => t.hash));

  return NextResponse.json({
    processed: picked.length,
    remainingUnused,
    batchFolder: batchFolder.name,
    scheduled,
  });
}
