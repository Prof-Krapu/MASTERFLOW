import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assessHandoffFreshness,
  assertPortableExportSafe,
  buildDesignPreflight,
  buildFeatureSummary,
  contextGuidance,
  formatResumeBrief,
  parseGitStatus,
  prepareSensitiveAction,
  evaluateUiArtifact,
  runUiGate,
  selectDesignRules,
  validateUiConformanceRegistry,
  validateRoundAuthorization
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

test("un handoff d'un ancien Round est ignoré", () => {
  const result = assessHandoffFreshness(
    "- Round ID : MASTERBUILD-V1\n- Commit : abc1234\n",
    {
      active_round: {
        round_id: "UI-SYSTEM-INTEGRATION-001"
      }
    },
    { sha: "def5678" }
  );
  assert.equal(result.stale, true);
  assert.match(result.reason, /Round différent/);
  assert.match(result.reason, /commit différent/);
});

test("un handoff aligné reste utilisable", () => {
  const result = assessHandoffFreshness(
    "- Round ID : UI-SYSTEM-INTEGRATION-001\n- Commit : abc1234\n",
    {
      active_round: {
        round_id: "UI-SYSTEM-INTEGRATION-001"
      }
    },
    { sha: "abc1234" }
  );
  assert.equal(result.stale, false);
});

test("le briefing de reprise recommande sans exécuter", () => {
  const brief = formatResumeBrief(
    {
      program: { title: "Construire MasterFlow" },
      last_completed_round: { title: "MASTERBUILD V1" },
      active_round: {
        round_id: "ROUND-2",
        title: "Raccorder l'UI",
        stage_index: 1,
        stage_label: "Orienter",
        primary_risk: "Brancher trop tôt."
      },
      next_moves: [
        {
          label: "Shell",
          reason: "Fondation commune.",
          recommended: true
        },
        {
          label: "Home",
          reason: "Dépend de la coque.",
          recommended: false
        }
      ]
    },
    { sha: "abc1234" },
    { stale: false }
  );
  assert.match(brief, /Je recommande : Shell/);
  assert.match(brief, /Dis « go recommandation »/);
  assert.match(brief, /Aucune tâche n'a été exécutée/);
});

test("le briefing de reprise ignore les alternatives terminées", () => {
  const brief = formatResumeBrief(
    {
      program: { title: "Construire MasterFlow" },
      last_completed_round: { title: "MASTERBUILD V2" },
      active_round: {
        round_id: "UI-SHELL-DOCK-001",
        title: "Shell Dock",
        stage_index: 4,
        stage_label: "Décider",
        recommended_next_action: "Décider la tranche Shell Dock"
      },
      next_moves: [
        { label: "Terminer MASTERBUILD V2", reason: "Déjà fait.", recommended: false, status: "completed" },
        { label: "Shell Dock", reason: "Round actif.", recommended: true, status: "in_progress" },
        { label: "Feature gap review", reason: "Plus tard.", recommended: false, status: "queued" }
      ]
    },
    { sha: "abc1234" },
    { stale: false }
  );
  assert.match(brief, /Je recommande : Shell Dock/);
  assert.doesNotMatch(brief, /Terminer MASTERBUILD V2/);
  assert.match(brief, /Feature gap review/);
});

test("le registre fonctionnel distingue les raccords manquants", () => {
  const summary = buildFeatureSummary([
    {
      product_state: "validated",
      backend_state: "verified",
      ui_state: "prototype",
      release_state: "main"
    },
    {
      product_state: "future",
      backend_state: "partial",
      ui_state: "absent",
      release_state: "unknown"
    }
  ]);
  assert.equal(summary.total, 2);
  assert.equal(summary.likely_missing, 1);
});

test("les règles design sont filtrées par surface et audience", () => {
  const rules = selectDesignRules(
    [
      { rule_id: "GLOBAL", applies_to: ["global"], audiences: ["all"] },
      { rule_id: "TEACH", applies_to: ["teaching"], audiences: ["teacher"] },
      { rule_id: "STUDENT", applies_to: ["teaching"], audiences: ["student"] }
    ],
    { surface: "teaching", audience: "teacher" }
  );
  assert.deepEqual(
    rules.map((rule) => rule.rule_id),
    ["GLOBAL", "TEACH"]
  );
});

test("un artefact UI complet peut être promu", () => {
  const artifact = {
    artifact_id: "component.test",
    artifact_type: "shared_component",
    surface_id: "test",
    component_id: "test-component",
    status: "conformant",
    rule_ids: ["DES-TEST"],
    required_states: ["ready"],
    lab_scenarios: ["test.ready"],
    required_evidence: ["component_lab", "malex_review"],
    evidence: [
      { kind: "component_lab", status: "passed" },
      { kind: "malex_review", status: "passed" }
    ],
    reviews: { malex: { status: "approved" }, vincent: null },
    blocking_reasons: []
  };
  const evaluation = evaluateUiArtifact(
    artifact,
    [{ rule_id: "DES-TEST" }],
    { required_page_states: [] }
  );
  assert.equal(evaluation.promotion_allowed, true);
  assert.deepEqual(evaluation.blocking_reasons, []);
});

test("le gate Project échoue tant que les preuves et validations manquent", async () => {
  const result = await runUiGate({ surface: "project" });
  assert.equal(result.ok, false);
  assert.match(result.blocking_reasons.join(" "), /preuve manquante/);
  assert.match(result.blocking_reasons.join(" "), /validation MALEX manquante/);
});

test("le Design Preflight expose Bible, preuves, blocages et promotion", async () => {
  const preflight = await buildDesignPreflight({
    surface: "project",
    artifact_type: "page",
    component_id: "adaptive-workspace-page.project",
    audience: "teacher",
    contributor: "malex",
    bible_version: "1.0.0"
  });
  assert.equal(preflight.artifact_id, "page.project");
  assert.equal(preflight.bible_version, "1.0.0");
  assert.equal(preflight.promotion_allowed, false);
  assert.ok(preflight.required_evidence.includes("component_lab"));
  assert.ok(preflight.blocking_reasons.length > 0);
});

test("le GO de Round couvre la draft PR mais pas le merge", () => {
  const authorization = validateRoundAuthorization({
    actor: "malex",
    scope: "build_test_commit_push_draft_pr"
  });
  assert.equal(authorization.allowed, true);
  assert.ok(authorization.excluded.includes("merge"));
  assert.equal(validateRoundAuthorization({ actor: "vincent" }).allowed, false);
});

test("l'export portable bloque les secrets évidents", () => {
  assert.equal(assertPortableExportSafe({ round: "safe" }), true);
  assert.throws(
    () => assertPortableExportSafe({ api_key: "sk-super-secret-value" }),
    /secret potentiel/
  );
});

test("tous les registres MASTERBUILD sont des JSON valides", async () => {
  const files = [
    "MASTERBUILD_STATE.json",
    "MASTERBUILD_FEATURE_REGISTRY.json",
    "MASTERBUILD_DESIGN_RULES.json",
    "MASTERBUILD_UI_CONFORMANCE.json",
    "MASTERBUILD_WORKBOARD.json",
    "MASTERBUILD_SOURCE_REGISTRY.json",
    "MASTERBUILD_PROFILE_AUDITS.json"
  ];
  for (const file of files) {
    const target = new URL(`../../../docs/masterbuild/${file}`, import.meta.url);
    const content = await readFile(target, "utf8");
    assert.doesNotThrow(() => JSON.parse(content));
  }
});

test("le registre UI est structurellement valide sans prétendre que les surfaces sont conformes", async () => {
  const [conformanceContent, designContent] = await Promise.all([
    readFile(new URL("../../../docs/masterbuild/MASTERBUILD_UI_CONFORMANCE.json", import.meta.url), "utf8"),
    readFile(new URL("../../../docs/masterbuild/MASTERBUILD_DESIGN_RULES.json", import.meta.url), "utf8")
  ]);
  const validation = validateUiConformanceRegistry(
    JSON.parse(conformanceContent),
    JSON.parse(designContent).rules
  );
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(validation.evaluations.some((item) => item.promotion_allowed), false);
});
