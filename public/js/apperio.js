// One logger for the whole shop. Config comes from /config.js, written at build time.
import { Apperio } from "/vendor/apperio.js";

const config = window.__SHOP_CONFIG__ || {};

export const release = config.release || "dev";

export const logger =
  config.apiKey && config.projectId
    ? new Apperio({
        apiKey: config.apiKey,
        projectId: config.projectId,
        environment: "production",
        serviceName: "demo-shop",
        release,
        autoCapture: {
          errors: true,
          performance: true,
          userInteractions: true,
          networkRequests: true,
          consoleMessages: true,
          pageViews: true,
        },
        sanitization: { enabled: true },
        replay: { enabled: true, sampleRate: 0.25 },
      })
    : null;
