import test from "node:test";
import assert from "node:assert/strict";
import {
  contextGuidance,
  parseGitStatus,
  prepareSensitiveAction
} from "./lib.mjs";

test("parseGitStatus lit la branche, la divergence et les fichiers", () => {
  const parsed = parseGitStatus(
    "## codex/test...origin/codex/test [ahead 2, behind 1]\n M file.ts\n?? docs/new.md"
  );
  assert.equal(parsed.branch, "codex/test");
  assert.equal(parsed.ahead, 2);
  assert.equal(parsed.behind, 1);
  assert.equal(parsed.files.length, 2);
  assert.equal(parsed.dirty, true);
});

test("contextGuidance applique les seuils MASTERBUILD", () => {
  assert.equal(contextGuidance(49).level, "continue");
  assert.equal(contextGuidance(50).level, "checkpoint");
  assert.equal(contextGuidance(70).level, "handoff");
});

test("les actions sensibles sont toujours prepare-only", () => {
  const action = prepareSensitiveAction("push", {
    branch: "codex/test",
    files: []
  });
  assert.equal(action.executable, false);
  assert.equal(action.validation_required, true);
  assert.match(action.command, /git push/);
});
