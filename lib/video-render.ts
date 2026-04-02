import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

ffmpeg.setFfmpegPath(ffmpegStatic!);

export function renderPngToVideo(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .inputOptions(['-loop 1'])
      // Add silent audio track (required for Instagram Reels)
      .input('anullsrc=r=44100:cl=stereo')
      .inputOptions(['-f lavfi'])
      .outputOptions([
        '-t 5',
        '-c:v libx264',
        '-pix_fmt yuv420p',
        '-r 24',
        '-c:a aac',
        '-b:a 128k',
        '-shortest',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', reject)
      .run();
  });
}
