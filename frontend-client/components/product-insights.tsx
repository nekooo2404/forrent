"use client";

import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { useCallback, useEffect } from "react";
import { runWithSentry } from "@/lib/sentry-client";

type MetricAttributes = Record<string, boolean | number | string>;

export function recordProductMetric(stage: string, attributes: MetricAttributes = {}) {
  runWithSentry((client) => {
    client.metrics.count("forrent.product.funnel", 1, { attributes: { stage, ...attributes } });
  });
}

export function recordProductDistribution(name: string, value: number, unit = "millisecond") {
  if (!Number.isFinite(value)) return;
  runWithSentry((client) => {
    client.metrics.distribution(`forrent.product.${name}`, value, { unit });
  });
}

function stableAttributes(attributes: MetricAttributes) {
  return JSON.stringify(attributes, Object.keys(attributes).sort());
}

export function ProductInsights() {
  const pathname = usePathname();
  const reportWebVital = useCallback((metric: { name: string; value: number }) => {
    runWithSentry((client) => {
      client.metrics.distribution(`forrent.web_vital.${metric.name.toLowerCase()}`, metric.value, {
        ...(metric.name === "CLS" ? {} : { unit: "millisecond" }),
      });
    });
  }, []);

  useReportWebVitals(reportWebVital);

  useEffect(() => {
    const stage =
      pathname === "/"
        ? "homepage_viewed"
        : pathname === "/rooms"
          ? "room_results_viewed"
          : pathname.startsWith("/rooms/")
            ? "room_detail_viewed"
            : pathname === "/contact"
              ? "contact_form_viewed"
              : null;
    if (stage) recordProductMetric(stage);
  }, [pathname]);

  useEffect(() => {
    function handleSubmit(event: Event) {
      if (!(event.target instanceof HTMLFormElement)) return;
      const stage = event.target.dataset.productEvent;
      if (stage) recordProductMetric(stage);
    }

    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  return null;
}

export function ProductMetric({
  attributes = {},
  stage,
}: Readonly<{ attributes?: MetricAttributes; stage: string }>) {
  const serializedAttributes = stableAttributes(attributes);

  useEffect(() => {
    recordProductMetric(stage, JSON.parse(serializedAttributes) as MetricAttributes);
  }, [stage, serializedAttributes]);

  return null;
}
