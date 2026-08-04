export type Stage = {
  index: number;
  id: string;
  label: string;
  status: "completed" | "active" | "pending";
};

export type SharedProfile = {
  profile_id: "malex" | "vincent";
  display_name: string;
  github_handle: string;
  ownership: string[];
  default_guidance: "guided" | "assisted" | "fast";
};

export type LocalProfile = {
  schema_version: number;
  profile_id: "malex" | "vincent" | null;
  guidance: "guided" | "assisted" | "fast";
  verification: "human_first" | "balanced";
  context_percent: number;
  current_focus: string;
  friction_note: string;
  onboarding_complete: boolean;
  updated_at: string;
};

export type GitFile = { status: string; path: string };

export type ActiveRound = {
  round_id: string;
  title: string;
  objective: string;
  owner: "malex" | "vincent";
  status: "active" | "blocked" | "completed";
  stage_index: number;
  stage_label: string;
  recommended_next_action: string;
  primary_risk: string;
  no_auto_execute: boolean;
  success_criteria: string[];
  blockers: string[];
  validation_gates: string[];
  source_refs: string[];
};

export type NextMove = {
  move_id: string;
  label: string;
  reason: string;
  recommended: boolean;
  status:
    | "ready_for_decision"
    | "awaiting_go"
    | "awaiting_review"
    | "in_progress"
    | "queued"
    | "blocked"
    | "blocked_until_lot_1_merge"
    | "blocked_until_lot_2_merge"
    | "future_requires_separate_go";
};

export type FeatureRecord = {
  feature_id: string;
  label: string;
  domain: string;
  product_state: "candidate" | "validated" | "future" | "rejected";
  backend_state: "absent" | "documented" | "partial" | "ready" | "verified";
  ui_state: "absent" | "lab" | "prototype" | "connected" | "verified";
  release_state: "local" | "branch" | "draft_pr" | "main" | "live" | "unknown";
  owner: string;
  collaborators: string[];
  source_refs: string[];
  dependencies: string[];
  missing: string[];
  next_action: string;
  risk: string;
};

export type DesignRule = {
  rule_id: string;
  title: string;
  status: "canon" | "validated_principle" | "candidate_reference" | "experiment" | "rejected";
  intent: string;
  source_refs: string[];
  applies_to: string[];
  audiences: string[];
  must: string[];
  avoid: string[];
  checks: string[];
  exceptions: string[];
  review_owner: string;
};

export type WorkPackage = {
  work_package_id: string;
  label: string;
  feature_ids: string[];
  status: "pending" | "in_progress" | "blocked" | "completed";
  owner: string;
  reviewers: string[];
  dependencies: string[];
  design_rule_ids: string[];
  tool_route: string;
  expected_evidence: string[];
};

export type SourceRecord = {
  source_id: string;
  path: string;
  kind: string;
  status: "absorbed" | "historical" | "conflict" | "still_active";
  absorbed_into: string[];
  note: string;
};

export type DesignPreflight = {
  generated_at: string;
  surface: string;
  audience: string;
  contributor: string;
  artifact_type: string;
  artifact_id: string | null;
  component_id: string | null;
  bible_version: string;
  feature_id: string | null;
  context: string;
  existing_components: string[];
  applicable_rules: Array<{
    rule_id: string;
    title: string;
    must: string[];
    avoid: string[];
    checks: string[];
  }>;
  locked_decisions: string[];
  free_zones: string[];
  required_states: string[];
  required_evidence: string[];
  lab_scenarios: string[];
  blocking_reasons: string[];
  promotion_allowed: boolean;
  responsive: string;
  accessibility: string[];
  backend: {
    state: string;
    dependencies: string[];
    missing: string[];
  };
  guidance: Record<string, string>;
  validations: {
    malex: string;
    vincent: string;
  };
};

export type UiConformanceArtifact = {
  artifact_id: string;
  artifact_type: "page" | "shared_component";
  surface_id: string;
  component_id: string;
  label: string;
  status: "conformant" | "audit_required" | "blocked";
  rule_ids: string[];
  required_states: string[];
  lab_scenarios: string[];
  required_evidence: string[];
  evidence: Array<{ kind: string; status: string; ref?: string }>;
  reviews: {
    malex: { status: "approved"; at: string; ref?: string } | null;
    vincent: { status: "approved"; at: string; ref?: string } | null;
  };
  blocking_reasons: string[];
  notes: string;
};

export type UiConformanceEvaluation = {
  artifact_id: string;
  surface_id: string;
  component_id: string;
  status: UiConformanceArtifact["status"];
  promotion_allowed: boolean;
  blocking_reasons: string[];
  missing_evidence: string[];
  missing_states: string[];
  unknown_rule_ids: string[];
};

export type MasterbuildStatus = {
  generated_at: string;
  state: {
    schema_version: number;
    updated_at: string;
    program: {
      program_id: string;
      title: string;
      status: "active" | "paused" | "completed";
      owner: "malex" | "vincent";
      rule: string;
    };
    registries: {
      features: string;
      design_rules: string;
      workboard: string;
      sources: string;
    };
    active_round: ActiveRound;
    next_moves: NextMove[];
    continuity: {
      resume_mode: string;
      never_execute_on_resume: boolean;
      stale_handoff_policy: string;
      required_response_order: string[];
      mandatory_close: string;
    };
    active_goal: {
      goal_id: string;
      title: string;
      owner: "malex" | "vincent";
      status: "active" | "blocked" | "completed";
      stage_index: number;
      stage_label: string;
      success_criteria: string[];
      blockers: string[];
      validation_gates: string[];
    };
    stages: Stage[];
    shared_profiles: SharedProfile[];
    domains: Array<{
      id: string;
      label: string;
      status: "implemented" | "partial" | "future" | "unknown";
    }>;
    research_proposals: Array<{
      id: string;
      title: string;
      reason: string;
      question: string;
      cost: "light" | "medium" | "important";
      expected_output: string;
      status: string;
    }>;
    publication: {
      state: string;
      branch: string;
      commit_sha: string | null;
      pull_request: string | null;
      runtime_proof: string;
    };
  };
  profile: LocalProfile | null;
  context: {
    level: "continue" | "checkpoint" | "handoff";
    label: string;
    message: string;
  };
  git: {
    available: boolean;
    branch: string;
    upstream: string | null;
    ahead: number;
    behind: number;
    dirty: boolean;
    files: GitFile[];
    sha: string | null;
    remote: string | null;
  };
  runtime: {
    available: boolean;
    base_url: string;
    note?: string;
  };
  external_agents: Array<{
    agent_id: string;
    label: string;
    status: string;
    channel: string;
    allowed_work: string[];
    forbidden_work: string[];
    handoff_doc: string;
    inbox_status: string;
    active_task_id: string;
    active_task_title: string;
    patch_allowed: boolean;
    git_allowed: boolean;
    ready: boolean;
    requires_codex_review: boolean;
  }>;
  handoff: {
    exists: boolean;
    stale: boolean;
    reason: string;
    handoff_sha: string | null;
    current_sha: string | null;
    handoff_round_id: string | null;
    current_round_id: string;
  };
  findings: Array<{
    finding_id: string;
    source: string;
    path: string;
    status: string;
    level: "candidate" | "auto_clean_candidate" | "protected" | "review";
    action: string;
    reason: string;
  }>;
  profile_audits: Array<{
    profile_id: "malex" | "vincent";
    status: string;
    role: string;
    strengths: string[];
    working_style: string[];
    frictions: string[];
    masterbuild_response: string[];
    domain_guidance?: Record<string, string>;
  }>;
  recaps: Array<{
    message_id: string;
    created_at: string;
    sender: "malex" | "vincent";
    recipient: "malex" | "vincent";
    goal_id: string;
    stage_index: number;
    body: string;
    tagline: string;
    status: string;
  }>;
  learning: {
    mode: "proposal_only";
    observations: Array<{
      id: string;
      signal: string;
      proposal: string;
      status: string;
    }>;
    proposals: Array<{
      id: string;
      signal: string;
      proposal: string;
      status: string;
      auto_apply: false;
    }>;
  };
  feature_registry: FeatureRecord[];
  feature_summary: {
    total: number;
    product: Record<string, number>;
    backend: Record<string, number>;
    ui: Record<string, number>;
    release: Record<string, number>;
    likely_missing: number;
  };
  design_rules: DesignRule[];
  ui_bible: {
    version: string;
    path: string;
  };
  ui_conformance: {
    schema_version: number;
    bible_version: string;
    artifacts: UiConformanceArtifact[];
    candidate_findings: Array<{
      finding_id: string;
      artifact_id: string;
      rule_ids: string[];
      body: string;
      status: "candidate";
      auto_apply: false;
    }>;
    validation: { valid: boolean; errors: string[] };
    summary: {
      total: number;
      conformant: number;
      audit_required: number;
      blocked: number;
      promotion_allowed: number;
    };
    evaluations: UiConformanceEvaluation[];
  };
  workboard: {
    active_round_id: string;
    authorizations: Array<{
      authorization_id: string;
      round_id: string;
      actor: string;
      scope: string;
      status: string;
      granted_at: string;
      excluded: string[];
    }>;
    work_packages: WorkPackage[];
  };
  source_registry: SourceRecord[];
};

export type SensitiveAction = {
  action: string;
  label: string;
  command: string;
  risk: string;
  executable: false;
  validation_required: true;
  gate: string;
  scope: GitFile[];
};

export type Handoff = {
  path: string;
  prompt: string;
  content: string;
};
