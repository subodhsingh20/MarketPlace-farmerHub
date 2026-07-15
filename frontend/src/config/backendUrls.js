const CURRENT_BACKEND_URL = "https://marketplace-farmerhub-19dm.onrender.com";

const LEGACY_BACKEND_URLS = new Set([
  "https://farmer-marketplace-l6p1.onrender.com",
]);

const normalizeBackendUrl = (value) => {
  if (!value) {
    return "";
  }

  return String(value).trim().replace(/\/+$/, "");
};

const replaceLegacyBackendUrl = (url) =>
  LEGACY_BACKEND_URLS.has(url) ? CURRENT_BACKEND_URL : url;

export const getApiBaseUrl = (configuredUrl, defaultUrl = "") => {
  const normalizedUrl = normalizeBackendUrl(configuredUrl);
  const apiSuffix = "/api";

  if (normalizedUrl.endsWith(apiSuffix)) {
    const backendUrl = normalizedUrl.slice(0, -apiSuffix.length);
    return `${replaceLegacyBackendUrl(backendUrl)}${apiSuffix}`;
  }

  const fallbackUrl = normalizeBackendUrl(defaultUrl);
  return normalizedUrl || fallbackUrl;
};

export const getSocketBaseUrl = (configuredUrl, defaultUrl = "") => {
  const normalizedUrl = normalizeBackendUrl(configuredUrl);
  const fallbackUrl = normalizeBackendUrl(defaultUrl);

  return replaceLegacyBackendUrl(normalizedUrl || fallbackUrl);
};
