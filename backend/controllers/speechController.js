const IBM_IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token";
const TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

let cachedIamToken = null;

function getSpeechServiceUrl() {
  const serviceUrl = process.env.IBM_STT_URL || "";
  if (!serviceUrl) {
    throw new Error("IBM_STT_URL is not configured.");
  }

  const normalizedUrl = new URL(serviceUrl);
  normalizedUrl.protocol = "wss:";
  normalizedUrl.pathname = normalizedUrl.pathname.replace(/\/$/, "");

  return normalizedUrl.toString();
}

async function fetchIamToken(apiKey) {
  const response = await fetch(IBM_IAM_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "urn:ibm:params:oauth:grant-type:apikey",
      apikey: apiKey,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error_description || payload?.error || "Failed to generate IBM IAM token.";
    throw new Error(message);
  }

  if (!payload?.access_token || !payload?.expires_in) {
    throw new Error("IBM IAM token response was incomplete.");
  }

  return {
    accessToken: payload.access_token,
    expiresIn: Number(payload.expires_in),
    expiration: Number(payload.expiration || 0),
  };
}

async function getCachedIamToken(apiKey) {
  const now = Date.now();

  if (cachedIamToken && cachedIamToken.expiresAt - now > TOKEN_REFRESH_BUFFER_MS) {
    return cachedIamToken;
  }

  const freshToken = await fetchIamToken(apiKey);
  const expiresAt = freshToken.expiration
    ? freshToken.expiration * 1000
    : now + freshToken.expiresIn * 1000;

  cachedIamToken = {
    accessToken: freshToken.accessToken,
    expiresAt,
    expiresIn: freshToken.expiresIn,
  };

  return cachedIamToken;
}

async function getSpeechToTextConfig(_req, res) {
  try {
    const apiKey = process.env.IBM_STT_APIKEY || "";

    if (!apiKey) {
      return res.status(500).json({
        message: "IBM speech-to-text is not configured on the server.",
      });
    }

    const serviceUrl = getSpeechServiceUrl();
    const token = await getCachedIamToken(apiKey);
    const model = process.env.IBM_STT_MODEL || "en-US";

    return res.json({
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
      model,
      wsUrl: serviceUrl,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Unable to initialize IBM speech-to-text.",
    });
  }
}

module.exports = {
  getSpeechToTextConfig,
};
