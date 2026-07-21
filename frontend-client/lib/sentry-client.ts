type SentryClient = typeof import("@sentry/nextjs");
type SentryTask = (client: SentryClient) => void;

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
const tracesSampleRate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0");
const pendingTasks: SentryTask[] = [];
const earlyErrors: unknown[] = [];

let clientPromise: Promise<SentryClient | null> | null = null;
let loadScheduled = false;
let earlyErrorListenersInstalled = false;

function captureEarlyError(event: ErrorEvent) {
  if (earlyErrors.length < 10) earlyErrors.push(event.error ?? new Error(event.message));
}

function captureEarlyRejection(event: PromiseRejectionEvent) {
  if (earlyErrors.length < 10) earlyErrors.push(event.reason);
}

function installEarlyErrorBuffer() {
  if (!dsn || earlyErrorListenersInstalled || typeof window === "undefined") return;

  earlyErrorListenersInstalled = true;
  window.addEventListener("error", captureEarlyError);
  window.addEventListener("unhandledrejection", captureEarlyRejection);
}

function removeEarlyErrorBuffer() {
  if (!earlyErrorListenersInstalled || typeof window === "undefined") return;

  window.removeEventListener("error", captureEarlyError);
  window.removeEventListener("unhandledrejection", captureEarlyRejection);
  earlyErrorListenersInstalled = false;
}

export function loadSentryClient() {
  if (!dsn) return Promise.resolve(null);
  if (clientPromise) return clientPromise;

  clientPromise = import("@sentry/nextjs")
    .then((client) => {
      client.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
        tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0,
        sendDefaultPii: false,
      });

      removeEarlyErrorBuffer();
      earlyErrors.splice(0).forEach((error) => client.captureException(error));
      pendingTasks.splice(0).forEach((task) => task(client));
      return client;
    })
    .catch((error) => {
      clientPromise = null;
      loadScheduled = false;
      console.warn("Unable to initialize frontend error tracking", error);
      return null;
    });

  return clientPromise;
}

export function scheduleSentryClient() {
  if (!dsn || loadScheduled || typeof window === "undefined") return;

  installEarlyErrorBuffer();
  loadScheduled = true;

  const loadWhenIdle = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => void loadSentryClient(), { timeout: 2_000 });
      return;
    }
    globalThis.setTimeout(() => void loadSentryClient(), 1_000);
  };
  const loadAfterCriticalRender = () => {
    globalThis.setTimeout(loadWhenIdle, 3_000);
  };

  if (document.readyState === "complete") loadAfterCriticalRender();
  else window.addEventListener("load", loadAfterCriticalRender, { once: true });
}

export function runWithSentry(task: SentryTask, { immediate = false } = {}) {
  if (!dsn) return;

  if (clientPromise) {
    void clientPromise.then((client) => {
      if (client) task(client);
    });
    return;
  }

  if (pendingTasks.length < 100) pendingTasks.push(task);
  if (immediate) void loadSentryClient();
  else scheduleSentryClient();
}
