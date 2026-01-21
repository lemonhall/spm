import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";
import { decodeHeader, encodeHeader, padToBlock } from "./tarFormat.js";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export async function createTgzFromDir({ dirPath, outFile, rootName }) {
  const chunks = [];
  const root = path.resolve(dirPath);
  const entries = await walk(root);

  const dirs = entries.filter((e) => e.type === "dir").sort((a, b) => a.rel.localeCompare(b.rel));
  const files = entries.filter((e) => e.type === "file").sort((a, b) => a.rel.localeCompare(b.rel));

  for (const d of dirs) {
    const name = ensureSlash(`${rootName}/${d.rel}`);
    chunks.push(encodeHeader({ name, typeflag: "5", size: 0, mode: 0o755 }));
  }

  for (const f of files) {
    const name = `${rootName}/${f.rel}`;
    const data = await fs.readFile(f.abs);
    chunks.push(encodeHeader({ name, typeflag: "0", size: data.length, mode: 0o644 }));
    chunks.push(data);
    const pad = padToBlock(data.length);
    if (pad) chunks.push(Buffer.alloc(pad, 0));
  }

  chunks.push(Buffer.alloc(1024, 0));
  const tar = Buffer.concat(chunks);
  const tgz = await gzip(tar, { level: 9 });
  await fs.writeFile(outFile, tgz);
}

export async function extractTgzToDir({ tgzFile, outDir }) {
  const tgz = await fs.readFile(tgzFile);
  const tar = await gunzip(tgz);

  let offset = 0;
  while (offset + 512 <= tar.length) {
    const headerBlock = tar.subarray(offset, offset + 512);
    const header = decodeHeader(headerBlock);
    if (!header) break;
    offset += 512;

    const safePath = safeJoin(outDir, header.name);
    if (header.typeflag === "5") {
      await fs.mkdir(safePath, { recursive: true });
      continue;
    }

    if (header.typeflag !== "0") throw new Error(`Unsupported tar entry type: ${header.typeflag}`);
    const content = tar.subarray(offset, offset + header.size);
    offset += header.size + padToBlock(header.size);
    await fs.mkdir(path.dirname(safePath), { recursive: true });
    await fs.writeFile(safePath, content);
  }
}

async function walk(root) {
  const out = [];
  await walkInto(root, "");
  return out;

  async function walkInto(abs, rel) {
    const entries = await fs.readdir(abs, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === ".spm") continue;
      const childAbs = path.join(abs, e.name);
      const childRel = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        out.push({ type: "dir", abs: childAbs, rel: childRel });
        await walkInto(childAbs, childRel);
      } else if (e.isFile()) {
        out.push({ type: "file", abs: childAbs, rel: childRel });
      }
    }
  }
}

function ensureSlash(p) {
  return p.endsWith("/") ? p : `${p}/`;
}

function safeJoin(baseDir, entryName) {
  const normalized = entryName.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error(`Unsafe tar entry path: ${entryName}`);
  }
  const dest = path.resolve(baseDir, normalized);
  const base = path.resolve(baseDir);
  if (!dest.startsWith(base + path.sep) && dest !== base) {
    throw new Error(`Unsafe tar entry path: ${entryName}`);
  }
  return dest;
}

