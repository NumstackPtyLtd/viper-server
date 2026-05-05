import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});
// webhook test
// e2e test 1778009917
