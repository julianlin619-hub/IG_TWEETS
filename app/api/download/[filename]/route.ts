import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const filename = path.basename(params.filename);
  const ext = path.extname(filename).toLowerCase();

  let contentType: string;
  let searchDirs: string[];
  if (ext === '.mp4') {
    contentType = 'video/mp4';
    searchDirs = ['videos', 'bank-videos'];
  } else {
    contentType = 'image/png';
    searchDirs = ['images', 'bank-images'];
  }

  let filepath = '';
  for (const dir of searchDirs) {
    const candidate = path.join(process.cwd(), 'exports', dir, filename);
    if (fs.existsSync(candidate)) {
      filepath = candidate;
      break;
    }
  }

  if (!filepath) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const file = fs.readFileSync(filepath);
  return new Response(file, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': file.byteLength.toString(),
    },
  });
}
