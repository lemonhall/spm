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
