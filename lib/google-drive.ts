import { google } from 'googleapis';
import fs from 'fs';
import { getNextBatchNumber } from './tweet-history';

function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;
  if (!key && !keyFile) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY_FILE env var not set');
  const credentials = key ? JSON.parse(key) : JSON.parse(fs.readFileSync(keyFile!, 'utf-8'));
  // Fix private key newlines — env vars often double-escape \n
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
}

export async function makeFilePublic(fileId: string): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: getAuth() });
  await drive.permissions.create({
    fileId,
    supportsAllDrives: true,
    requestBody: { role: 'reader', type: 'anyone' },
  });
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export async function createFolder(name: string, parentFolderId: string): Promise<{ id: string; name: string }> {
  const drive = google.drive({ version: 'v3', auth: getAuth() });
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    supportsAllDrives: true,
    fields: 'id',
  });
  return { id: res.data.id!, name };
}

export async function createBatchFolder(parentFolderId: string): Promise<{ id: string; name: string }> {
  const batchNumber = getNextBatchNumber();
  const folderName = `Batch #${batchNumber}`;
  return createFolder(folderName, parentFolderId);
}

export async function uploadToDrive(filePath: string, fileName: string, folderId: string): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: getAuth() });
  const mimeType = fileName.endsWith('.mp4') ? 'video/mp4' : 'image/png';

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: fs.createReadStream(filePath),
    },
    supportsAllDrives: true,
    fields: 'id',
  });

  return response.data.id!;
}
