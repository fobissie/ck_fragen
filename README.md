# Samstag-Convincer Web App

Mobile-first Persuasion-App fuer einen Samstag-Plan mit Gaming-Interaktionen und App-Service-Deployment.

## Stack

- Frontend: React + TypeScript + Vite
- Backend/API: Node.js + Express (`POST /api/response`)
- Mail-Weiterleitung: Azure Logic App (HTTP trigger)
- Hosting: Azure App Service (Web App)

Nur Azure verursacht Kosten. Es gibt keine kostenpflichtigen Drittservices ausserhalb Azure.

## Features

- Countdown zur naechsten Deadline: Mittwoch 04:44 Uhr in `Europe/Berlin`
- Fruehliches Doodle-Design + Gaming-Buttons
- High-Mode fuer Nein-Antworten (3 Bestaetigungsstufen bis final)
- Ja-Flow mit Konfetti + Platzhalterbild
- Nein-Flow mit Dankes-Screen
- Antwortversand an API mit Validierung und Rate-Limit

## Lokale Entwicklung

Nur Frontend (Vite):

```bash
npm install
npm run dev
```

API-Server lokal starten (nach Build):

```bash
npm run build
npm start
```

Healthcheck:

```bash
curl http://localhost:3000/healthz
```

## Tests und Build

```bash
npm run test:run
npm run build
npm run lint
```

## API-Konfiguration (App Service)

Setze in der Web App unter `Configuration -> Application settings`:

- `LOGIC_APP_URL`: HTTP Trigger URL deiner Logic App
- `LOGIC_APP_SHARED_SECRET`: Shared Secret, das Logic App prueft
- `TARGET_EMAIL`: Empfaengeradresse
- `NODE_ENV`: `production`

## Logic App Minimalaufbau

1. Trigger: `When a HTTP request is received`
2. Bedingung: Header `x-shared-secret` muss deinem Secret entsprechen
3. Action: `Send an email (V2)` via Outlook oder SMTP Connector
4. Mail-Body aus `triggerBody().message` bauen

## GitHub Actions Deployment (App Service)

Der Workflow liegt in:

- `.github/workflows/appservice.yml`

Benötigte GitHub-Konfiguration (OIDC/Service Principal):

- `AZUREAPPSERVICE_CLIENTID_4D5CFA6E04834868BC302014292D6AD5`
- `AZUREAPPSERVICE_TENANTID_C739A5D4B7364AA1B52460FF92520DD5`
- `AZUREAPPSERVICE_SUBSCRIPTIONID_1AE7DD13BDB5413EA9084647DEC0622E`

Der Workflow:

1. installiert Dependencies
2. fuehrt Tests aus
3. baut das Frontend
4. erstellt ein Deploy-Paket mit `dist/`, `server.js`, `package*.json`
5. meldet sich via `azure/login` an Azure an
6. deployed `release.zip` zu Azure Web App (`ck-fragen`)

## Deploy Ablauf

1. Code nach `main` pushen
2. GitHub Actions Lauf abwarten
3. Live-URL aufrufen:
   - `https://<deine-webapp>.azurewebsites.net`

## Bild austauschen

Der Platzhalter liegt in:

- `public/images/me-placeholder.svg`

Ersetze ihn bei Bedarf durch ein eigenes Bild mit gleichem Pfadnamen.
