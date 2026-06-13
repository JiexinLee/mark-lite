export interface ApiClient {
  baseUrl: string
  defaultHeaders: Record<string, string>
}

export function createDesktopApiClient(): ApiClient {
  return {
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001/api',
    defaultHeaders: {
      'Content-Type': 'application/json',
    },
  }
}

export async function requestJson<T>(
  client: ApiClient,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${client.baseUrl}${path}`, {
    ...init,
    headers: {
      ...client.defaultHeaders,
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return response.json() as Promise<T>
}
