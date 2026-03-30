import {
  randomBytes,
  randomUUID,
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  createHash,
} from "node:crypto";
import { readFile, writeFile, stat } from "node:fs/promises";
import { join, basename } from "node:path";
import { lookup } from "node:dns";

import type { VaultEntry } from "../types.js";
import { getVaultDir, ensureDir } from "./paths.js";

// --- Constants ---

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEYLEN = 32; // 256 bits for AES-256
const PBKDF2_DIGEST = "sha512";
const SALT_FILENAME = ".vault-salt";
const INDEX_FILENAME = "vault-index.enc";

// --- Low-level crypto ---

/**
 * Derive a 256-bit key from a passphrase and salt using PBKDF2.
 */
export function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
}

/**
 * Encrypt data with AES-256-GCM.
 */
export function encrypt(
  data: Buffer,
  key: Buffer,
): { iv: Buffer; authTag: Buffer; encrypted: Buffer } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { iv, authTag, encrypted };
}

/**
 * Decrypt AES-256-GCM ciphertext.
 */
export function decrypt(
  encrypted: Buffer,
  key: Buffer,
  iv: Buffer,
  authTag: Buffer,
): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

// --- Salt management ---

async function getSaltPath(): Promise<string> {
  return join(getVaultDir(), SALT_FILENAME);
}

async function loadOrCreateSalt(): Promise<Buffer> {
  const saltPath = await getSaltPath();
  try {
    return await readFile(saltPath);
  } catch {
    const salt = randomBytes(32);
    await ensureDir(getVaultDir());
    await writeFile(saltPath, salt);
    return salt;
  }
}

async function loadSalt(): Promise<Buffer> {
  const saltPath = await getSaltPath();
  return readFile(saltPath);
}

// --- Index management ---

function getIndexPath(): string {
  return join(getVaultDir(), INDEX_FILENAME);
}

/**
 * Pack an encrypted payload into a single buffer: [iv(12)][authTag(16)][ciphertext(rest)].
 */
function packEncrypted(enc: { iv: Buffer; authTag: Buffer; encrypted: Buffer }): Buffer {
  return Buffer.concat([enc.iv, enc.authTag, enc.encrypted]);
}

/**
 * Unpack a buffer produced by `packEncrypted`.
 */
function unpackEncrypted(buf: Buffer): { iv: Buffer; authTag: Buffer; encrypted: Buffer } {
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  return { iv, authTag, encrypted };
}

async function readIndex(key: Buffer): Promise<VaultEntry[]> {
  const indexPath = getIndexPath();
  try {
    const raw = await readFile(indexPath);
    const { iv, authTag, encrypted } = unpackEncrypted(raw);
    const plaintext = decrypt(encrypted, key, iv, authTag);
    return JSON.parse(plaintext.toString("utf-8")) as VaultEntry[];
  } catch {
    return [];
  }
}

async function writeIndex(key: Buffer, entries: VaultEntry[]): Promise<void> {
  const indexPath = getIndexPath();
  const plaintext = Buffer.from(JSON.stringify(entries, null, 2), "utf-8");
  const enc = encrypt(plaintext, key);
  await writeFile(indexPath, packEncrypted(enc));
}

// --- Public API ---

/**
 * Initialize the vault: create the salt file and return the derived key.
 * Idempotent — safe to call when vault already exists.
 */
export async function initVault(passphrase: string): Promise<Buffer> {
  const salt = await loadOrCreateSalt();
  return deriveKey(passphrase, salt);
}

/**
 * Encrypt a file and add it to the vault.
 */
export async function addToVault(
  passphrase: string,
  filePath: string,
  label: string,
  tags: string[],
): Promise<VaultEntry> {
  const vaultDir = getVaultDir();
  await ensureDir(vaultDir);

  const salt = await loadOrCreateSalt();
  const key = deriveKey(passphrase, salt);

  const fileData = await readFile(filePath);
  const fileStat = await stat(filePath);
  const checksum = createHash("sha256").update(fileData).digest("hex");

  const id = randomUUID();
  const enc = encrypt(fileData, key);
  const encPath = join(vaultDir, `${id}.enc`);
  await writeFile(encPath, packEncrypted(enc));

  const entry: VaultEntry = {
    id,
    filename: label || basename(filePath),
    mimeType: guessMimeType(filePath),
    tags,
    linkedWorkflows: [],
    addedAt: new Date().toISOString(),
    sizeBytes: fileStat.size,
    checksum,
  };

  const entries = await readIndex(key);
  entries.push(entry);
  await writeIndex(key, entries);

  return entry;
}

/**
 * List all vault entries (requires passphrase to decrypt the index).
 */
export async function listVault(passphrase: string): Promise<VaultEntry[]> {
  const salt = await loadSalt();
  const key = deriveKey(passphrase, salt);
  return readIndex(key);
}

/**
 * Decrypt a vault entry to a file on disk.
 */
export async function getFromVault(
  passphrase: string,
  id: string,
  outputPath: string,
): Promise<void> {
  const vaultDir = getVaultDir();
  const salt = await loadSalt();
  const key = deriveKey(passphrase, salt);

  const encPath = join(vaultDir, `${id}.enc`);
  const raw = await readFile(encPath);
  const { iv, authTag, encrypted } = unpackEncrypted(raw);
  const plaintext = decrypt(encrypted, key, iv, authTag);

  await writeFile(outputPath, plaintext);
}

/**
 * Link a vault document to a workflow.
 */
export async function linkToWorkflow(
  passphrase: string,
  docId: string,
  workflowId: string,
): Promise<void> {
  const salt = await loadSalt();
  const key = deriveKey(passphrase, salt);

  const entries = await readIndex(key);
  const entry = entries.find((e) => e.id === docId);
  if (!entry) {
    throw new Error(`Vault entry not found: ${docId}`);
  }

  if (!entry.linkedWorkflows.includes(workflowId)) {
    entry.linkedWorkflows.push(workflowId);
  }

  await writeIndex(key, entries);
}

// --- Helpers ---

function guessMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    json: "application/json",
    txt: "text/plain",
    csv: "text/csv",
    xml: "application/xml",
    html: "text/html",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return mimeMap[ext ?? ""] ?? "application/octet-stream";
}
