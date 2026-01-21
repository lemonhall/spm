import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir, writeJsonFile, readJsonFile } from "./fs.js";
import { maxSatisfying } from "./semver.js";

export class FileRegistry {
  constructor(rootDir) {
    this.rootDir = path.resolve(rootDir);
  }

  async publish({ manifest, tarballPath }) {
    const { scope, name } = splitPackageId(manifest.name);
    const pkgDir = path.join(this.rootDir, scope ?? "", name);
    const dashDir = path.join(pkgDir, "-");
    await ensureDir(dashDir);

    const fileName = `${name}-${manifest.version}.tgz`;
    const destTarball = path.join(dashDir, fileName);
    await fs.copyFile(tarballPath, destTarball);

    const indexPath = path.join(pkgDir, "index.json");
    const index = (await tryReadJson(indexPath)) ?? {
      name: manifest.name,
      skillName: manifest.skillName,
      "dist-tags": {},
      versions: {},
    };

    index.skillName = manifest.skillName;
    index.versions[manifest.version] = {
      dist: { tarball: `file:${destTarball}` },
    };
    index["dist-tags"].latest = manifest.version;
    await writeJsonFile(indexPath, index);
  }

  async resolve({ packageId, range }) {
    const { scope, name } = splitPackageId(packageId);
    const pkgDir = path.join(this.rootDir, scope ?? "", name);
    const indexPath = path.join(pkgDir, "index.json");
    const index = await readJsonFile(indexPath);

    const versions = Object.keys(index.versions ?? {});
    const chosen =
      range === "latest"
        ? index["dist-tags"]?.latest ?? maxSatisfying(versions, "latest")
        : maxSatisfying(versions, range);
    if (!chosen) throw new Error(`No version satisfies ${packageId}@${range}`);

    const tarball = index.versions[chosen].dist.tarball;
    if (!tarball?.startsWith("file:")) throw new Error("Only file: tarballs supported in MVP");
    return {
      packageId,
      version: chosen,
      skillName: index.skillName,
      tarballPath: tarball.slice("file:".length),
    };
  }
}

function splitPackageId(packageId) {
  if (packageId.startsWith("@")) {
    const m = packageId.match(/^@([^/]+)\/(.+)$/);
    if (!m) throw new Error(`Invalid package id: ${packageId}`);
    return { scope: `@${m[1]}`, name: m[2] };
  }
  return { scope: null, name: packageId };
}

async function tryReadJson(p) {
  try {
    return await readJsonFile(p);
  } catch {
    return null;
  }
}
