/** A JSON POST as the app's own pages send it: same origin, from a forwarded client address. */
export function jsonPost(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost',
      'sec-fetch-site': 'same-origin',
      'x-forwarded-for': '203.0.113.7',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}
