const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";
    const message = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    if (logLevel === "error") {
      console.error(message);
      return;
    }

    if (logLevel === "warn") {
      console.warn(message);
      return;
    }

    console.log(message);
  });

  next();
};

module.exports = { requestLogger };
