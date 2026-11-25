/* eslint-disable @typescript-eslint/no-require-imports -- a CommonJS preload for node -r */
// Building the Worker on Windows: OpenNext links traced packages with symlinks, which Windows only
// allows with Developer Mode or admin rights. Preloaded with `node -r`, this makes a failed symlink
// (EPERM) copy its target instead. It changes nothing on Linux or macOS, where symlinks succeed.
const fs = require("node:fs");
const path = require("node:path");
const { syncBuiltinESMExports } = require("node:module");

const original = fs.symlinkSync;
fs.symlinkSync = function symlinkSync(target, where, type) {
  try {
    return original.call(fs, target, where, type);
  } catch (err) {
    if (process.platform !== "win32" || (err && err.code !== "EPERM")) throw err;
    const from = path.resolve(path.dirname(String(where)), String(target));
    fs.cpSync(from, where, { recursive: true, dereference: true, force: true });
  }
};
syncBuiltinESMExports();
