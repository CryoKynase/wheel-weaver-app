import type { PatternRequest, PatternResponse } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8007";

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
