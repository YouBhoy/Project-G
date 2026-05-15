function normalizeBaseUrl(value, fallback) {
	return String(value || fallback).trim();
}

export const MAIN_API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL, 'http://localhost:3001');
export const CALENDAR_API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_CALENDAR_API_BASE_URL, 'http://localhost:3002');
export const CALENDAR_API_BASE = CALENDAR_API_BASE_URL;
