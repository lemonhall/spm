import crypto from "node:crypto";
import fs from "node:fs/promises";

export async function sha256File(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function formatIntegritySha256(hex) {
  return `sha256-${hex}`;
}

export function parseIntegritySha256(integrity) {
  const m = String(integrity ?? "").match(/^sha256-([0-9a-f]{64})$/i);
  if (!m) throw new Error(`Unsupported integrity: ${integrity}`);
  return m[1].toLowerCase();
}

