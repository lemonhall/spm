export function formatLockTree(lock) {
  const rootKey = `${lock?.root?.name}@${lock?.root?.version}`;
  if (!lock?.packages?.[rootKey]) return "No root entry in lockfile\n";
  const lines = [];
  const seen = new Set();

  walk(rootKey, 0);
  return lines.join("\n") + "\n";

  function walk(key, depth) {
    if (seen.has(key)) {
      lines.push(`${"  ".repeat(depth)}- ${key} (cycle)`);
      return;
    }
    seen.add(key);

    lines.push(`${"  ".repeat(depth)}- ${key}`);
    const entry = lock.packages[key];
    const deps = entry?.dependencies ?? {};
    const depKeys = Object.keys(deps).sort();
    for (const depPkgId of depKeys) {
      const depVersion = deps[depPkgId];
      const childKey = `${depPkgId}@${depVersion}`;
      walk(childKey, depth + 1);
    }
  }
}

