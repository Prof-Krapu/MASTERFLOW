import type {
  Handoff,
  DesignPreflight,
  LocalProfile,
  MasterbuildStatus,
  SensitiveAction
} from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {})
    }
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? `Erreur HTTP ${response.status}`);
  }
  return body as T;
}

export const masterbuildApi = {
  status: () => request<MasterbuildStatus>("/control-api/status"),
  saveProfile: (profile: Partial<LocalProfile>) =>
    request<LocalProfile>("/control-api/profile", {
      method: "POST",
      body: JSON.stringify(profile)
    }),
  updateGoal: (goal: { stage_index: number; status?: string }) =>
    request<MasterbuildStatus["state"]>("/control-api/goals", {
      method: "POST",
      body: JSON.stringify(goal)
    }),
  designPreflight: (payload: {
    surface: string;
    audience: string;
    contributor: "malex" | "vincent";
    feature_id?: string;
    context?: string;
  }) =>
    request<DesignPreflight>("/control-api/design-preflight", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateWorkPackage: (payload: {
    work_package_id: string;
    status: string;
    owner?: string;
  }) =>
    request<MasterbuildStatus["workboard"]>("/control-api/work-packages", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  prepareExport: () =>
    request<{ markdown_path: string; json_path: string }>("/control-api/exports/prepare", {
      method: "POST",
      body: "{}"
    }),
  prepareAction: (action: string) =>
    request<SensitiveAction>("/control-api/actions/prepare", {
      method: "POST",
      body: JSON.stringify({ action })
    }),
  prepareHandoff: () =>
    request<Handoff>("/control-api/handoff/prepare", {
      method: "POST",
      body: "{}"
    }),
  sendRecap: (payload: {
    sender: "malex" | "vincent";
    recipient: "malex" | "vincent";
    body: string;
  }) =>
    request<{ messages: MasterbuildStatus["recaps"] }>("/control-api/recaps", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  addLearningProposal: (payload: { signal: string; proposal: string }) =>
    request<MasterbuildStatus["learning"]>("/control-api/learning/proposals", {
      method: "POST",
      body: JSON.stringify(payload)
    })
};
