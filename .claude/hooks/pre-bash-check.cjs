const fs = require("fs");

let input;
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.stderr.write("Unable to validate Bash command input.");
  process.exit(2);
}

const command = input?.tool_input?.command ?? "";
const blocked = [
  { pattern: /(?:^|\s)(?:rm\s+-rf|git\s+reset\s+--hard|git\s+push\s+--force)(?:\s|$)/i, reason: "Destructive command blocked by project policy." },
  { pattern: /(?:npm|pnpm|yarn|bun)\s+(?:install|add)[^\r\n]*(?:next-auth|authjs|passport|express-session|pinecone|weaviate|chromadb|qdrant|hubspot|salesforce)/i, reason: "Out-of-scope dependency blocked by project policy." },
  { pattern: /git\s+add[^\r\n]*(?:\.env(?:\.|\s|$)|settings\.local\.json)/i, reason: "Secret-bearing or local configuration files must not be staged." },
];

const violation = blocked.find(({ pattern }) => pattern.test(command));
if (violation) {
  process.stderr.write(violation.reason);
  process.exit(2);
}
