import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { chromium } from "playwright";
import { unzipSync } from "fflate";
import { packageRayenExtension } from "./package-extension.mjs";

// Real Chrome returns no cookies from chrome.cookies.getAll({ url }) for the
// Exalab session while chrome.cookies.get finds it, so only a browser run proves
// that the consent page hands a signed-in session to the gateway.
const packageDirectory = await mkdtemp(
  path.join(os.tmpdir(), "hhr-extension-exalab-"),
);
const extensionPath = path.join(packageDirectory, "extension");
for (const [name, bytes] of Object.entries(
  unzipSync(packageRayenExtension(process.cwd()).zip),
)) {
  const file = path.join(extensionPath, name);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, bytes);
}
// Automation cannot answer Chrome's permission prompt, so the test copy holds the
// optional grants up front; chrome.permissions.request then resolves without a prompt.
const manifestPath = path.join(extensionPath, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.permissions.push(...manifest.optional_permissions);
manifest.host_permissions.push(...manifest.optional_host_permissions);
await writeFile(manifestPath, JSON.stringify(manifest));

const hhrOrigin = "http://localhost:3001";
const pair = "S".repeat(43);
const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  headless: true,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
});

try {
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker", { timeout: 15_000 }));
  const extensionId = new URL(worker.url()).host;

  // Exalab lands on its portal after ClaveÚnica; the session cookie is site-wide.
  await context.route("https://exalab.saludoriente.cl/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      headers: {
        "Set-Cookie": "PHPSESSID=synthetic-session; path=/",
      },
      body: "<!doctype html><title>EXALAB - SSMO</title>",
    }),
  );
  const connectRequests = [];
  await context.route(`${hhrOrigin}/.netlify/functions/exalab-proxy**`, (route) => {
    connectRequests.push(JSON.parse(route.request().postData() || "{}"));
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, connected: true }),
    });
  });
  const exalab = await context.newPage();
  await exalab.goto("https://exalab.saludoriente.cl/pantalla_ssmo/pantallassmo.php");

  const consent = await context.newPage();
  await consent.goto(
    `chrome-extension://${extensionId}/exalab-connect.html#${new URLSearchParams({ pair, origin: hhrOrigin })}`,
  );
  await consent.click("#connect");
  await consent.waitForFunction(
    () => !document.getElementById("connect").disabled,
  );

  assert.equal(
    (await consent.textContent("#status")).trim(),
    "Sesión conectada. Puedes cerrar esta pestaña.",
  );
  assert.equal(connectRequests.length, 1, "The gateway never received the session");
  assert.equal(connectRequests[0].pair, pair);
  assert.deepEqual(connectRequests[0].session.cookies, [
    {
      name: "PHPSESSID",
      value: "synthetic-session",
      domain: "exalab.saludoriente.cl",
    },
  ]);
  // Consent is remembered: an HHR tab now reconnects through the worker with no consent page.
  await context.route(`${hhrOrigin}/`, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>HHR</title>" }),
  );
  const hhr = await context.newPage();
  await hhr.goto(`${hhrOrigin}/`);
  const ask = (type, extra = {}) =>
    hhr.evaluate(
      ({ type, extra }) =>
        new Promise((resolve, reject) => {
          const reqId = crypto.randomUUID();
          const timer = setTimeout(() => reject(new Error("no relay answer for " + type)), 10_000);
          window.addEventListener("message", (event) => {
            if (event.data?.type === type + "_RESULT" && event.data.reqId === reqId) {
              clearTimeout(timer);
              resolve(event.data.result);
            }
          });
          window.postMessage({ type, reqId, ...extra }, window.location.origin);
        }),
      { type, extra },
    );
  // The content script may need a moment after load before it listens.
  let status = null;
  for (let attempt = 0; attempt < 20 && !status; attempt += 1) {
    status = await ask("HHR_EXALAB_SESSION_STATUS").catch(() => null);
  }
  assert.deepEqual(status, { permission: true, autoConnect: true, session: true });
  const automatic = await ask("HHR_EXALAB_AUTO_CONNECT", { pair: "A".repeat(43) });
  assert.deepEqual(automatic, { connected: true, reason: "connected" });
  assert.equal(connectRequests.length, 2, "The silent reconnection never reached the gateway");
  assert.equal(connectRequests[1].pair, "A".repeat(43));
  assert.deepEqual(connectRequests[1].session.cookies, connectRequests[0].session.cookies);
  console.log("Exalab consent runtime smoke passed (session cookie reaches the gateway; silent reconnection works).");
} finally {
  await context.close();
  await rm(packageDirectory, { recursive: true, force: true });
}
