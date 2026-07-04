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
  const nextStage = Math.max(1, Math.min(8, Number(input.stage_index ?? state.active_goal.stage_index)));
  const nextStatus = ["active", "blocked", "completed"].includes(input.status)
    ? input.status
    : state.active_goal.status;
  const now = new Date().toISOString();

  state.active_goal = {
    ...state.active_goal,
    ...(typeof input.title === "string" && input.title.trim() ? { title: input.title.trim() } : {}),
    ...(input.owner === "vincent" || input.owner === "malex" ? { owner: input.owner } : {}),
    status: nextStatus,
    stage_index: nextStage,
    stage_label: STAGE_LABELS[nextStage - 1]
  };
  state.stages = state.stages.map((stage) => ({
    ...stage,
    status:
      stage.index < nextStage ? "completed" : stage.index === nextStage ? "active" : "pending"
  }));
  state.updated_at = now;
  state.publication.state = "local_uncommitted";
  await writeJsonAtomic(STATE_PATH, state);
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
    goal_id: state.active_goal.goal_id,
    stage_index: state.active_goal.stage_index,
    body,
    tagline: recapTagline(state.active_goal.stage_index, recipient),
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
  const content = `# Handoff MASTERBUILD

Date : ${new Date().toISOString()}
Profil local : ${profile?.profile_id ?? "à aligner"}

## Objectif

${state.active_goal.title}

## Progression

- Étape : ${state.active_goal.stage_index}/8 — ${state.active_goal.stage_label}
- Statut : ${state.active_goal.status}
- Prochaine consigne contexte : ${guidance.label}

## État Git

- Branche : ${git.branch}
- Commit : ${git.sha ?? "inconnu"}
- Fichiers locaux : ${git.files.length}
- Publication : ${state.publication.state}

## Reprise

\`Reprends MASTERBUILD. Lis docs/masterbuild/MASTERBUILD_STATE.json et ce handoff, vérifie Git, puis indique l'étape courante et la prochaine action sûre. Ne publie rien sans GO explicite.\`
`;
  await writeFile(HANDOFF_PATH, content, "utf8");
  return {
    path: HANDOFF_PATH,
    prompt:
      "Reprends MASTERBUILD. Lis l’état partagé et le handoff local, vérifie Git, puis indique l’étape et la prochaine action sûre.",
    content
  };
}

export async function collectStatus() {
  const [state, profile, git, runtime, profileAudits, recaps, learning] =
    await Promise.all([
    readState(),
    readLocalProfile(),
    collectGitStatus(),
    collectRuntimeStatus(),
    readJson(PROFILE_AUDITS_PATH, { profiles: [] }),
    readJson(RECAPS_PATH, { messages: [] }),
    readJson(LEARNING_PATH, { observations: [], proposals: [] })
  ]);
  const findings = await collectWorkspaceFindings(git);
  const externalAgents = await collectExternalAgentStatus(state);
  return {
    generated_at: new Date().toISOString(),
    state,
    profile,
    context: contextGuidance(profile?.context_percent ?? 0),
    git,
    runtime,
    findings,
    external_agents: externalAgents,
    profile_audits: profileAudits.profiles,
    recaps: recaps.messages,
    learning
  };
}

export async function doctor() {
  const [state, profile, git, runtime] = await Promise.all([
    readState().catch(() => null),
    readLocalProfile(),
    collectGitStatus(),
    collectRuntimeStatus()
  ]);
  return {
    ok: Boolean(state && git.available),
    checks: [
      { id: "node", label: "Node.js", ok: Number(process.versions.node.split(".")[0]) >= 20, detail: process.versions.node },
      { id: "git", label: "Dépôt Git", ok: git.available, detail: git.branch },
      { id: "state", label: "État partagé", ok: Boolean(state), detail: state?.active_goal?.title ?? "introuvable" },
      { id: "profile", label: "Profil local", ok: Boolean(profile?.onboarding_complete), detail: profile?.profile_id ?? "enquête requise" },
      { id: "runtime", label: "Backend produit facultatif", ok: runtime.available, optional: true, detail: runtime.available ? runtime.base_url : "arrêté, sans blocage" }
    ]
  };
}
