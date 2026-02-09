# Samstag-Convincer Web App

Mobile-first Persuasion-App fuer einen Samstag-Plan mit Gaming-Interaktionen und Azure-Deployment.

## Stack

- Frontend: React + TypeScript + Vite
- API: Azure Functions (HTTP trigger unter `/api/response`)
- Mail-Weiterleitung: Azure Logic App (HTTP trigger)
- Hosting: Azure Static Web Apps

Nur Azure verursacht Kosten. Es gibt keine kostenpflichtigen Drittservices ausserhalb Azure.

## Features

- Countdown zur naechsten Deadline: Mittwoch 04:44 Uhr in `Europe/Berlin`
- Fruehliches Doodle-Design + Gaming-Buttons
- High-Mode fuer Nein-Antworten (3 Bestaetigungsstufen bis final)
- Ja-Flow mit Konfetti + Platzhalterbild
- Nein-Flow mit Dankes-Screen
- Antwortversand an API mit Validierung

## Lokale Entwicklung

```bash
npm install
npm run dev
```

## Tests

```bash
npm run test:run
```

## Build

```bash
npm run build
```

## API-Konfiguration (Azure)

Setze in Azure Static Web Apps oder Function App diese Variablen:

- `LOGIC_APP_URL`: HTTP Trigger URL deiner Logic App
- `LOGIC_APP_SHARED_SECRET`: Shared Secret, das Logic App prueft
- `TARGET_EMAIL`: Empfaengeradresse

## Logic App Minimalaufbau

1. Trigger: `When a HTTP request is received`
2. Optional: Pruefe Header `x-shared-secret` gegen `LOGIC_APP_SHARED_SECRET`
3. Action: `Send an email (V2)` via Outlook oder SMTP Connector
4. Body: Felder aus `message` des Requests einbauen

## Deployment nach Azure Static Web Apps

1. Repo zu GitHub pushen
2. Azure Static Web App mit dem Repo verbinden
3. Secret `AZURE_STATIC_WEB_APPS_API_TOKEN` in GitHub setzen
4. Workflow `.github/workflows/azure-static-web-apps.yml` deployt Frontend + API

Nach dem Deploy ist die Seite ueber `*.azurestaticapps.net` extern erreichbar.
# ck_fragen
