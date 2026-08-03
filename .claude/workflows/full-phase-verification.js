// Workflow: full-phase-verification
// Orchestrates lint, typecheck, tests, and build in the correct order.
// Run from the project root: node .claude/workflows/full-phase-verification.js

const { execSync } = require("child_process");

const steps = [
  { label: "Lint", cmd: "npm run lint" },
  { label: "Typecheck", cmd: "npm run typecheck" },
  { label: "Tests", cmd: "npm test" },
  { label: "Build", cmd: "npm run build" },
];

let failed = false;

for (const step of steps) {
  console.log(`\n=== ${step.label} ===`);
  try {
    execSync(step.cmd, { stdio: "inherit" });
    console.log(`✓ ${step.label} passed`);
  } catch {
    console.error(`✗ ${step.label} FAILED`);
    failed = true;
    break; // Stop on first failure — do not proceed to build if tests fail
  }
}

if (failed) {
  console.error("\nVerification FAILED. Fix the above errors before closing the task.");
  process.exit(1);
} else {
  console.log("\nAll automated verification checks passed.");
}
