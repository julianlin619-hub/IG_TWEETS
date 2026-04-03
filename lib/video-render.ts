import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

ffmpeg.setFfmpegPath(ffmpegStatic!);

export function renderPngToVideo(inputPath: string, outputPath: string): Promise<void> {
  const fs = require('fs');
  const path = require('path');
  const tempVideo = outputPath.replace('.mp4', '.tmp.mp4');
  const silentRaw = outputPath.replace('.mp4', '.raw');

  // Create a raw silent PCM file (44100Hz * 2 channels * 2 bytes * 5 seconds)
  const silentBuffer = Buffer.alloc(44100 * 2 * 2 * 5, 0);
  fs.writeFileSync(silentRaw, silentBuffer);

  // Step 1: Create video without audio
  return new Promise<void>((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .inputOptions(['-loop 1'])
      .outputOptions(['-t 5', '-vf', 'scale=1080:1920', '-c:v libx264', '-pix_fmt yuv420p', '-r 24'])
      .output(tempVideo)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  }).then(() => {
    // Step 2: Mux silent audio into the video
    return new Promise<void>((resolve, reject) => {
      ffmpeg()
        .input(tempVideo)
        .input(silentRaw)
        .inputOptions(['-f s16le', '-ar 44100', '-ac 2'])
        .outputOptions(['-c:v copy', '-c:a aac', '-b:a 128k', '-shortest', '-movflags', '+faststart'])
        .output(outputPath)
        .on('end', () => {
          fs.unlinkSync(tempVideo);
          fs.unlinkSync(silentRaw);
          resolve();
        })
        .on('error', reject)
        .run();
    });
  });
}
