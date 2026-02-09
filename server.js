import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);
app.use(express.json({ limit: "16kb" }));

const yesLabels = new Set([
  "Ja, auf jeden Fall, aber keine Ahnung was",
  "Ja, auf jeden Fall und ich habe eine Idee",
  "Ja, auf jeden Fall, und ich waehle aus deinen Optionen",
]);

const noLabels = new Set(["Ne, fuck nicht ab", "Ne, schon verplant", "Ne, eher nicht"]);

const planOptions = new Set(["Weserpark+Kino", "Kino", "Schwarzlicht Minigolf"]);

const requestWindowByIp = new Map();
const WINDOW_MS = 4000;
const MAX_TEXT = 500;
const DIST_DIR = path.resolve(__dirname, "dist");
const INDEX_FILE = path.join(DIST_DIR, "index.html");

function normalizeText(value, max = MAX_TEXT) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function validatePayload(payload) {
  const choiceType = normalizeText(payload.choiceType, 30);
  const choiceLabel = normalizeText(payload.choiceLabel, 120);

  if (![
    "yes_no_idea",
    "yes_have_idea",
    "yes_pick_option",
    "no",
  ].includes(choiceType)) {
    return "choiceType is invalid";
  }

  if (choiceType === "no" && !noLabels.has(choiceLabel)) {
    return "choiceLabel is invalid for no";
  }

  if (choiceType !== "no" && !yesLabels.has(choiceLabel)) {
    return "choiceLabel is invalid for yes";
  }

  if (choiceType === "yes_pick_option") {
    const selectedPlanOption = normalizeText(payload.selectedPlanOption, 80);
    if (!planOptions.has(selectedPlanOption)) {
      return "selectedPlanOption is required for yes_pick_option";
    }
  }

  if (choiceType === "yes_have_idea") {
    const ideaText = normalizeText(payload.ideaText, MAX_TEXT);
    if (ideaText.length < 4) {
      return "ideaText is required for yes_have_idea";
    }
  }

  if (choiceType === "no" && Number(payload.noConfirmLevel) !== 3) {
    return "noConfirmLevel must be 3 for no";
  }

  return null;
}

function checkRateLimit(ip) {
  const now = Date.now();
  const previous = requestWindowByIp.get(ip) || 0;

  if (now - previous < WINDOW_MS) {
    return true;
  }

  requestWindowByIp.set(ip, now);

  if (requestWindowByIp.size > 1500) {
    for (const [candidateIp, ts] of requestWindowByIp.entries()) {
      if (now - ts > 15 * WINDOW_MS) {
        requestWindowByIp.delete(candidateIp);
      }
    }
  }

  return false;
}

function buildMailPayload(payload, targetEmail) {
  const subjectPrefix = payload.choiceType === "no" ? "Neue Nein-Antwort" : "Neue Ja-Antwort";

  return {
    to: targetEmail,
    subject: `${subjectPrefix}: ${payload.choiceLabel}`,
    message: {
      respondentName: normalizeText(payload.respondentName, 80) || "anonym",
      choiceType: payload.choiceType,
      choiceLabel: payload.choiceLabel,
      selectedPlanOption: payload.selectedPlanOption || null,
      ideaText: payload.ideaText || null,
      noConfirmLevel: payload.noConfirmLevel || null,
      deadlineIso: payload.deadlineIso,
      submittedAtIso: payload.submittedAtIso,
      clientTz: payload.clientTz,
    },
  };
}

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/api/response", async (req, res) => {
  const body = req.body;

  if (!body || typeof body !== "object") {
    res.status(400).json({ ok: false, message: "Request body must be a JSON object" });
    return;
  }

  const ip = normalizeText(req.ip || req.headers["x-forwarded-for"] || "unknown", 120);
  if (checkRateLimit(ip)) {
    res.status(429).json({ ok: false, message: "Too many requests. Try again shortly." });
    return;
  }

  const validationError = validatePayload(body);
  if (validationError) {
    res.status(400).json({ ok: false, message: validationError });
    return;
  }

  const logicAppUrl = process.env.LOGIC_APP_URL;
  const logicAppSecret = process.env.LOGIC_APP_SHARED_SECRET;
  const targetEmail = process.env.TARGET_EMAIL;

  if (!logicAppUrl || !logicAppSecret || !targetEmail) {
    console.error("Missing Logic App configuration env vars");
    res.status(500).json({ ok: false, message: "Server not configured for mail forwarding" });
    return;
  }

  const requestId = crypto.randomUUID();
  const payload = {
    respondentName: normalizeText(body.respondentName, 80),
    choiceType: normalizeText(body.choiceType, 30),
    choiceLabel: normalizeText(body.choiceLabel, 120),
    selectedPlanOption: normalizeText(body.selectedPlanOption, 80),
    ideaText: normalizeText(body.ideaText, MAX_TEXT),
    noConfirmLevel: Number(body.noConfirmLevel || 0),
    deadlineIso: normalizeText(body.deadlineIso, 40),
    submittedAtIso: normalizeText(body.submittedAtIso, 40),
    clientTz: normalizeText(body.clientTz, 120),
  };

  const mailPayload = buildMailPayload(payload, targetEmail);

  try {
    const logicResponse = await fetch(logicAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-shared-secret": logicAppSecret,
        "x-request-id": requestId,
      },
      body: JSON.stringify(mailPayload),
    });

    if (!logicResponse.ok) {
      const logicBody = await logicResponse.text();
      console.error("Logic App call failed", {
        status: logicResponse.status,
        body: logicBody.slice(0, 400),
        requestId,
      });
      res.status(500).json({ ok: false, message: "Mail forwarding failed" });
      return;
    }

    res.status(200).json({
      ok: true,
      message: "saved_and_notified",
      requestId,
    });
  } catch (error) {
    console.error("submitResponse failed", { error, requestId });
    res.status(500).json({ ok: false, message: "Unexpected server error" });
  }
});

app.use("/api", (_req, res) => {
  res.status(404).json({ ok: false, message: "API route not found" });
});

if (fs.existsSync(DIST_DIR)) {
  app.use(
    express.static(DIST_DIR, {
      index: false,
      maxAge: "1h",
    }),
  );
}

app.use((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.status(404).json({ ok: false, message: "Route not found" });
    return;
  }

  if (!fs.existsSync(INDEX_FILE)) {
    res.status(503).json({
      ok: false,
      message: "Frontend build not found. Run npm run build before starting the server.",
    });
    return;
  }

  res.sendFile(INDEX_FILE);
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
