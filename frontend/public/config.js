// Runtime configuration, loaded before the app.
// Leave apiBaseUrl empty to use VITE_API_BASE_URL (or the default http://localhost:8080).
// The Docker image overwrites this file from the VITE_API_BASE_URL environment variable
// each time the container starts, so the backend URL can change without a rebuild.
window.__APP_CONFIG__ = { apiBaseUrl: "" };
