import { runUiGate } from "../service/lib.mjs";

function readOption(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const result = await runUiGate({
  surface: readOption("--surface"),
  component_id: readOption("--component"),
  artifact_id: readOption("--artifact")
});

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
