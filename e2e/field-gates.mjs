#!/usr/bin/env node
import { chromium, devices } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_BASE_URL = process.env.FIELD_BASE_URL || "https://forrent.io.vn";
const DEFAULT_OUTPUT = process.env.FIELD_OUTPUT || "../output/ui-ux-field-evidence.json";

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    headed: false,
    output: DEFAULT_OUTPUT,
    roomPath: process.env.FIELD_ROOM_PATH || "",
    strict: false,
    throttle: true,
    transitions: Number.parseInt(process.env.FIELD_TRANSITIONS || "20", 10),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--base-url") args.baseUrl = argv[++index] || args.baseUrl;
    else if (arg === "--room-path") args.roomPath = argv[++index] || "";
    else if (arg === "--output") args.output = argv[++index] || args.output;
    else if (arg === "--transitions") args.transitions = Number.parseInt(argv[++index] || "20", 10);
    else if (arg === "--headed") args.headed = true;
    else if (arg === "--strict") args.strict = true;
    else if (arg === "--no-throttle") args.throttle = false;
  }

  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  args.transitions = Number.isFinite(args.transitions) && args.transitions > 0 ? args.transitions : 20;
  return args;
}

function printHelp() {
  console.log(`ForRent UI/UX field gates

Usage:
  npm run field:ui-ux -- --base-url https://forrent.io.vn --room-path /rooms/<slug>

Options:
  --base-url <url>      Production/staging base URL. Default: ${DEFAULT_BASE_URL}
  --room-path <path>    Room detail path used for gallery transition measurement.
  --transitions <n>     Number of next-media transitions to measure. Default: 20
  --output <path>       JSON evidence output path. Default: ${DEFAULT_OUTPUT}
  --headed              Open a visible browser.
  --no-throttle         Disable mobile 4G throttling.
  --strict              Exit non-zero when a measurable gate fails.
`);
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function summarizeGate(name, status, evidence, recommendation = "") {
  return { evidence, name, recommendation, status };
}

function releaseGateRow(gate, status, evidence, link) {
  return { evidence, gate, link, status: status.toUpperCase() };
}

async function ensureOutputPath(outputPath) {
  await fs.mkdir(path.dirname(path.resolve(outputPath)), { recursive: true });
}

function outputSibling(outputPath, filename) {
  return path.join(path.dirname(path.resolve(outputPath)), filename);
}

function outputDisplaySibling(outputPath, filename) {
  return path.join(path.dirname(outputPath), filename).replace(/\\/g, "/");
}

function markdownEscape(value) {
  return String(value || "").replace(/\n/g, "<br>").replace(/\|/g, "\\|");
}

function releaseRows(evidence, outputs) {
  const heroGate = evidence.gates.find((gate) => gate.name === "Hero uses a real listing image before fallback");
  const galleryGate = evidence.gates.find((gate) => gate.name === "Cold 4G gallery transition p75 under 1 second");
  const heroStatus = heroGate?.status === "fail" ? "FAIL" : "OPEN";
  const heroEvidence = heroGate?.status === "pass"
    ? `Technical pass: ${heroGate.evidence}. Reviewer approval is still required before closing this gate.`
    : heroGate?.evidence || "Hero field probe did not run.";
  const galleryTransitionCount = Number.parseInt(galleryGate?.evidence.match(/transitions=(\d+)/)?.[1] || "0", 10);
  const galleryReleaseReady = galleryGate?.status === "pass" && evidence.throttling.enabled && galleryTransitionCount >= 20;
  const galleryStatus = galleryGate?.status === "fail" ? "FAIL" : galleryReleaseReady ? "PASS" : "OPEN";
  const galleryEvidence = galleryReleaseReady || galleryGate?.status === "fail"
    ? galleryGate.evidence
    : `${galleryGate?.evidence || "Gallery field probe did not run."}. Release gate requires mobile 4G throttling and at least 20 transitions.`;

  return [
    releaseGateRow("Hero uses a representative real room photo", heroStatus, heroEvidence, evidence.hero_screenshot || outputs.markdown),
    releaseGateRow("Source photo quality is consistent", "OPEN", "Requires manual review of at least 10 published listings for framing, lighting, aspect ratio, and no internal-code marks.", "Attach photo review sample to the release note."),
    releaseGateRow("Cold 4G gallery transition stays under 1 second", galleryStatus, galleryEvidence, outputs.json),
    releaseGateRow("Swipe works on physical iOS/Android", "OPEN", "Requires physical iPhone Safari and Android Chrome swipe evidence in portrait and landscape.", "Attach device checklist or video."),
    releaseGateRow("Sendify received/scheduled emails deliver", "OPEN", "Requires Sendify message IDs, inbox screenshots, and retry/failure log check.", "Attach provider and inbox evidence."),
    releaseGateRow("Form funnel has real abandonment data", "OPEN", "Requires Sentry/RUM dashboard showing search, detail view, submit start, submit fail, and submit success.", "Attach dashboard export."),
    releaseGateRow("Sendify outage path is recoverable", "OPEN", "Requires staging chaos test with provider/API blocked and Celery retry observed.", "Attach chaos-test log."),
    releaseGateRow("Screen reader flow works", "OPEN", "Requires VoiceOver Safari and NVDA Chrome task transcript for navigation, filters, gallery, auth, and request form.", "Attach transcript."),
    releaseGateRow("Physical iOS/Android full mobile pass", "OPEN", "Requires device/browser/version matrix covering keyboard, scroll, filters, gallery, video, auth, and request form.", "Attach device matrix."),
    releaseGateRow("Usability test validates the experience", "OPEN", "Requires at least five target renters with task completion, errors, time on task, and observed abandonment points.", "Attach study notes."),
    releaseGateRow("Search-to-scheduled funnel is measurable", "OPEN", "Requires dashboard or export proving find room -> open detail -> send request -> admin schedules viewing.", "Attach funnel dashboard."),
    releaseGateRow("Zero-result/form-failure/time metrics arrive", "OPEN", "Requires production Sentry/RUM events with event names and sample payloads.", "Attach telemetry samples."),
    releaseGateRow("Real Core Web Vitals p75 is healthy", "OPEN", "Requires production LCP, INP, CLS p75 for mobile and desktop after enough real traffic.", "Attach CWV dashboard."),
  ];
}

async function writeEvidence(outputPath, evidence) {
  await ensureOutputPath(outputPath);
  await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

  const mdPath = outputPath.replace(/\.json$/i, ".md");
  const rows = evidence.gates
    .map((gate) => `| ${markdownEscape(gate.name)} | ${markdownEscape(gate.status)} | ${markdownEscape(gate.evidence)} |`)
    .join("\n");
  const outputs = { json: outputPath, markdown: mdPath };
  const releaseTableRows = releaseRows(evidence, outputs)
    .map((row) => `| ${markdownEscape(row.gate)} | ${markdownEscape(row.status)} | ${markdownEscape(row.evidence)} | ${markdownEscape(row.link)} |`)
    .join("\n");
  const markdown = `# UI/UX Field Evidence

- Generated at: ${evidence.generated_at}
- Base URL: ${evidence.base_url}
- Room path: ${evidence.room_path || "not provided"}
- Device profile: ${evidence.device}
- Throttling: ${evidence.throttling.enabled ? `${evidence.throttling.latency_ms}ms latency, ${evidence.throttling.download_kbps}kbps down` : "disabled"}

| Gate | Status | Evidence |
| --- | --- | --- |
${rows}

## Release Evidence Rows

Copy this table into \`docs/releases/ui-ux-field-evidence-template.md\` for this release.
Rows left as \`OPEN\` still need human, device, provider, or production telemetry evidence.

| Gate | Status | Evidence | Link |
| --- | --- | --- | --- |
${releaseTableRows}
`;
  await fs.writeFile(mdPath, markdown, "utf8");
  return outputs;
}

async function applyMobile4GThrottle(context, page, enabled) {
  if (!enabled) return;
  const session = await context.newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.emulateNetworkConditions", {
    downloadThroughput: (1600 * 1024) / 8,
    latency: 150,
    offline: false,
    uploadThroughput: (750 * 1024) / 8,
  });
}

async function measureHero(page, baseUrl, outputPath) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const hero = page.getByTestId("homepage-hero");
  await hero.waitFor({ state: "visible", timeout: 15_000 });

  const source = await hero.getAttribute("data-hero-source");
  const roomId = await hero.getAttribute("data-hero-room-id");
  const roomSlug = await hero.getAttribute("data-hero-room-slug");
  const imageSrc = await hero.locator("img").first().getAttribute("src");
  const naturalWidth = await hero
    .locator("img")
    .first()
    .evaluate((image) => image instanceof HTMLImageElement ? image.naturalWidth : 0);
  const screenshotPath = outputSibling(outputPath, "homepage-hero.png");
  const screenshotArtifact = outputDisplaySibling(outputPath, "homepage-hero.png");
  await ensureOutputPath(outputPath);
  await hero.screenshot({ path: screenshotPath });

  const fallbackDetected = Boolean(imageSrc?.includes("forrent-hero-old-quarter.jpg"));
  const doubleOptimized = Boolean(imageSrc?.includes("/_next/image?url=https%3A%2F%2Fres.cloudinary.com"));
  const staleBuildDetected = !source && fallbackDetected;
  const status = source === "listing" && naturalWidth > 0 && roomId && roomSlug && !doubleOptimized ? "pass" : "fail";
  const evidenceParts = [
    `data-hero-source=${source || "not-found"}`,
    `room-id=${roomId || "not-found"}`,
    `room-slug=${roomSlug || "not-found"}`,
    `image loaded width=${naturalWidth}`,
    `src=${imageSrc || "not-found"}`,
    `fallback=${fallbackDetected ? "yes" : "no"}`,
    `double-optimized=${doubleOptimized ? "yes" : "no"}`,
    `stale-build=${staleBuildDetected ? "yes" : "no"}`,
    `screenshot=${screenshotArtifact}`,
  ];
  const gate = summarizeGate(
    "Hero uses a real listing image before fallback",
    status,
    evidenceParts.join("; "),
    status === "pass"
      ? ""
      : staleBuildDetected
        ? "Production is serving an old homepage build. Deploy the current frontend build, rebuild frontend_client without cache, and clear reverse proxy/CDN cache."
        : doubleOptimized
          ? "Serve the Cloudinary transformation URL directly; do not route listing media through Next /_next/image."
          : "Ensure at least one recent published room has a primary image and the homepage can fetch listing data.",
  );
  gate.screenshot = screenshotArtifact;
  return gate;
}

async function mainMediaKey(page) {
  return page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return "";
    const media = [...dialog.querySelectorAll("img,video")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return { area: rect.width * rect.height, element, rect, visible: style.visibility !== "hidden" && style.display !== "none" && rect.width > 120 && rect.height > 120 };
      })
      .filter((item) => item.visible)
      .sort((a, b) => b.area - a.area)[0]?.element;

    if (media instanceof HTMLImageElement) return media.currentSrc || media.src || "";
    if (media instanceof HTMLVideoElement) return media.currentSrc || media.src || media.poster || "";
    return "";
  });
}

async function waitForMainMediaChange(page, previousKey, timeoutMs = 5_000) {
  await page.waitForFunction(
    (oldKey) => {
      const dialog = document.querySelector('[role="dialog"]');
      if (!dialog) return false;
      const candidates = [...dialog.querySelectorAll("img,video")]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return { area: rect.width * rect.height, element, visible: style.visibility !== "hidden" && style.display !== "none" && rect.width > 120 && rect.height > 120 };
        })
        .filter((item) => item.visible)
        .sort((a, b) => b.area - a.area);
      const media = candidates[0]?.element;
      if (media instanceof HTMLImageElement) {
        const key = media.currentSrc || media.src || "";
        return key !== oldKey && media.complete && media.naturalWidth > 0;
      }
      if (media instanceof HTMLVideoElement) {
        const key = media.currentSrc || media.src || media.poster || "";
        return key !== oldKey && media.readyState >= 1;
      }
      return false;
    },
    previousKey,
    { timeout: timeoutMs },
  );
}

async function measureGallery(page, baseUrl, roomPath, transitions) {
  if (!roomPath) {
    return summarizeGate(
      "Cold 4G gallery transition p75 under 1 second",
      "skipped",
      "No --room-path provided.",
      "Run again with a production room URL path that has at least two gallery media items.",
    );
  }

  const roomUrl = roomPath.startsWith("http") ? roomPath : `${baseUrl}${roomPath.startsWith("/") ? roomPath : `/${roomPath}`}`;
  await page.goto(roomUrl, { waitUntil: "networkidle" });
  const trigger = page.getByRole("button", { name: /xem .*(ảnh|video|thư viện|nội dung)|ảnh chính/i }).first();
  if (!(await trigger.count())) {
    return summarizeGate("Cold 4G gallery transition p75 under 1 second", "fail", `No gallery trigger found at ${roomUrl}.`);
  }

  await trigger.click();
  const dialog = page.getByRole("dialog").first();
  await dialog.waitFor({ state: "visible", timeout: 15_000 });
  const nextButton = dialog.getByRole("button", { name: /nội dung tiếp theo|tiếp theo|ảnh tiếp theo|video tiếp theo/i }).first();
  if (!(await nextButton.count()) || !(await nextButton.isEnabled())) {
    return summarizeGate("Cold 4G gallery transition p75 under 1 second", "skipped", "Gallery has fewer than two navigable media items.");
  }

  const samples = [];
  for (let index = 0; index < transitions; index += 1) {
    const before = await mainMediaKey(page);
    const startedAt = performance.now();
    await nextButton.click();
    await waitForMainMediaChange(page, before);
    samples.push(Math.round(performance.now() - startedAt));
  }

  const p75 = percentile(samples, 75);
  const status = p75 !== null && p75 < 1000 ? "pass" : "fail";
  return summarizeGate(
    "Cold 4G gallery transition p75 under 1 second",
    status,
    `transitions=${samples.length}; p75=${p75}ms; samples=${samples.join(",")}ms; room=${roomUrl}`,
    status === "pass" ? "" : "Inspect Cloudinary transformation, media dimensions, CDN cache, and preload timing on the deployed build.",
  );
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const browser = await chromium.launch({ headless: !args.headed });
  const context = await browser.newContext({
    ...devices["Pixel 5"],
    locale: "vi-VN",
    timezoneId: "Asia/Bangkok",
  });
  const page = await context.newPage();
  await applyMobile4GThrottle(context, page, args.throttle);

  const evidence = {
    base_url: args.baseUrl,
    device: "Pixel 5 via Chromium",
    generated_at: new Date().toISOString(),
    gates: [],
    room_path: args.roomPath,
    throttling: {
      download_kbps: 1600,
      enabled: args.throttle,
      latency_ms: 150,
      upload_kbps: 750,
    },
  };

  try {
    evidence.gates.push(await measureHero(page, args.baseUrl, args.output));
    evidence.hero_screenshot = evidence.gates[0]?.screenshot || "";
    evidence.gates.push(await measureGallery(page, args.baseUrl, args.roomPath, args.transitions));
  } finally {
    await browser.close();
  }

  const outputs = await writeEvidence(args.output, evidence);
  console.log(`Wrote ${outputs.json}`);
  console.log(`Wrote ${outputs.markdown}`);

  const failed = evidence.gates.some((gate) => gate.status === "fail");
  if (args.strict && failed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
