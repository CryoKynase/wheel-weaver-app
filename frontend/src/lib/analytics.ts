const GA_MEASUREMENT_ID = "G-7PLZ4MZWMN";

const CONSENT_KEY = "wheelweaver.analytics.consent";
const INTERNAL_TRAFFIC_KEY = "wheelweaver.analytics.internal";
const DEBUG_KEY = "wheelweaver.analytics.debug";
const CONSENT_GRANTED = "granted";
const CONSENT_DENIED = "denied";

type AnalyticsParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __gaEnabled?: boolean;
  }
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readStoredBoolean(key: string) {
  if (!isBrowser()) {
    return false;
  }
  return window.localStorage.getItem(key) === "true";
}

function writeStoredBoolean(key: string, value: boolean) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(key, value ? "true" : "false");
}

export function isAnalyticsEnabled() {
  if (!isBrowser()) {
    return false;
  }
  if (!import.meta.env.PROD) {
    return false;
  }
  if (window.__gaEnabled === false) {
    return false;
  }
  return typeof window.gtag === "function";
}

export function hasAnalyticsConsent() {
  if (!isBrowser()) {
    return false;
  }
  return window.localStorage.getItem(CONSENT_KEY) === CONSENT_GRANTED;
}

export function grantAnalyticsConsent() {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(CONSENT_KEY, CONSENT_GRANTED);
  if (!isAnalyticsEnabled()) {
    return;
  }
  window.gtag?.("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "granted",
  });
  applyAnalyticsPreferences();
}

export function revokeAnalyticsConsent() {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(CONSENT_KEY, CONSENT_DENIED);
  if (!isAnalyticsEnabled()) {
    return;
  }
  window.gtag?.("consent", "update", {
    analytics_storage: "denied",
    ad_storage: "denied",
  });
}

export function isInternalTrafficEnabled() {
  return readStoredBoolean(INTERNAL_TRAFFIC_KEY);
}

export function setInternalTrafficEnabled(enabled: boolean) {
  writeStoredBoolean(INTERNAL_TRAFFIC_KEY, enabled);
  applyAnalyticsPreferences();
}

export function isDebugModeEnabled() {
  return readStoredBoolean(DEBUG_KEY);
}

export function setDebugModeEnabled(enabled: boolean) {
  writeStoredBoolean(DEBUG_KEY, enabled);
  applyAnalyticsPreferences();
}

export function applyAnalyticsPreferences() {
  if (!isAnalyticsEnabled() || !hasAnalyticsConsent()) {
    return;
  }
  const internalTraffic = isInternalTrafficEnabled();
  const debugMode = isDebugModeEnabled();
  window.gtag?.("set", "user_properties", {
    internal_traffic: internalTraffic ? "true" : "false",
  });
  window.gtag?.("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
    debug_mode: debugMode,
  });
}

export function trackPageView(path?: string) {
  if (!isAnalyticsEnabled() || !hasAnalyticsConsent()) {
    return;
  }
  const payload: AnalyticsParams = {
    page_path: path ?? `${window.location.pathname}${window.location.search}`,
    page_location: window.location.href,
    page_title: document.title,
  };
  if (isDebugModeEnabled()) {
    payload.debug_mode = true;
  }
  window.gtag?.("event", "page_view", payload);
}

export function trackEvent(name: string, params?: AnalyticsParams) {
  if (!isAnalyticsEnabled() || !hasAnalyticsConsent()) {
    return;
  }
  const payload = { ...(params ?? {}) };
  if (isDebugModeEnabled()) {
    payload.debug_mode = true;
  }
  window.gtag?.("event", name, payload);
}
