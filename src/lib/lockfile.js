import fs from "node:fs/promises";
import { readJsonFile, writeJsonFile } from "./fs.js";

export async function loadLockfile(lockPath) {
  try {
    return await readJsonFile(lockPath);
  } catch {
    return null;
  }
}

export async function saveLockfile(lockPath, lock) {
  await writeJsonFile(lockPath, lock);
}

export async function lockHas(lock, key) {
  return Boolean(lock?.packages?.[key]);
}

export async function writeLockEntry(lock, key, entry) {
  lock.packages ??= {};
  lock.packages[key] = entry;
}

