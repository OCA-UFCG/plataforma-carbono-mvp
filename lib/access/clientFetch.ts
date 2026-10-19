/** POSTs JSON from a client component. The body is null when the response is not JSON; a network failure throws. */
export async function postJson(path: string, body: unknown): Promise<{ ok: boolean; status: number; body: Record<string, unknown> | null }> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const parsed: unknown = await response.json().catch(() => null)
  return {
    ok: response.ok,
    status: response.status,
    body: parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null,
  }
}
