import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parse } from 'csv-parse/sync';

const BANK_FILE = path.join(process.cwd(), 'data', 'tweet_bank_1.csv');
const HISTORY_FILE = path.join(process.cwd(), 'data', 'tweet-bank-history.json');

interface BankHistory {
  usedHashes: string[];
  bankBatchCount: number;
}

export interface BankTweet {
  hash: string;
  text: string;
}

export function hashTweet(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex').slice(0, 12);
}

export function parseBankFile(): BankTweet[] {
  const raw = fs.readFileSync(BANK_FILE, 'utf-8');
  const rows: string[][] = parse(raw, {
    relax_column_count: true,
    skip_empty_lines: true,
    trim: true,
  });

  return rows
    .map((row) => row[0]?.trim())
    .filter((text): text is string => Boolean(text))
    .map((text) => ({ hash: hashTweet(text), text }));
}

function getBankHistory(): BankHistory {
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw) as BankHistory;
  } catch {
    const defaults: BankHistory = { usedHashes: [], bankBatchCount: 0 };
    fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
}

function writeBankHistory(history: BankHistory): void {
  fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export function pickRandomUnused(count: number): { picked: BankTweet[]; remainingUnused: number } {
  const all = parseBankFile();
  const { usedHashes } = getBankHistory();
  const usedSet = new Set(usedHashes);
  const available = all.filter((t) => !usedSet.has(t.hash));

  // Fisher-Yates shuffle
  const shuffled = [...available];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const picked = shuffled.slice(0, Math.min(count, shuffled.length));
  return { picked, remainingUnused: available.length - picked.length };
}

export function markUsed(hashes: string[]): void {
  const history = getBankHistory();
  const merged = Array.from(new Set([...history.usedHashes, ...hashes]));
  writeBankHistory({ ...history, usedHashes: merged });
}

export function getNextBankBatchNumber(): number {
  const history = getBankHistory();
  const next = history.bankBatchCount + 1;
  writeBankHistory({ ...history, bankBatchCount: next });
  return next;
}

export function resetBankHistory(): void {
  writeBankHistory({ usedHashes: [], bankBatchCount: 0 });
}
