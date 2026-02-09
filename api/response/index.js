const crypto = require("crypto");

const yesLabels = new Set([
  "Ja, auf jeden Fall, aber keine Ahnung was",
  "Ja, auf jeden Fall und ich habe eine Idee",
  "Ja, auf jeden Fall, und ich waehle aus deinen Optionen",
]);

const noLabels = new Set([
  "Ne, fuck nicht ab",
  "Ne, schon verplant",
  "Ne, eher nicht",
]);

const planOptions = new Set(["Weserpark+Kino", "Kino", "Schwarzlicht Minigolf"]);

const requestWindowByIp = new Map();
const WINDOW_MS = 4000;
const MAX_TEXT = 500;

function json(status, payload) {
  return {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
    body: payload,
  };
}

function normalizeText(value, max = MAX_TEXT) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function validatePayload(payload) {
  const choiceType = normalizeText(payload.choiceType, 30);
  const choiceLabel = normalizeText(payload.choiceLabel, 120);

  if (!["yes_no_idea", "yes_have_idea", "yes_pick_option", "no"].includes(choiceType)) {
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

module.exports = async function submitResponse(context, req) {
  const body = req.body;

  if (!body || typeof body !== "object") {
    context.res = json(400, { ok: false, message: "Request body must be a JSON object" });
    return;
  }

  const ipHeader = req.headers["x-forwarded-for"] || req.headers["x-ms-client-principal-idp"];
  const ip = normalizeText(ipHeader || "unknown", 120);

  if (checkRateLimit(ip)) {
    context.res = json(429, { ok: false, message: "Too many requests. Try again shortly." });
    return;
  }

  const validationError = validatePayload(body);
  if (validationError) {
    context.res = json(400, { ok: false, message: validationError });
    return;
  }

  const logicAppUrl = process.env.LOGIC_APP_URL;
  const logicAppSecret = process.env.LOGIC_APP_SHARED_SECRET;
  const targetEmail = process.env.TARGET_EMAIL;

  if (!logicAppUrl || !logicAppSecret || !targetEmail) {
    context.log.error("Missing Logic App configuration env vars");
    context.res = json(500, {
      ok: false,
      message: "Server not configured for mail forwarding",
    });
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
      context.log.error("Logic App call failed", {
        status: logicResponse.status,
        body: logicBody.slice(0, 400),
        requestId,
      });
      context.res = json(500, {
        ok: false,
        message: "Mail forwarding failed",
      });
      return;
    }

    context.res = json(200, {
      ok: true,
      message: "saved_and_notified",
      requestId,
    });
  } catch (error) {
    context.log.error("submitResponse failed", { error, requestId });
    context.res = json(500, {
      ok: false,
      message: "Unexpected server error",
    });
  }
};
