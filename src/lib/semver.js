export function parseVersion(v) {
  const m = String(v).trim().match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) throw new Error(`Invalid version: ${v}`);
  return { major: +m[1], minor: +m[2], patch: +m[3], raw: `${+m[1]}.${+m[2]}.${+m[3]}` };
}

export function compareVersions(a, b) {
  const av = typeof a === "string" ? parseVersion(a) : a;
  const bv = typeof b === "string" ? parseVersion(b) : b;
  if (av.major !== bv.major) return av.major - bv.major;
  if (av.minor !== bv.minor) return av.minor - bv.minor;
  return av.patch - bv.patch;
}

export function satisfies(version, range) {
  if (!range || range === "latest" || range === "*") return true;
  const v = parseVersion(version);
  const r = String(range).trim();

  if (/^\d+\.\d+\.\d+$/.test(r)) return compareVersions(v, parseVersion(r)) === 0;
  if (r.startsWith("^")) return inCaretRange(v, parseVersion(r.slice(1)));
  if (r.startsWith("~")) return inTildeRange(v, parseVersion(r.slice(1)));

  // Very small subset of comparator ranges: ">=x.y.z <a.b.c"
  const parts = r.split(/\s+/).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(>=|>|<=|<)(\d+\.\d+\.\d+)$/);
    if (!m) throw new Error(`Unsupported range: ${range}`);
    const op = m[1];
    const bound = parseVersion(m[2]);
    const cmp = compareVersions(v, bound);
    if (op === ">=" && cmp < 0) return false;
    if (op === ">" && cmp <= 0) return false;
    if (op === "<=" && cmp > 0) return false;
    if (op === "<" && cmp >= 0) return false;
  }
  return true;
}

export function maxSatisfying(versions, range) {
  const list = [...versions].sort((a, b) => compareVersions(a, b));
  let best = null;
  for (const v of list) if (satisfies(v, range)) best = v;
  return best;
}

function inCaretRange(v, base) {
  if (base.major > 0) {
    return v.major === base.major && compareVersions(v, base) >= 0;
  }
  if (base.minor > 0) {
    return v.major === 0 && v.minor === base.minor && compareVersions(v, base) >= 0;
  }
  return v.major === 0 && v.minor === 0 && v.patch === base.patch;
}

function inTildeRange(v, base) {
  return v.major === base.major && v.minor === base.minor && compareVersions(v, base) >= 0;
}
