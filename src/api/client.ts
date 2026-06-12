export interface ApiClient {
  baseUrl: string;
  defaultHeaders: Record<string, string>;
}

export function createDesktopApiClient(): ApiClient {
  return {
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000",
    defaultHeaders: {
      "Content-Type": "application/json",
    },
  };
}
