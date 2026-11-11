/**
 * UrbanSense AI - Frontend API Client & Endpoint Configuration
 *
 * Provides centralized backend URL resolution supporting:
 * 1. Local development (proxies /api and /health to http://localhost:8000 by default)
 * 2. Public Vercel deployment (uses VITE_API_BASE_URL pointing to the deployed FastAPI backend)
 */

// Read VITE_API_BASE_URL from Vite environment (stripping trailing slash)
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

/**
 * Returns the fully qualified URL for an API endpoint.
 * - In local dev (when VITE_API_BASE_URL is unset): returns relative path (e.g. "/api/events")
 * - In production (when VITE_API_BASE_URL is set): returns full URL (e.g. "https://api.domain.com/api/events")
 * - If path is already an absolute HTTP/HTTPS URL: returns as-is.
 *
 * @param {string} path - API endpoint path (e.g., "/api/events" or "health")
 * @returns {string} Fully qualified or proxied URL
 */
export function apiUrl(path = "") {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

/**
 * Standard fetch wrapper that automatically applies apiUrl().
 *
 * @param {string} path - Target API route
 * @param {RequestInit} [options] - Standard fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options) {
  return fetch(apiUrl(path), options);
}

