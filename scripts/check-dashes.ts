/**
 * Fails when an en dash or an em dash appears in a text file of the repo: copy, code
 * comments, translations, SQL, docs. Use a comma, a colon, a period, parentheses, or "to".
 *
 *   npm run check:dashes
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/** Built from code points so this file holds neither character. */
const DASHES: Record<string, string> = {
  [String.fromCharCode(0x2013)]: "en dash",
  [String.fromCharCode(0x2014)]: "em dash",
};

const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".css", ".md", ".sql", ".yml", ".yaml", ".html", ".txt"]);

function trackedFiles(): string[] {
  try {
    const out = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" });
    return out.split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

let total = 0;
for (const file of trackedFiles()) {
  const base = path.basename(file);
  if (base === "package-lock.json" || !(TEXT_EXTENSIONS.has(path.extname(base)) || base === ".env.example")) continue;
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const [dash, name] of Object.entries(DASHES)) {
      const column = line.indexOf(dash);
      if (column !== -1) {
        total++;
        console.error(`${file}:${index + 1}:${column + 1}  ${name}  ${line.trim().slice(0, 100)}`);
      }
    }
  });
}

if (total > 0) {
  console.error(`\n${total} dash character(s) found. Replace them with a comma, colon, period, parentheses or "to".`);
  process.exit(1);
}
console.log("check:dashes ok, no en or em dashes.");
