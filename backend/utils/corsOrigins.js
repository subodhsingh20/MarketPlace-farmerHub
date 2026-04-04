const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost",
  "http://localhost:3000",
  "http://127.0.0.1",
  "http://127.0.0.1:3000",
];

const CLIENT_ORIGIN_ENV_KEYS = [
  "CLIENT_URL",
  "CLIENT_ORIGIN",
  "CORS_ALLOWED_ORIGINS",
];

const normalizeOrigin = (origin) => {
  if (!origin) {
    return "";
  }

  return String(origin)
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "")
    .toLowerCase();
};

const getAllowedOrigins = () => {
  const configuredClientOrigins = CLIENT_ORIGIN_ENV_KEYS.flatMap((envKey) =>
    String(process.env[envKey] || "")
      .split(",")
      .map((origin) => normalizeOrigin(origin))
      .filter(Boolean)
  );

  return [...new Set([...DEFAULT_CLIENT_ORIGINS.map(normalizeOrigin), ...configuredClientOrigins])];
};

const isLocalDevelopmentOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    return ["localhost", "127.0.0.1"].includes(parsed.hostname);
  } catch (_error) {
    return false;
  }
};

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  if (isLocalDevelopmentOrigin(normalizedOrigin)) {
    return true;
  }

  return getAllowedOrigins().includes(normalizedOrigin);
};

module.exports = {
  CLIENT_ORIGIN_ENV_KEYS,
  getAllowedOrigins,
  isAllowedOrigin,
  normalizeOrigin,
};
