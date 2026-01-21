const BLOCK_SIZE = 512;

export function encodeHeader({ name, mode, uid, gid, size, mtime, typeflag }) {
  const buf = Buffer.alloc(BLOCK_SIZE, 0);
  const { nameField, prefixField } = splitName(name);

  writeString(buf, 0, 100, nameField);
  writeOctal(buf, 100, 8, mode ?? 0o644);
  writeOctal(buf, 108, 8, uid ?? 0);
  writeOctal(buf, 116, 8, gid ?? 0);
  writeOctal(buf, 124, 12, size ?? 0);
  writeOctal(buf, 136, 12, mtime ?? Math.floor(Date.now() / 1000));
  writeString(buf, 148, 8, "        ");
  writeString(buf, 156, 1, typeflag ?? "0");
  writeString(buf, 257, 6, "ustar\0");
  writeString(buf, 263, 2, "00");
  writeString(buf, 345, 155, prefixField);

  const checksum = sumBytes(buf);
  writeOctal(buf, 148, 8, checksum, { withTrailingNull: true });
  return buf;
}

export function decodeHeader(block) {
  if (block.length !== BLOCK_SIZE) throw new Error("Invalid tar block size");
  if (block.every((b) => b === 0)) return null;

  const name = readString(block, 0, 100);
  const prefix = readString(block, 345, 155);
  const fullName = prefix ? `${prefix}/${name}` : name;
  const typeflag = readString(block, 156, 1) || "0";
  const size = readOctal(block, 124, 12);
  return { name: fullName, typeflag, size };
}

export function padToBlock(size) {
  const rem = size % BLOCK_SIZE;
  return rem === 0 ? 0 : BLOCK_SIZE - rem;
}

function splitName(fullName) {
  if (Buffer.byteLength(fullName) <= 100) return { nameField: fullName, prefixField: "" };
  const idx = fullName.lastIndexOf("/");
  if (idx <= 0) throw new Error(`Tar path too long: ${fullName}`);
  const prefix = fullName.slice(0, idx);
  const name = fullName.slice(idx + 1);
  if (Buffer.byteLength(name) > 100 || Buffer.byteLength(prefix) > 155) {
    throw new Error(`Tar path too long: ${fullName}`);
  }
  return { nameField: name, prefixField: prefix };
}

function writeString(buf, offset, length, value) {
  const b = Buffer.from(String(value ?? ""), "utf8");
  b.copy(buf, offset, 0, Math.min(length, b.length));
}

function writeOctal(buf, offset, length, value, { withTrailingNull } = {}) {
  const v = Math.max(0, Number(value ?? 0));
  const digits = v.toString(8);
  const padLen = Math.max(0, length - digits.length - 1);
  const s = "0".repeat(padLen) + digits + (withTrailingNull ? "\0" : " ");
  writeString(buf, offset, length, s);
}

function readString(buf, offset, length) {
  const slice = buf.subarray(offset, offset + length);
  const end = slice.indexOf(0);
  return (end === -1 ? slice : slice.subarray(0, end)).toString("utf8").trim();
}

function readOctal(buf, offset, length) {
  const s = readString(buf, offset, length).replace(/\0/g, "").trim();
  if (!s) return 0;
  return parseInt(s, 8);
}

function sumBytes(buf) {
  let sum = 0;
  for (const b of buf) sum += b;
  return sum;
}

