import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const output = mkdtempSync(join(tmpdir(), "hsn-history-"));
try {
  execFileSync(process.execPath, [require.resolve("typescript/bin/tsc"),
    "src/lib/history.ts", "src/lib/history.test.ts", "--outDir", output,
    "--module", "commonjs", "--target", "es2022", "--esModuleInterop", "--skipLibCheck",
  ], { stdio: "inherit" });
  execFileSync(process.execPath, ["--test", join(output, "history.test.js")], { stdio: "inherit" });
} catch (error) {
  process.exitCode = error.status || 1;
} finally {
  rmSync(output, { recursive: true, force: true });
}
