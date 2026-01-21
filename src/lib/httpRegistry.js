import { maxSatisfying } from "./semver.js";

export class HttpRegistry {
  constructor(baseUrl) {
    this.baseUrl = String(baseUrl).replace(/\/+$/, "");
  }

  async getIndex(packageId) {
    const url = `${this.baseUrl}/${encodePackageId(packageId)}`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    return await res.json();
  }

  async resolve({ packageId, range }) {
    const index = await this.getIndex(packageId);
    const versions = Object.keys(index.versions ?? {});
    const chosen =
      range === "latest"
        ? index["dist-tags"]?.latest ?? maxSatisfying(versions, "latest")
        : maxSatisfying(versions, range);
    if (!chosen) throw new Error(`No version satisfies ${packageId}@${range}`);

    const dist = index.versions[chosen].dist;
    const tarball = dist.tarball;
    const tarballUrl = tarball.startsWith("http") ? tarball : `${this.baseUrl}${tarball.startsWith("/") ? "" : "/"}${tarball}`;
    return {
      packageId,
      version: chosen,
      skillName: index.skillName,
      tarballUrl,
      integrity: dist.integrity ?? null,
      tarballPath: null,
    };
  }

  async fetchTarball(resolved, { destFile }) {
    const res = await fetch(resolved.tarballUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching tarball`);
    const buf = Buffer.from(await res.arrayBuffer());
    const fs = await import("node:fs/promises");
    await fs.writeFile(destFile, buf);
    return destFile;
  }
}

function encodePackageId(packageId) {
  return encodeURIComponent(packageId);
}

