import { createTgzFromDir, extractTgzToDir } from "./tgz.js";

export async function packTgz({ cwd, dirName, outFile }) {
  const path = await import("node:path");
  await createTgzFromDir({
    dirPath: path.join(cwd, dirName),
    outFile,
    rootName: dirName,
  });
}

export async function extractTgz({ tgzFile, outDir }) {
  await extractTgzToDir({ tgzFile, outDir });
}
