// DEV: Vite env → localhost fallback
// PROD: Vite env ONLY (ignore window.APP_CONFIG)
const isDev = !!(import.meta && import.meta.env && import.meta.env.DEV);

const viteApi = import.meta?.env?.VITE_API_BASE_URL;
const viteFrontend = import.meta?.env?.VITE_FRONTEND_BASE_URL;

const LOCAL_API = 'http://localhost:5089/api';
const LOCAL_FE = 'http://localhost:5173';

export const API_BASE_URL = isDev
  ? (viteApi || LOCAL_API)
  : (viteApi || (window.APP_CONFIG?.API_BASE_URL) || LOCAL_API);

export const FRONTEND_BASE_URL = isDev
  ? (viteFrontend || LOCAL_FE)
  : (viteFrontend || (window.APP_CONFIG?.FRONTEND_BASE_URL) || LOCAL_FE);

export const getBackendOrigin = () => {
  const url = (API_BASE_URL || '').replace(/\/+$/, '');
  return url.endsWith('/api') ? url.slice(0, -4) : url;
};

export const getAllowedOrigins = () => {
  const origins = [
    typeof window !== 'undefined' ? window.location.origin : undefined,
    getBackendOrigin(),
    FRONTEND_BASE_URL
  ].filter(Boolean);
  return Array.from(new Set(origins));
};
