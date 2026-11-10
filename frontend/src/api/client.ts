import type { CheckRequest, CheckResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Sends user test to the backend grammar-checking endpoint
export async function checkText(text: string, signal?: AbortSignal): Promise<CheckResponse> {
  const response = await fetch(`${API_URL}/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text } as CheckRequest),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to check text: ${response.status} ${response.statusText}`);
  }

  const data: CheckResponse = await response.json();
  return data;
}
