import { execFile } from "node:child_process";
import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const serviceDir = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = path.resolve(serviceDir, "../../..");
export const STATE_PATH = path.join(REPO_ROOT, "docs/masterbuild/MASTERBUILD_STATE.json");
export const LOCAL_DIR = path.join(REPO_ROOT, ".masterbuild/local");
export const PROFILE_PATH = path.join(LOCAL_DIR, "profile.json");
export const HANDOFF_PATH = path.join(LOCAL_DIR, "HANDOFF_CURRENT.md");
export const PROFILE_AUDITS_PATH = path.join(
  REPO_ROOT,
  "docs/masterbuild/MASTERBUILD_PROFILE_AUDITS.json"
);
export const RECAPS_PATH = path.join(REPO_ROOT, "docs/masterbuild/MASTERBUILD_RECAPS.json");
export const LEARNING_PATH = path.join(
  REPO_ROOT,
  "docs/masterbuild/MASTERBUILD_LEARNING_LOG.json"
);
export const OPENCODE_INBOX_PATH = path.join(REPO_ROOT, ".opencode/INBOX.md");
export const FEATURE_REGISTRY_PATH = path.join(
  REPO_ROOT,
  "docs/masterbuild/MASTERBUILD_FEATURE_REGISTRY.json"
);
export const DESIGN_RULES_PATH = path.join(
  REPO_ROOT,
  "docs/masterbuild/MASTERBUILD_DESIGN_RULES.json"
);
export const UI_BIBLE_PATH = path.join(REPO_ROOT, "docs/ui/MASTERFLOW_UI_BIBLE_V1.md");
export const UI_CONFORMANCE_PATH = path.join(
  REPO_ROOT,
  "docs/masterbuild/MASTERBUILD_UI_CONFORMANCE.json"
);
export const WORKBOARD_PATH = path.join(
  REPO_ROOT,
  "docs/masterbuild/MASTERBUILD_WORKBOARD.json"
);
export const SOURCE_REGISTRY_PATH = path.join(
  REPO_ROOT,
  "docs/masterbuild/MASTERBUILD_SOURCE_REGISTRY.json"
);
export const EXPORT_DIR = path.join(REPO_ROOT, ".masterbuild/exports");

export const STAGE_LABELS = [
  "Orienter",
  "Cadrer",
  "Auditer",
  "Décider",
  "Construire",
  "Vérifier",
  "Publier",
  "Clôturer"
];

export async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(targetPath, fallback = null) {
  try {
    return JSON.parse(await readFile(targetPath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(targetPath, value) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  const temporaryPath = `${targetPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporaryPath, targetPath);
}

async function runGit(args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: REPO_ROOT,
    timeout: 8000,
    maxBuffer: 2 * 1024 * 1024
  });
  return stdout.trimEnd();
}

export function parseGitStatus(output) {
  const lines = output.split("\n").filter(Boolean);
  const header = lines.shift() ?? "## inconnu";
  const branchMatch = header.match(/^## ([^. ]+)(?:\.\.\.([^ ]+))?(?: \[(.+)\])?$/);
  const relation = branchMatch?.[3] ?? "";
  const ahead = Number(relation.match(/ahead (\d+)/)?.[1] ?? 0);
  const behind = Number(relation.match(/behind (\d+)/)?.[1] ?? 0);
  const files = lines.map((line) => ({
    status: line.slice(0, 2),
    path: line.slice(3).replace(/^.* -> /, "")
  }));

  return {
    branch: branchMatch?.[1] ?? "inconnu",
    upstream: branchMatch?.[2] ?? null,
    ahead,
    behind,
    dirty: files.length > 0,
    files
  };
}

export async function collectGitStatus() {
  try {
    const status = parseGitStatus(await runGit(["status", "--porcelain=v1", "--branch"]));
    const sha = await runGit(["rev-parse", "HEAD"]);
    const remote = await runGit(["remote", "get-url", "origin"]).catch(() => "non configuré");
    return { ...status, sha, remote, available: true };
  } catch (error) {
    return {
      available: false,
      branch: "inconnu",
      upstream: null,
      ahead: 0,
      behind: 0,
      dirty: false,
      files: [],
      sha: null,
      remote: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function contextGuidance(percent) {
  if (percent >= 70) {
    return {
      level: "handoff",
      label: "Préparer une reprise",
      message: "Le contexte devient lourd. Créez un handoff puis reprenez dans un nouveau thread."
    };
  }
  if (percent >= 50) {
    return {
      level: "checkpoint",
      label: "Faire un checkpoint",
      message: "Conservez l’objectif, les décisions, les fichiers et les tests avant de continuer."
    };
  }
  return {
    level: "continue",
    label: "Continuer",
    message: "Le contexte reste confortable. Continuez la vague en cours."
  };
}

export async function readState() {
  const state = await readJson(STATE_PATH);
  if (!state) {
    throw new Error("État MASTERBUILD introuvable ou invalide.");
  }
  return state;
}

export async function readLocalProfile() {
  return readJson(PROFILE_PATH);
}

export function buildFeatureSummary(features) {
  const countBy = (field, values) =>
    Object.fromEntries(values.map((value) => [value, features.filter((item) => item[field] === value).length]));
  return {
    total: features.length,
    product: countBy("product_state", ["candidate", "validated", "future", "rejected"]),
    backend: countBy("backend_state", ["absent", "documented", "partial", "ready", "verified"]),
    ui: countBy("ui_state", ["absent", "lab", "prototype", "connected", "verified"]),
    release: countBy("release_state", ["local", "branch", "draft_pr", "main", "live", "unknown"]),
    likely_missing: features.filter(
      (feature) =>
        ["ready", "verified"].includes(feature.backend_state) &&
        ["absent", "lab", "prototype"].includes(feature.ui_state)
    ).length
  };
}

export function selectDesignRules(rules, input = {}) {
  const surface = String(input.surface ?? "global").toLowerCase();
  const audience = String(input.audience ?? "all").toLowerCase();
  return rules.filter((rule) => {
    const surfaces = (rule.applies_to ?? []).map((value) => value.toLowerCase());
    const audiences = (rule.audiences ?? []).map((value) => value.toLowerCase());
    return (
      (surfaces.includes("global") || surfaces.includes(surface)) &&
      (audiences.includes("all") || audiences.includes(audience) || audience === "contributors")
    );
  });
}

export function assertPortableExportSafe(value) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  const forbidden = [
    /gho_[A-Za-z0-9]+/,
    /github_pat_[A-Za-z0-9_]+/,
    /sk-[A-Za-z0-9_-]{12,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /"password"\s*:\s*"[^"]+"/i,
    /"api_key"\s*:\s*"[^"]+"/i
  ];
  if (forbidden.some((pattern) => pattern.test(serialized))) {
    throw new Error("Export MASTERBUILD bloqué : secret potentiel détecté.");
  }
  return true;
}

export function validateRoundAuthorization(input) {
  const scope = input.scope ?? "build_test_commit_push_draft_pr";
  if (input.actor !== "malex") {
    return { allowed: false, reason: "Seul MALEX autorise un Round jusqu'à la draft PR." };
  }
  if (scope !== "build_test_commit_push_draft_pr") {
    return { allowed: false, reason: "Scope d'autorisation non reconnu." };
  }
  return {
    allowed: true,
    scope,
    excluded: ["merge", "deploy", "migration", "provider", "spend", "delete", "canon_scope_change"]
  };
}

export function currentRound(state) {
  return state.active_round ?? state.active_goal;
}

export function assessHandoffFreshness(content, state, git) {
  if (!content) {
    return {
      exists: false,
      stale: false,
      reason: "Aucun handoff local. L'état partagé reste la référence.",
      handoff_sha: null,
      current_sha: git.sha ?? null,
      handoff_round_id: null,
      current_round_id: currentRound(state).round_id ?? currentRound(state).goal_id
    };
  }

  const handoffSha = content.match(/^- Commit : ([0-9a-f]+|inconnu)$/m)?.[1] ?? null;
  const handoffRoundId = content.match(/^- Round ID : (.+)$/m)?.[1]?.trim() ?? null;
  const round = currentRound(state);
  const currentRoundId = round.round_id ?? round.goal_id;
  const reasons = [];

  if (!handoffRoundId) reasons.push("format antérieur sans Round ID");
  else if (handoffRoundId !== currentRoundId) reasons.push("Round différent");
  if (git.sha && handoffSha && handoffSha !== git.sha) reasons.push("commit différent");

  return {
    exists: true,
    stale: reasons.length > 0,
    reason:
      reasons.length > 0
        ? `Handoff ignoré : ${reasons.join(", ")}.`
        : "Handoff aligné avec le Round et le commit courants.",
    handoff_sha: handoffSha,
    current_sha: git.sha ?? null,
    handoff_round_id: handoffRoundId,
    current_round_id: currentRoundId
  };
}

export async function collectHandoffStatus(state, git) {
  const content = await readFile(HANDOFF_PATH, "utf8").catch(() => null);
  return assessHandoffFreshness(content, state, git);
}

export async function buildDesignPreflight(input = {}) {
  const [design, features, profiles, conformance] = await Promise.all([
    readJson(DESIGN_RULES_PATH, { rules: [] }),
    readJson(FEATURE_REGISTRY_PATH, { features: [] }),
    readJson(PROFILE_AUDITS_PATH, { profiles: [] }),
    readJson(UI_CONFORMANCE_PATH, { artifacts: [] })
  ]);
  const surface = String(input.surface ?? "global").toLowerCase();
  const audience = String(input.audience ?? "all").toLowerCase();
  const contributor = input.contributor === "vincent" ? "vincent" : "malex";
  const artifactType = String(input.artifact_type ?? "page").toLowerCase();
  const componentId = input.component_id ? String(input.component_id).toLowerCase() : null;
  const requestedBibleVersion = String(input.bible_version ?? design.bible_version ?? "unknown");
  const feature = features.features.find(
    (item) =>
      item.feature_id === input.feature_id ||
      item.label.toLowerCase().includes(surface.replaceAll("-", " "))
  );
  const rules = selectDesignRules(design.rules, { surface, audience });
  const profile = profiles.profiles.find((item) => item.profile_id === contributor);
  const artifact = conformance.artifacts.find(
    (item) =>
      item.artifact_id === input.artifact_id ||
      (componentId && item.component_id?.toLowerCase() === componentId) ||
      (item.surface_id === surface && item.artifact_type === artifactType)
  );
  const applicableRules = [
    ...rules,
    ...design.rules.filter((rule) => artifact?.rule_ids?.includes(rule.rule_id))
  ].filter(
    (rule, index, collection) =>
      collection.findIndex((candidate) => candidate.rule_id === rule.rule_id) === index
  );
  const evaluation = artifact
    ? evaluateUiArtifact(artifact, design.rules, conformance)
    : {
        promotion_allowed: false,
        blocking_reasons: [
          `Aucune entrée de conformité pour ${artifactType} ${componentId ?? surface}.`
        ],
        missing_evidence: [],
        unknown_rule_ids: []
      };
  const versionMismatch = requestedBibleVersion !== conformance.bible_version;
  const blockingReasons = [
    ...evaluation.blocking_reasons,
    ...(versionMismatch
      ? [
          `Version Bible demandée ${requestedBibleVersion}, version active ${conformance.bible_version}.`
        ]
      : [])
  ];

  return {
    generated_at: new Date().toISOString(),
    surface,
    audience,
    contributor,
    artifact_type: artifactType,
    artifact_id: artifact?.artifact_id ?? null,
    component_id: componentId ?? artifact?.component_id ?? null,
    bible_version: conformance.bible_version ?? design.bible_version ?? "unknown",
    feature_id: feature?.feature_id ?? null,
    context: input.context ?? "Round actif MASTERBUILD",
    existing_components: input.existing_components ?? [
      "Component Lab",
      "Prototype UI",
      "Registre de composants partagé"
    ],
    applicable_rules: applicableRules.map((rule) => ({
      rule_id: rule.rule_id,
      title: rule.title,
      must: rule.must,
      avoid: rule.avoid,
      checks: rule.checks
    })),
    locked_decisions: [
      ...(feature?.product_state === "validated"
        ? [`La fonctionnalité ${feature.label} est validée au niveau produit.`]
        : []),
      ...applicableRules.flatMap((rule) => rule.must).slice(0, 8)
    ],
    free_zones: [
      "Composition locale dans les limites du composant existant",
      "Microcopy et rythme proposés puis revus",
      "Expérimentation dans le Lab avant promotion"
    ],
    required_states: artifact?.required_states ?? conformance.required_page_states ?? [],
    required_evidence: artifact?.required_evidence ?? [],
    lab_scenarios: artifact?.lab_scenarios ?? [],
    blocking_reasons: blockingReasons,
    promotion_allowed: evaluation.promotion_allowed && !versionMismatch,
    responsive: "Desktop full power ; mobile conversationnel et panneaux plein écran.",
    accessibility: applicableRules
      .filter((rule) => rule.checks.some((check) => ["axe_targeted", "keyboard_smoke", "contrast"].includes(check)))
      .map((rule) => rule.title),
    backend: feature
      ? {
          state: feature.backend_state,
          dependencies: feature.dependencies,
          missing: feature.missing
        }
      : { state: "unknown", dependencies: [], missing: ["Feature non reliée au registre"] },
    guidance: profile?.domain_guidance ?? {},
    validations: {
      malex: "Expérience, navigation, DA et comportement",
      vincent: "Contrats, permissions, données et runtime"
    }
  };
}

export function evaluateUiArtifact(artifact, designRules = [], conformance = {}) {
  const knownRuleIds = new Set(designRules.map((rule) => rule.rule_id));
  const unknownRuleIds = (artifact.rule_ids ?? []).filter((ruleId) => !knownRuleIds.has(ruleId));
  const passedEvidence = new Set(
    (artifact.evidence ?? [])
      .filter((item) => item.status === "passed")
      .map((item) => item.kind)
  );
  const missingEvidence = (artifact.required_evidence ?? []).filter(
    (kind) => !passedEvidence.has(kind)
  );
  const missingStates =
    artifact.artifact_type === "page"
      ? (conformance.required_page_states ?? []).filter(
          (state) => !(artifact.required_states ?? []).includes(state)
        )
      : [];
  const blockingReasons = [
    ...(!artifact.artifact_id ? ["artifact_id manquant"] : []),
    ...(!artifact.artifact_type ? ["artifact_type manquant"] : []),
    ...(!artifact.surface_id ? ["surface_id manquant"] : []),
    ...(!artifact.component_id ? ["component_id manquant"] : []),
    ...(!(artifact.rule_ids ?? []).length ? ["aucune règle applicable"] : []),
    ...unknownRuleIds.map((ruleId) => `règle inconnue ${ruleId}`),
    ...missingStates.map((state) => `état requis manquant ${state}`),
    ...(!(artifact.lab_scenarios ?? []).length ? ["aucun scénario Lab"] : []),
    ...missingEvidence.map((kind) => `preuve manquante ${kind}`),
    ...(artifact.blocking_reasons ?? []),
    ...(artifact.status !== "conformant" ? [`statut ${artifact.status}`] : []),
    ...(artifact.reviews?.malex?.status !== "approved" ? ["validation MALEX manquante"] : []),
    ...((artifact.required_evidence ?? []).includes("vincent_review") &&
    artifact.reviews?.vincent?.status !== "approved"
      ? ["validation Vincent manquante"]
      : [])
  ];
  return {
    artifact_id: artifact.artifact_id ?? null,
    surface_id: artifact.surface_id ?? null,
    component_id: artifact.component_id ?? null,
    status: artifact.status ?? "blocked",
    promotion_allowed: blockingReasons.length === 0,
    blocking_reasons: [...new Set(blockingReasons)],
    missing_evidence: missingEvidence,
    missing_states: missingStates,
    unknown_rule_ids: unknownRuleIds
  };
}

export function validateUiConformanceRegistry(conformance, designRules = []) {
  if (!conformance || !Array.isArray(conformance.artifacts)) {
    return { valid: false, errors: ["Registre de conformité absent ou illisible."] };
  }
  const ids = conformance.artifacts.map((artifact) => artifact.artifact_id).filter(Boolean);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const evaluations = conformance.artifacts.map((artifact) =>
    evaluateUiArtifact(artifact, designRules, conformance)
  );
  const structuralErrors = evaluations.flatMap((evaluation) =>
    evaluation.blocking_reasons
      .filter((reason) =>
        [
          "artifact_id manquant",
          "artifact_type manquant",
          "surface_id manquant",
          "component_id manquant",
          "aucune règle applicable",
          "aucun scénario Lab"
        ].includes(reason) ||
        reason.startsWith("règle inconnue") ||
        reason.startsWith("état requis manquant")
      )
      .map((reason) => `${evaluation.artifact_id ?? "artefact inconnu"}: ${reason}`)
  );
  const errors = [
    ...duplicateIds.map((id) => `artifact_id dupliqué ${id}`),
    ...(!conformance.bible_version ? ["bible_version manquante"] : []),
    ...structuralErrors
  ];
  return { valid: errors.length === 0, errors, evaluations };
}

export async function getUiBible() {
  const [content, design] = await Promise.all([
    readFile(UI_BIBLE_PATH, "utf8"),
    readJson(DESIGN_RULES_PATH, { rules: [] })
  ]);
  return {
    version: design.bible_version ?? "unknown",
    path: path.relative(REPO_ROOT, UI_BIBLE_PATH),
    content,
    rule_count: design.rules.length
  };
}

export async function getUiConformance() {
  const [conformance, design] = await Promise.all([
    readJson(UI_CONFORMANCE_PATH, { artifacts: [] }),
    readJson(DESIGN_RULES_PATH, { rules: [] })
  ]);
  const validation = validateUiConformanceRegistry(conformance, design.rules);
  const summary = validation.evaluations.reduce(
    (accumulator, evaluation) => {
      accumulator.total += 1;
      accumulator[evaluation.status] = (accumulator[evaluation.status] ?? 0) + 1;
      if (evaluation.promotion_allowed) accumulator.promotion_allowed += 1;
      return accumulator;
    },
    { total: 0, conformant: 0, audit_required: 0, blocked: 0, promotion_allowed: 0 }
  );
  return { ...conformance, validation: { valid: validation.valid, errors: validation.errors }, summary, evaluations: validation.evaluations };
}

export async function runUiGate(input = {}) {
  const [conformance, design] = await Promise.all([
    readJson(UI_CONFORMANCE_PATH, { artifacts: [] }),
    readJson(DESIGN_RULES_PATH, { rules: [] })
  ]);
  const surface = input.surface ? String(input.surface).toLowerCase() : null;
  const componentId = input.component_id ? String(input.component_id).toLowerCase() : null;
  const artifactId = input.artifact_id ? String(input.artifact_id).toLowerCase() : null;
  const matches = conformance.artifacts.filter(
    (artifact) =>
      (!surface || artifact.surface_id.toLowerCase() === surface) &&
      (!componentId || artifact.component_id.toLowerCase() === componentId) &&
      (!artifactId || artifact.artifact_id.toLowerCase() === artifactId)
  );
  if (!surface && !componentId && !artifactId) {
    throw new Error("Le gate exige --surface, --component ou --artifact.");
  }
  if (!matches.length) {
    return {
      ok: false,
      bible_version: conformance.bible_version,
      target: { surface, component_id: componentId, artifact_id: artifactId },
      evaluations: [],
      blocking_reasons: ["Aucun artefact de conformité ne correspond à la cible."]
    };
  }
  const evaluations = matches.map((artifact) =>
    evaluateUiArtifact(artifact, design.rules, conformance)
  );
  return {
    ok: evaluations.every((evaluation) => evaluation.promotion_allowed),
    bible_version: conformance.bible_version,
    target: { surface, component_id: componentId, artifact_id: artifactId },
    evaluations,
    blocking_reasons: evaluations.flatMap((evaluation) => evaluation.blocking_reasons)
  };
}

export async function addUiFeedback(input) {
  const [conformance, design] = await Promise.all([
    readJson(UI_CONFORMANCE_PATH),
    readJson(DESIGN_RULES_PATH, { rules: [] })
  ]);
  const artifactId = typeof input.artifact_id === "string" ? input.artifact_id.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim().slice(0, 1200) : "";
  const submittedBy = input.submitted_by === "vincent" ? "vincent" : "malex";
  const artifact = conformance?.artifacts?.find((item) => item.artifact_id === artifactId);
  if (!artifact || !body) {
    throw new Error("Un artefact connu et un retour sont requis.");
  }
  const knownRuleIds = new Set(design.rules.map((rule) => rule.rule_id));
  const ruleIds = [...new Set(Array.isArray(input.rule_ids) ? input.rule_ids : [])].filter(
    (ruleId) => knownRuleIds.has(ruleId) && artifact.rule_ids.includes(ruleId)
  );
  if (!ruleIds.length) {
    throw new Error("Le retour doit viser au moins une règle applicable à l'artefact.");
  }
  const now = new Date().toISOString();
  const finding = {
    finding_id: `ui-finding-${Date.now()}`,
    created_at: now,
    submitted_by: submittedBy,
    artifact_id: artifact.artifact_id,
    surface_id: artifact.surface_id,
    component_id: artifact.component_id,
    rule_ids: ruleIds,
    body,
    status: "candidate",
    auto_apply: false
  };
  conformance.candidate_findings.unshift(finding);
  conformance.updated_at = now;
  await writeJsonAtomic(UI_CONFORMANCE_PATH, conformance);
  return finding;
}

export async function writePortableExport() {
  const [state, features, design, workboard, sources, git, profile] = await Promise.all([
    readState(),
    readJson(FEATURE_REGISTRY_PATH, { features: [] }),
    readJson(DESIGN_RULES_PATH, { rules: [] }),
    readJson(WORKBOARD_PATH, { work_packages: [], authorizations: [] }),
    readJson(SOURCE_REGISTRY_PATH, { sources: [] }),
    collectGitStatus(),
    readLocalProfile()
  ]);
  const activePackages = workboard.work_packages.filter((item) =>
    ["in_progress", "pending", "blocked"].includes(item.status)
  );
  const payload = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    program: state.program,
    active_round: currentRound(state),
    next_moves: state.next_moves,
    feature_summary: buildFeatureSummary(features.features),
    active_work_packages: activePackages,
    design_rules: design.rules.map(({ rule_id, title, status, intent, applies_to, must, avoid, checks }) => ({
      rule_id,
      title,
      status,
      intent,
      applies_to,
      must,
      avoid,
      checks
    })),
    source_summary: sources.sources.map(({ source_id, path: sourcePath, status, absorbed_into }) => ({
      source_id,
      path: sourcePath,
      status,
      absorbed_into
    })),
    profile: profile
      ? {
          profile_id: profile.profile_id,
          guidance: profile.guidance,
          current_focus: profile.current_focus
        }
      : null,
    git: {
      branch: git.branch,
      sha: git.sha,
      dirty: git.dirty,
      ahead: git.ahead,
      behind: git.behind
    },
    resume_instruction:
      "Présente le Round, recommande la suite et attends le GO. N'invente aucune tâche."
  };
  assertPortableExportSafe(payload);
  await mkdir(EXPORT_DIR, { recursive: true });
  const jsonPath = path.join(EXPORT_DIR, "MASTERBUILD_PORTABLE_CURRENT.json");
  const markdownPath = path.join(EXPORT_DIR, "MASTERBUILD_PORTABLE_CURRENT.md");
  const featureSummary = payload.feature_summary;
  const markdown = `# MASTERBUILD — export portable

Généré : ${payload.generated_at}

## Programme

${payload.program.title}

## Round actif

- ${payload.active_round.title}
- Étape ${payload.active_round.stage_index}/8 — ${payload.active_round.stage_label}
- Recommandation : ${payload.active_round.recommended_next_action}
- Risque : ${payload.active_round.primary_risk}

## Carte fonctionnelle

- ${featureSummary.total} fonctionnalités suivies
- ${featureSummary.backend.verified} backend vérifiées
- ${featureSummary.ui.connected + featureSummary.ui.verified} UI connectées ou vérifiées
- ${featureSummary.likely_missing} raccords probablement manquants

## Work packages actifs

${activePackages.map((item) => `- ${item.work_package_id} · ${item.label} · ${item.status} · ${item.owner}`).join("\n")}

## Reprise

Présente la situation, les preuves, une recommandation et deux alternatives maximum. Attends le GO.
`;
  assertPortableExportSafe(markdown);
  await writeFile(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, markdown, "utf8");
  return { json_path: jsonPath, markdown_path: markdownPath, payload };
}

export async function authorizeRound(input) {
  const validation = validateRoundAuthorization(input);
  if (!validation.allowed) throw new Error(validation.reason);
  const workboard = await readJson(WORKBOARD_PATH, { authorizations: [], work_packages: [] });
  const now = new Date().toISOString();
  const authorization = {
    authorization_id: `AUTH-${input.round_id}-${Date.now()}`,
    round_id: input.round_id,
    actor: input.actor,
    scope: validation.scope,
    status: "active",
    granted_at: now,
    expires_on_scope_change: true,
    excluded: validation.excluded
  };
  workboard.authorizations = [
    authorization,
    ...workboard.authorizations.map((item) =>
      item.round_id === input.round_id ? { ...item, status: "superseded" } : item
    )
  ];
  workboard.updated_at = now;
  await writeJsonAtomic(WORKBOARD_PATH, workboard);
  await writePortableExport();
  return authorization;
}

export async function updateWorkPackage(input) {
  const workboard = await readJson(WORKBOARD_PATH, { work_packages: [], authorizations: [] });
  const allowedStatuses = ["pending", "in_progress", "blocked", "completed"];
  const index = workboard.work_packages.findIndex(
    (item) => item.work_package_id === input.work_package_id
  );
  if (index < 0) throw new Error("Work package MASTERBUILD introuvable.");
  const current = workboard.work_packages[index];
  workboard.work_packages[index] = {
    ...current,
    ...(allowedStatuses.includes(input.status) ? { status: input.status } : {}),
    ...(input.owner ? { owner: String(input.owner).slice(0, 80) } : {})
  };
  workboard.updated_at = new Date().toISOString();
  await writeJsonAtomic(WORKBOARD_PATH, workboard);
  await writePortableExport();
  return workboard;
}

export function formatResumeBrief(state, git, handoff) {
  const round = currentRound(state);
  const activeMoves = (state.next_moves ?? []).filter((move) => move.status !== "completed");
  const recommended = activeMoves.find((move) => move.recommended);
  const alternatives = activeMoves
    .filter((move) => !move.recommended)
    .slice(0, 2);
  const completed = state.last_completed_round;
  const handoffNote = handoff?.stale ? `\nAlerte : ${handoff.reason}` : "";

  return `MASTERBUILD · Round ${round.stage_index}/8 — ${round.stage_label}

Situation : ${state.program?.title ?? "Construire MasterFlow"}. Le chantier actif est « ${round.title} ».
Fait : ${
    completed
      ? `le Round « ${completed.title} » est publié et clôturé.`
      : "les preuves du Round précédent restent à confirmer."
  }
Je recommande : ${recommended?.label ?? round.recommended_next_action ?? "cadrer le prochain move"}.
Pourquoi : ${recommended?.reason ?? "c'est la prochaine sortie attendue du Round."}
Alternatives : ${
    alternatives.length
      ? alternatives.map((move) => `${move.label} — ${move.reason}`).join(" | ")
      : "aucune alternative validée dans la queue."
  }
Risque principal : ${round.primary_risk ?? "dériver du canon ou du runtime réel."}${handoffNote}

Dis « go recommandation » pour lancer. Aucune tâche n'a été exécutée pendant cette reprise.`;
}

export async function buildResumeBrief() {
  const [state, git] = await Promise.all([readState(), collectGitStatus()]);
  const handoff = await collectHandoffStatus(state, git);
  return {
    brief: formatResumeBrief(state, git, handoff),
    state,
    git,
    handoff
  };
}

export async function saveLocalProfile(input) {
  const allowedProfile = input.profile_id === "vincent" ? "vincent" : "malex";
  const allowedGuidance = ["guided", "assisted", "fast"].includes(input.guidance)
    ? input.guidance
    : "assisted";
  const contextPercent = Math.max(0, Math.min(100, Number(input.context_percent ?? 0)));
  const profile = {
    schema_version: 1,
    profile_id: allowedProfile,
    guidance: allowedGuidance,
    verification: input.verification === "balanced" ? "balanced" : "human_first",
    context_percent: contextPercent,
    current_focus:
      typeof input.current_focus === "string" ? input.current_focus.slice(0, 160) : "",
    friction_note:
      typeof input.friction_note === "string" ? input.friction_note.slice(0, 240) : "",
    onboarding_complete: true,
    updated_at: new Date().toISOString()
  };
  await writeJsonAtomic(PROFILE_PATH, profile);
  return profile;
}

export async function ensureLocalProfile() {
  const existing = await readLocalProfile();
  if (existing) {
    return { created: false, profile: existing };
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  const profile = {
    schema_version: 1,
    profile_id: null,
    guidance: "guided",
    verification: "human_first",
    context_percent: 0,
    current_focus: "",
    friction_note: "",
    onboarding_complete: false,
    updated_at: new Date().toISOString()
  };
  await writeJsonAtomic(PROFILE_PATH, profile);
  return { created: true, profile };
}

export async function updateGoal(input) {
  const state = await readState();
  const round = currentRound(state);
  const nextStage = Math.max(1, Math.min(8, Number(input.stage_index ?? round.stage_index)));
  const nextStatus = ["active", "blocked", "completed"].includes(input.status)
    ? input.status
    : round.status;
  const now = new Date().toISOString();

  const nextRound = {
    ...round,
    ...(typeof input.title === "string" && input.title.trim() ? { title: input.title.trim() } : {}),
    ...(input.owner === "vincent" || input.owner === "malex" ? { owner: input.owner } : {}),
    status: nextStatus,
    stage_index: nextStage,
    stage_label: STAGE_LABELS[nextStage - 1]
  };
  state.active_round = nextRound;
  state.active_goal = {
    ...state.active_goal,
    goal_id: nextRound.round_id ?? state.active_goal.goal_id,
    title: nextRound.title,
    owner: nextRound.owner,
    status: nextRound.status,
    stage_index: nextRound.stage_index,
    stage_label: nextRound.stage_label
  };
  state.stages = state.stages.map((stage) => ({
    ...stage,
    status:
      stage.index < nextStage ? "completed" : stage.index === nextStage ? "active" : "pending"
  }));
  state.updated_at = now;
  state.publication.state = "local_uncommitted";
  await writeJsonAtomic(STATE_PATH, state);
  await writePortableExport();
  return state;
}

function classifyFinding(file) {
  const lowerPath = file.path.toLowerCase();
  if (lowerPath.includes("/candidates/")) {
    return {
      level: "candidate",
      action: "Conserver hors runtime jusqu’à validation",
      reason: "Asset candidat, pas un actif canon."
    };
  }
  if (lowerPath.startsWith("tmp/") || lowerPath.includes("/cache/")) {
    return {
      level: "auto_clean_candidate",
      action: "Ajouter à une vague de nettoyage allowlistée",
      reason: "Artefact local potentiel, à confirmer avant nettoyage."
    };
  }
  if (lowerPath.endsWith(".psd") || lowerPath.endsWith(".ai")) {
    return {
      level: "protected",
      action: "Ne pas supprimer",
      reason: "Source graphique métier protégée."
    };
  }
  if (lowerPath.startsWith("docs/") && file.status.includes("?")) {
    return {
      level: "review",
      action: "Décider si le document entre dans le prochain snapshot",
      reason: "Document local non suivi par Git."
    };
  }
  return {
    level: "review",
    action: "Relire dans la vague qui le possède",
    reason: "Modification locale à attribuer avant publication."
  };
}

export async function collectWorkspaceFindings(gitStatus) {
  return gitStatus.files.map((file, index) => ({
    finding_id: `workspace-${index + 1}`,
    source: "git_worktree",
    path: file.path,
    status: file.status,
    ...classifyFinding(file)
  }));
}

export async function collectExternalAgentStatus(state) {
  const inbox = await readFile(OPENCODE_INBOX_PATH, "utf8").catch(() => "");
  const activeBlock =
    inbox.match(/## TÂCHE ACTIVE[\s\S]*?```yaml([\s\S]*?)```/)?.[1] ?? "";
  const status = activeBlock.match(/status:\s*([a-zA-Z0-9_-]+)/)?.[1] ?? "missing";
  const taskId = activeBlock.match(/id:\s*([^\n]+)/)?.[1]?.trim() ?? "null";
  const title = activeBlock.match(/title:\s*([^\n]+)/)?.[1]?.trim() ?? "null";
  const patchAllowed = activeBlock.match(/patch_allowed:\s*(true|false)/)?.[1] === "true";
  const gitAllowed = activeBlock.match(/git_allowed:\s*(true|false)/)?.[1] === "true";
  return (state.external_agents ?? []).map((agent) => ({
    ...agent,
    inbox_status: status,
    active_task_id: taskId,
    active_task_title: title,
    patch_allowed: patchAllowed,
    git_allowed: gitAllowed,
    ready: status === "ready_for_big_pickle",
    requires_codex_review: status === "done_unverified"
  }));
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 1400);
  try {
    const response = await fetch(url, {
      headers: options.headers,
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function collectRuntimeStatus() {
  const baseUrl = process.env.MASTERBUILD_RUNTIME_URL ?? "http://127.0.0.1:8000";
  const token = process.env.MASTERBUILD_API_TOKEN;
  try {
    const health = await fetchJson(`${baseUrl}/health`);
    const result = { available: true, base_url: baseUrl, health, diagnostics: null };
    if (token) {
      result.diagnostics = await fetchJson(
        `${baseUrl}/api/v1/diagnostics/owner-cockpit`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch((error) => ({ error: error.message }));
    }
    return result;
  } catch (error) {
    return {
      available: false,
      base_url: baseUrl,
      health: null,
      diagnostics: null,
      note: "Le produit peut rester arrêté : MASTERBUILD fonctionne sans lui.",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function prepareSensitiveAction(action, gitStatus) {
  const definitions = {
    commit: {
      label: "Préparer un commit",
      command: "git add <fichiers-validés> && git commit -m \"<message-validé>\"",
      risk: "Le snapshot local devient une preuve Git."
    },
    push: {
      label: "Préparer un push",
      command: `git push origin ${gitStatus.branch}`,
      risk: "La branche devient visible aux collaborateurs."
    },
    pr: {
      label: "Préparer une pull request",
      command: "gh pr create --draft --fill",
      risk: "La vague entre dans le circuit de revue GitHub."
    },
    deploy: {
      label: "Préparer un déploiement",
      command: "Action volontairement indisponible depuis MASTERBUILD V1",
      risk: "Le runtime public pourrait être modifié."
    },
    merge: {
      label: "Préparer le merge",
      command: "gh pr merge <PR> --merge --delete-branch",
      risk: "La vague rejoindrait la branche protégée après revue."
    },
    release: {
      label: "Préparer le round de publication complet",
      command:
        "stage ciblé → tests → commit → push → PR draft → revue → merge → preuve runtime",
      risk: "Chaque gate reste indépendante et demande son GO au moment opportun."
    }
  };
  const definition = definitions[action] ?? definitions.commit;
  return {
    action,
    ...definition,
    executable: false,
    validation_required: true,
    gate: "GO explicite de MALEX dans Codex",
    scope: gitStatus.files
  };
}

function recapTagline(stageIndex, recipient) {
  const lines = [
    "Round propre : le contexte est intact et personne n’a mangé le décor.",
    "Combo enregistré. Le prochain coup reste dans la queue, pas dans l’improvisation.",
    "Perfect parry sur la dérive : la preuve et la décision sont encore séparées.",
    "Drive gauge sous contrôle. On peut reprendre sans relire le générique."
  ];
  return `${recipient === "vincent" ? "ProfKrapu" : "MALEX"} — ${
    lines[(stageIndex - 1) % lines.length]
  }`;
}

export async function addRecap(input) {
  const state = await readState();
  const round = currentRound(state);
  const recaps = (await readJson(RECAPS_PATH)) ?? {
    schema_version: 1,
    updated_at: new Date().toISOString(),
    messages: []
  };
  const sender = input.sender === "vincent" ? "vincent" : "malex";
  const recipient = input.recipient === "malex" ? "malex" : "vincent";
  const body = typeof input.body === "string" ? input.body.trim().slice(0, 1200) : "";
  if (!body) {
    throw new Error("Le recap est vide.");
  }
  const now = new Date().toISOString();
  const message = {
    message_id: `recap-${Date.now()}`,
    created_at: now,
    sender,
    recipient,
    goal_id: round.round_id ?? round.goal_id,
    stage_index: round.stage_index,
    body,
    tagline: recapTagline(round.stage_index, recipient),
    status: "shared_in_git_worktree"
  };
  recaps.messages.unshift(message);
  recaps.updated_at = now;
  await writeJsonAtomic(RECAPS_PATH, recaps);
  return recaps;
}

export async function addLearningProposal(input) {
  const learning = (await readJson(LEARNING_PATH)) ?? {
    schema_version: 1,
    mode: "proposal_only",
    updated_at: new Date().toISOString(),
    observations: [],
    proposals: []
  };
  const signal = typeof input.signal === "string" ? input.signal.trim().slice(0, 600) : "";
  const proposal =
    typeof input.proposal === "string" ? input.proposal.trim().slice(0, 800) : "";
  if (!signal || !proposal) {
    throw new Error("Le signal et la proposition sont requis.");
  }
  learning.proposals.unshift({
    id: `proposal-${Date.now()}`,
    created_at: new Date().toISOString(),
    signal,
    proposal,
    status: "candidate",
    auto_apply: false
  });
  learning.updated_at = new Date().toISOString();
  await writeJsonAtomic(LEARNING_PATH, learning);
  return learning;
}

export async function prepareHandoff() {
  const [state, git, profile] = await Promise.all([
    readState(),
    collectGitStatus(),
    readLocalProfile()
  ]);
  await mkdir(LOCAL_DIR, { recursive: true });
  const guidance = contextGuidance(profile?.context_percent ?? 0);
  const round = currentRound(state);
  const nextMoves = (state.next_moves ?? []).slice(0, 3);
  const content = `# Handoff MASTERBUILD

Date : ${new Date().toISOString()}
Profil local : ${profile?.profile_id ?? "à aligner"}

## Programme

${state.program?.title ?? "Construire MasterFlow"}

## Round actif

- Round ID : ${round.round_id ?? round.goal_id}
- Titre : ${round.title}
- Objectif : ${round.objective ?? round.title}

## Progression

- Étape : ${round.stage_index}/8 — ${round.stage_label}
- Statut : ${round.status}
- Action recommandée : ${round.recommended_next_action ?? "À cadrer depuis la queue partagée"}
- Prochaine consigne contexte : ${guidance.label}

## Choix bornés

${nextMoves
  .map(
    (move, index) =>
      `${index + 1}. ${move.label}${move.recommended ? " — recommandé" : ""} : ${move.reason}`
  )
  .join("\n")}

## État Git

- Branche : ${git.branch}
- Commit : ${git.sha ?? "inconnu"}
- Fichiers locaux : ${git.files.length}
- Publication : ${state.publication.state}

## Reprise

\`Reprends MASTERBUILD. Oriente-moi sur le Round actif, recommande la prochaine action et attends mon GO. N'exécute aucune tâche pendant la reprise.\`
`;
  await writeFile(HANDOFF_PATH, content, "utf8");
  await writePortableExport();
  return {
    path: HANDOFF_PATH,
    prompt:
      "Reprends MASTERBUILD. Oriente-moi sur le Round actif, recommande la prochaine action et attends mon GO. N’exécute aucune tâche pendant la reprise.",
    content
  };
}

export async function collectStatus() {
  const [state, profile, git, runtime, profileAudits, recaps, learning, features, design, workboard, sources, uiConformance] =
    await Promise.all([
    readState(),
    readLocalProfile(),
    collectGitStatus(),
    collectRuntimeStatus(),
    readJson(PROFILE_AUDITS_PATH, { profiles: [] }),
    readJson(RECAPS_PATH, { messages: [] }),
    readJson(LEARNING_PATH, { observations: [], proposals: [] }),
    readJson(FEATURE_REGISTRY_PATH, { features: [] }),
    readJson(DESIGN_RULES_PATH, { rules: [] }),
    readJson(WORKBOARD_PATH, { work_packages: [], authorizations: [] }),
    readJson(SOURCE_REGISTRY_PATH, { sources: [] }),
    readJson(UI_CONFORMANCE_PATH, { artifacts: [], candidate_findings: [] })
  ]);
  const findings = await collectWorkspaceFindings(git);
  const externalAgents = await collectExternalAgentStatus(state);
  const handoff = await collectHandoffStatus(state, git);
  const uiValidation = validateUiConformanceRegistry(uiConformance, design.rules);
  const uiSummary = uiValidation.evaluations.reduce(
    (summary, evaluation) => {
      summary.total += 1;
      summary[evaluation.status] = (summary[evaluation.status] ?? 0) + 1;
      if (evaluation.promotion_allowed) summary.promotion_allowed += 1;
      return summary;
    },
    { total: 0, conformant: 0, audit_required: 0, blocked: 0, promotion_allowed: 0 }
  );
  return {
    generated_at: new Date().toISOString(),
    state,
    profile,
    context: contextGuidance(profile?.context_percent ?? 0),
    git,
    runtime,
    findings,
    external_agents: externalAgents,
    handoff,
    profile_audits: profileAudits.profiles,
    recaps: recaps.messages,
    learning,
    feature_registry: features.features,
    feature_summary: buildFeatureSummary(features.features),
    design_rules: design.rules,
    ui_bible: {
      version: design.bible_version ?? uiConformance.bible_version ?? "unknown",
      path: path.relative(REPO_ROOT, UI_BIBLE_PATH)
    },
    ui_conformance: {
      ...uiConformance,
      validation: { valid: uiValidation.valid, errors: uiValidation.errors },
      summary: uiSummary,
      evaluations: uiValidation.evaluations
    },
    workboard,
    source_registry: sources.sources
  };
}

export async function doctor() {
  const [state, profile, git, runtime, features, design, workboard, conformance, bibleExists] = await Promise.all([
    readState().catch(() => null),
    readLocalProfile(),
    collectGitStatus(),
    collectRuntimeStatus(),
    readJson(FEATURE_REGISTRY_PATH),
    readJson(DESIGN_RULES_PATH),
    readJson(WORKBOARD_PATH),
    readJson(UI_CONFORMANCE_PATH),
    pathExists(UI_BIBLE_PATH)
  ]);
  const handoff = state ? await collectHandoffStatus(state, git) : null;
  const round = state ? currentRound(state) : null;
  const uiValidation = validateUiConformanceRegistry(conformance, design?.rules ?? []);
  const baseOk = Boolean(state && git.available && bibleExists && uiValidation.valid);
  return {
    ok: baseOk,
    checks: [
      { id: "node", label: "Node.js", ok: Number(process.versions.node.split(".")[0]) >= 20, detail: process.versions.node },
      { id: "git", label: "Dépôt Git", ok: git.available, detail: git.branch },
      { id: "state", label: "État partagé", ok: Boolean(state), detail: round?.title ?? "introuvable" },
      {
        id: "handoff",
        label: "Handoff local",
        ok: Boolean(handoff && !handoff.stale),
        optional: true,
        detail: handoff?.reason ?? "indisponible"
      },
      { id: "profile", label: "Profil local", ok: Boolean(profile?.onboarding_complete), detail: profile?.profile_id ?? "enquête requise" },
      {
        id: "registries",
        label: "Registres V2",
        ok: Boolean(features?.features && design?.rules && workboard?.work_packages),
        detail: `${features?.features?.length ?? 0} fonctionnalités · ${design?.rules?.length ?? 0} règles · ${workboard?.work_packages?.length ?? 0} work packages`
      },
      {
        id: "ui_bible",
        label: "Bible UI",
        ok: bibleExists && Boolean(design?.bible_version),
        detail: bibleExists ? `V${design?.bible_version ?? "inconnue"}` : "introuvable"
      },
      {
        id: "ui_conformance",
        label: "Registre de conformité UI",
        ok: uiValidation.valid,
        detail: uiValidation.valid
          ? `${conformance?.artifacts?.length ?? 0} artefacts enregistrés`
          : uiValidation.errors.join(" · ")
      },
      { id: "runtime", label: "Backend produit facultatif", ok: runtime.available, optional: true, detail: runtime.available ? runtime.base_url : "arrêté, sans blocage" }
    ]
  };
}
