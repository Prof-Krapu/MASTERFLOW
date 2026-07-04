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

export type MasterbuildStatus = {
  generated_at: string;
  state: {
    updated_at: string;
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
