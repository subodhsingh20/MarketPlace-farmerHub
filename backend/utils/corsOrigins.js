const DEFAULT_CLIENT_ORIGINS = [
  "http://localhost",
  "http://localhost:3000",
  "http://127.0.0.1",
  "http://127.0.0.1:3000",
];

const normalizeOrigin = (origin) => {
  if (!origin) {
    return "";
  }

  return String(origin).trim().replace(/\/+$/, "").toLowerCase();
};

const getAllowedOrigins = () => {
  const configuredClientOrigins = String(process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);

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
  getAllowedOrigins,
  isAllowedOrigin,
  normalizeOrigin,
};
