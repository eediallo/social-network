// API configuration
// In Docker deployment, use relative URLs so Nginx can proxy them
// In development, use absolute URLs to bypass Vite dev server
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:8080' : '';

export default API_BASE_URL;
