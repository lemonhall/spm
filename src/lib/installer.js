import fs from "node:fs/promises";
import path from "node:path";
import { copyDir, ensureDir, readJsonFile } from "./fs.js";
import { extractTgzToDir } from "./tgz.js";
import { ensureSkillValid } from "./skillSpec.js";

export async function installTree({ projectSkillDir, registry, manifest, storeDir, skillsDir, lock }) {
  const rootInstallDir = path.join(skillsDir, manifest.skillName);
  await installOne({
    registry,
    projectSkillDir,
    installDir: rootInstallDir,
    packageId: manifest.name,
    rangeOrVersion: manifest.version,
    expectedSkillName: manifest.skillName,
    storeDir,
    lock,
    dependencies: manifest.dependencies ?? {},
    isRoot: true,
  });
  return { lock };
}

async function installOne({
  registry,
  projectSkillDir,
  installDir,
  packageId,
  rangeOrVersion,
  expectedSkillName,
  storeDir,
  lock,
  dependencies,
  isRoot,
}) {
  await ensureDir(path.dirname(installDir));

  const resolved = isRoot
    ? { packageId, version: rangeOrVersion, skillName: expectedSkillName, tarballPath: null }
    : await registry.resolve({ packageId, range: rangeOrVersion });

  const lockKey = `${resolved.packageId}@${resolved.version}`;
  lock.packages ??= {};
  lock.packages[lockKey] ??= { skillName: resolved.skillName, resolved: resolved.tarballPath ? `file:${resolved.tarballPath}` : "workspace", dependencies: {} };

  if (!isRoot) {
    const cachedDir = path.join(storeDir, safeKey(resolved.packageId), resolved.version);
    const extractedSkillDir = path.join(cachedDir, resolved.skillName);
    await ensureDir(cachedDir);

    if (!(await exists(extractedSkillDir))) {
      await extractTgzToDir({ tgzFile: resolved.tarballPath, outDir: cachedDir });
      await ensureSkillValid(extractedSkillDir, resolved.skillName);
    }

    if (!(await exists(installDir))) {
      await copyDir(extractedSkillDir, installDir);
    }
  } else {
    if (!(await exists(installDir))) {
      await copyDir(projectSkillDir, installDir);
    }
  }

  const depsDir = path.join(installDir, "deps");
  await ensureDir(depsDir);

  // Install dependencies from the installed package's spm.json if present; root uses provided deps.
  const installedManifest = isRoot
    ? { dependencies }
    : await tryReadJson(path.join(installDir, "spm.json"));

  const deps = installedManifest?.dependencies ?? {};
  lock.packages[lockKey].dependencies = deps;

  for (const [depPkgId, depRange] of Object.entries(deps)) {
    const depResolved = await registry.resolve({ packageId: depPkgId, range: depRange });
    const depInstallDir = path.join(depsDir, depResolved.skillName);
    await installOne({
      registry,
      parentSkillDir: installDir,
      installDir: depInstallDir,
      packageId: depPkgId,
      rangeOrVersion: depRange,
      expectedSkillName: depResolved.skillName,
      storeDir,
      lock,
      dependencies: {},
      isRoot: false,
    });
  }
}

function safeKey(packageId) {
  return packageId.replaceAll("/", "__").replaceAll("@", "@");
}

async function exists(p) {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function tryReadJson(p) {
  try {
    return await readJsonFile(p);
  } catch {
    return null;
  }
}
