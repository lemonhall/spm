import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { promisify } from "node:util";
import { withTempDir } from "./helpers/tmp.js";
import { encodeHeader, padToBlock } from "../src/lib/tarFormat.js";
import { extractTgzToDir } from "../src/lib/tgz.js";

const gzip = promisify(zlib.gzip);

test("tgz: prevents path traversal on extract", async () => {
  await withTempDir(async (dir) => {
    const header = encodeHeader({ name: "../evil.txt", typeflag: "0", size: 4, mode: 0o644, mtime: 0 });
    const data = Buffer.from("evil", "utf8");
    const pad = Buffer.alloc(padToBlock(data.length), 0);
    const tar = Buffer.concat([header, data, pad, Buffer.alloc(1024, 0)]);
    const tgz = await gzip(tar, { level: 9 });

    const tgzFile = path.join(dir, "bad.tgz");
    await fs.writeFile(tgzFile, tgz);

    const outDir = path.join(dir, "out");
    await fs.mkdir(outDir, { recursive: true });
    await assert.rejects(() => extractTgzToDir({ tgzFile, outDir }), /unsafe tar entry/i);
  });
});

