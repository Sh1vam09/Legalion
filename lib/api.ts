const FALLBACK_API_URL = "http://127.0.0.1:8000";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || FALLBACK_API_URL
).replace(/\/+$/, "");

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Could not reach the analysis server. Check the deployed backend URL and CORS settings.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
