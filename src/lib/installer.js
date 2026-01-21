import fs from "node:fs/promises";
import path from "node:path";
import { copyDir, ensureDir, readJsonFile } from "./fs.js";
import { extractTgzToDir } from "./tgz.js";
import { ensureSkillValid } from "./skillSpec.js";
import { parseIntegritySha256, sha256File } from "./integrity.js";

export async function installTree({ projectSkillDir, registry, manifest, storeDir, skillsDir, lock, useLock = true }) {
  const rootInstallDir = path.join(skillsDir, manifest.skillName);
  const rootKey = `${manifest.name}@${manifest.version}`;
  lock.packages ??= {};
  lock.packages[rootKey] ??= {
    name: manifest.name,
    version: manifest.version,
    skillName: manifest.skillName,
    resolved: "workspace",
    dependencies: {},
  };

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
    useLock,
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
  useLock,
}) {
  await ensureDir(path.dirname(installDir));

  const resolved = isRoot
    ? { packageId, version: rangeOrVersion, skillName: expectedSkillName, tarballPath: null, integrity: null }
    : await registry.resolve({ packageId, range: rangeOrVersion });

  const lockKey = `${resolved.packageId}@${resolved.version}`;
  lock.packages ??= {};
  lock.packages[lockKey] ??= {
    name: resolved.packageId,
    version: resolved.version,
    skillName: resolved.skillName,
    resolved: resolved.tarballPath ? `file:${resolved.tarballPath}` : "workspace",
    integrity: resolved.integrity ?? null,
    dependencies: {},
  };

  if (await exists(installDir)) {
    const existing = await tryReadJson(path.join(installDir, "spm.json"));
    if (existing?.name && existing?.version) {
      if (existing.name !== resolved.packageId || existing.version !== resolved.version) {
        throw new Error(
          `Install conflict at ${installDir}: already has ${existing.name}@${existing.version}, wanted ${resolved.packageId}@${resolved.version}`,
        );
      }
    } else if (!isRoot) {
      throw new Error(`Install conflict at ${installDir}: directory exists but missing spm.json`);
    }
  }

  if (!isRoot) {
    const integrityKey = resolved.integrity ? parseIntegritySha256(resolved.integrity) : resolved.version;
    const cachedDir = path.join(storeDir, safeKey(resolved.packageId), resolved.version, integrityKey);
    const extractedSkillDir = path.join(cachedDir, resolved.skillName);
    await ensureDir(cachedDir);

    if (!(await exists(extractedSkillDir))) {
      const tarballPath = await ensureTarballLocal(registry, resolved, cachedDir);
      if (resolved.integrity) {
        const want = parseIntegritySha256(resolved.integrity);
        const got = await sha256File(tarballPath);
        if (got !== want) throw new Error(`Integrity mismatch for ${resolved.packageId}@${resolved.version}`);
      }
      await extractTgzToDir({ tgzFile: tarballPath, outDir: cachedDir });
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

  const pinned = useLock ? (lock.packages[lockKey]?.dependencies ?? null) : null;
  const installedManifest = isRoot ? null : await tryReadJson(path.join(installDir, "spm.json"));
  const declared = isRoot ? dependencies : (installedManifest?.dependencies ?? {});

  const depSpecs = pinned && Object.keys(pinned).length
    ? Object.entries(pinned).map(([depPkgId, version]) => ({ depPkgId, want: version, pinned: true }))
    : Object.entries(declared).map(([depPkgId, range]) => ({ depPkgId, want: range, pinned: false }));

  const newPins = {};
  for (const { depPkgId, want, pinned: isPinned } of depSpecs) {
    const depResolved = await registry.resolve({ packageId: depPkgId, range: want });
    newPins[depPkgId] = depResolved.version;
    if (isPinned && depResolved.version !== want) {
      throw new Error(`Lockfile mismatch for ${depPkgId}: pinned ${want} but resolved ${depResolved.version}`);
    }

    const depInstallDir = path.join(depsDir, depResolved.skillName);
    await installOne({
      registry,
      projectSkillDir,
      installDir: depInstallDir,
      packageId: depPkgId,
      rangeOrVersion: depResolved.version,
      expectedSkillName: depResolved.skillName,
      storeDir,
      lock,
      dependencies: {},
      isRoot: false,
      useLock,
    });
  }
  lock.packages[lockKey].dependencies = newPins;
}

async function ensureTarballLocal(registry, resolved, cacheDir) {
  if (resolved.tarballPath) return resolved.tarballPath;
  const tmpDir = path.join(cacheDir, "_tarballs");
  await ensureDir(tmpDir);
  const destFile = path.join(tmpDir, `${safeKey(resolved.packageId)}-${resolved.version}.tgz`);
  return await registry.fetchTarball(resolved, { destFile });
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
