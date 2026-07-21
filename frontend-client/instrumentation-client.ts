import { runWithSentry, scheduleSentryClient } from "@/lib/sentry-client";

scheduleSentryClient();

export function onRouterTransitionStart(href: string, navigationType: string) {
  runWithSentry((client) => client.captureRouterTransitionStart(href, navigationType), {
    immediate: true,
  });
}
