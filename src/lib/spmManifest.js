import path from "node:path";
import { readJsonFile, writeJsonFile } from "./fs.js";

export async function loadSpmManifest(dir) {
  const manifestPath = path.join(dir, "spm.json");
  const manifest = await readJsonFile(manifestPath);
  validateManifest(manifest);
  return manifest;
}

export async function saveSpmManifest(filePath, manifest) {
  validateManifest(manifest);
  await writeJsonFile(filePath, manifest);
}

function validateManifest(m) {
  if (!m || typeof m !== "object") throw new Error("Invalid spm.json");
  if (!m.name || typeof m.name !== "string") throw new Error("spm.json: name is required");
  if (!m.version || typeof m.version !== "string") throw new Error("spm.json: version is required");
  if (!m.skillName || typeof m.skillName !== "string") throw new Error("spm.json: skillName is required");
  if (!m.skill || typeof m.skill !== "string") throw new Error("spm.json: skill is required");
  if (m.dependencies && typeof m.dependencies !== "object") throw new Error("spm.json: dependencies must be an object");
}

