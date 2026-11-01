# DriveLegal 2.0

An Indian road-law companion with a native **Kotlin / Jetpack Compose Android app**, responsive web client, and FastAPI backend. Originally built for the Road Safety Hackathon 2026.

The v2 Android design follows the supplied five-screen references: warm off-white, black cards, amber accents, large type, a central Drive action, and lightweight glass-like surfaces.

## Projects

| Folder | Purpose |
| --- | --- |
| `android-v2/` | Native Kotlin v2 application — open this folder in Android Studio |
| `android/` | Original Capacitor Android project, preserved |
| `frontend/` | Responsive web/PWA client |
| `backend/` | Shared FastAPI APIs, SQLite queries, optional grounded AI |
| `docs/V2-AUDIT.md` | Confirmed defects, corrections, coverage, and remaining limitations |

[Native build instructions](android-v2/README.md) · [Audit](docs/V2-AUDIT.md)

## Available functionality

- Firebase Google and email/password sign-in using the original project and Android package.
- Saved app-wide dark mode and a new Motion D logo with adaptive launcher icons.
- Offline law browsing with state, category, and text filters, source dates, and saved laws.
- Vehicle-specific first/repeat-offence estimates; native app supports selecting several offences. Missing amounts remain unspecified; compounding fees are separate.
- A source-based assistant that retrieves matching jurisdiction records. Database lookup works without an AI key; optional AI explanations use the supplied context.
- Native PDF sharing; browser PDF download.
- Foreground GPS, automatic weather and mapped speed-limit estimates, GPS state selection, manual overrides, and clearly marked simulation. Camera lookup remains on demand.
- Native speech input and on-demand spoken Drive status.
- Explicit dataset coverage instead of invented traffic density or safety scores.

## Data coverage

The corrected seed produces **31 fine schedules covering 10 violation types across 13 jurisdictions**, from 25 source violation entries. Some regions contain just one offence. National coverage is limited.

These are the existing project's historical records. Current laws and amendments have **not** been independently verified. The app makes missing data and source dates visible. It never silently substitutes a national amount for an unsupported state combination. Juvenile clauses, real-time traffic feeds, automatic legal speed-limit detection, and cloud bookmark synchronization are not implemented.

## Run the backend and web app

Python 3.11+:

```powershell
python -m pip install -r backend/requirements.txt
python scripts/seed_database.py
python scripts/export_frontend_data.py
python backend/main.py
```

Open [localhost:8000](http://localhost:8000). API docs: [localhost:8000/docs](http://localhost:8000/docs).

The database lookup assistant works without credentials. To enable AI explanations, copy `.env.example` to `.env` and set a server-side `GROQ_API_KEY` and model available to your account. See [Groq's supported models](https://console.groq.com/docs/models). Never place the API key in the web client or APK.

For a separately hosted web client, set `window.DRIVELEGAL_API_BASE` in `frontend/config.js` and configure the backend's `CORS_ORIGINS`. HTTPS is required for production PWA and device location features. Native backend settings accept HTTPS URLs.

Docker:

```powershell
docker compose up --build
```

The v2 runtime retrieves structured SQLite records and does not require downloading or loading an embedding model. Legacy Chroma index tooling remains optional in `backend/requirements-embeddings.txt`.

## Checks

```powershell
python -m pip install -r backend/requirements-dev.txt
npm test
```

Native checks from `android-v2`:

```powershell
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest
.\gradlew.bat :app:connectedDebugAndroidTest
```

The native unit tests cover state/vehicle separation, multi-offence totals, unknown amounts, offline retrieval, stable bookmark keys, and Drive-limit comparisons. UI instrumentation covers the five screens and simulation without granting GPS permission.

The glass treatment uses static translucent fills, borders and restrained shadows. GPS pauses in the background; no continuously rendered map or decorative animation runs. These are implementation choices, not measured battery-life guarantees. See [Android's Compose performance guidance](https://developer.android.com/develop/ui/compose/performance).

## Original team

Adithya — Project Lead & Backend · Vaishnav — Frontend & UI/UX · Rishi — PWA & Offline · Marion — Database · Nitin — AI · Aysha — Analytics.

All rights remain with the original project team.

The native app defaults to the original Render URL, verified reachable on 27 October 2026. That deployment still has the older API; deploy the backend changes here to enable v2 sync and grounded AI. See the native README for the exact compatibility check.
