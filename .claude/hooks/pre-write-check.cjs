const fs = require("fs");
const path = require("path");

let input;
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.stderr.write("Unable to validate file edit input.");
  process.exit(2);
}

const target = input?.tool_input?.file_path ?? input?.tool_input?.path ?? "";
const normalized = path.resolve(target).replaceAll("\\", "/").toLowerCase();
const blocked = [/\/\.env(?:\.[^/]*)?$/, /\/\.claude\/settings\.local\.json$/];

if (!target || blocked.some((pattern) => pattern.test(normalized))) {
  process.stderr.write("Editing secret-bearing or personal configuration files is blocked.");
  process.exit(2);
}
