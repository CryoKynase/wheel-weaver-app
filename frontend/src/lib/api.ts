import type {
  PatternRequest,
  PatternResponse,
  PresetDetail,
  PresetSummary,
} from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

async function handleResponse(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed (${response.status}): ${text}`);
  }
  return response.json();
}

export async function computePattern(
  req: PatternRequest
): Promise<PatternResponse> {
  const response = await fetch(`${API_BASE}/api/pattern/compute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return handleResponse(response);
}

export async function fetchReadme(): Promise<{ markdown: string }> {
  const response = await fetch(`${API_BASE}/api/readme`);
  return handleResponse(response);
}

export async function listPresets(): Promise<PresetSummary[]> {
  const response = await fetch(`${API_BASE}/api/presets`);
  return handleResponse(response);
}

export async function createPreset(
  name: string,
  params: PatternRequest
): Promise<PresetDetail> {
  const response = await fetch(`${API_BASE}/api/presets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, params }),
  });
  return handleResponse(response);
}

export async function getPreset(id: string): Promise<PresetDetail> {
  const response = await fetch(`${API_BASE}/api/presets/${id}`);
  return handleResponse(response);
}

export async function updatePreset(
  id: string,
  name?: string,
  params?: PatternRequest
): Promise<PresetDetail> {
  const response = await fetch(`${API_BASE}/api/presets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, params }),
  });
  return handleResponse(response);
}

export async function deletePreset(id: string): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE}/api/presets/${id}`, {
    method: "DELETE",
  });
  return handleResponse(response);
}
