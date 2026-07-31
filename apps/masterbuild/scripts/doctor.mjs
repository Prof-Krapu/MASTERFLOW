import { doctor } from "../service/lib.mjs";

const report = await doctor();
console.log("MASTERBUILD · Diagnostic");
for (const check of report.checks) {
  const mark = check.ok ? "OK" : check.optional ? "INFO" : "À FAIRE";
  console.log(`${mark.padEnd(7)} ${check.label} — ${check.detail}`);
}
if (!report.ok) {
  process.exitCode = 1;
}
