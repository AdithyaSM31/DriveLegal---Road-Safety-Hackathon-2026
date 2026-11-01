# DriveLegal 2.0 — Kotlin Android

A native Jetpack Compose implementation of the five supplied reference screens. This is independent of the original Capacitor project in `../android`.

## Build

Requirements: JDK 17, Android SDK 36, Android SDK Build Tools, and Gradle wrapper access to Google/Maven repositories (or cached dependencies).

Open **this `android-v2` folder** in Android Studio. Let Android Studio create `local.properties` for your SDK. From this folder:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest
```

Debug APK: `app/build/outputs/apk/debug/app-debug.apk`.

- Android 8.0 / API 26 or later.
- Version name `2.0.4`, version code `24`.
- Debug and release use the original Firebase package `com.drivelegal.app`. Debug signing reuses this machine’s existing registered debug key. The earlier evaluation build used `.v2.debug`; that earlier package does not share this build’s login session or settings.
- Release package is `com.drivelegal.app`. An upgrade to an installed v1 requires the **same original signing key** and an appropriate monotonically increasing version code. No release signing key is stored in this repository.
- Release builds enable R8 and resource shrinking. Configure signing locally before distributing a release. Debug builds are for evaluation.

## Features

- Firebase Google sign-in through Android Credential Manager, existing email/password login, account creation, password reset, session restoration, and sign-out.
- Home with the Firebase display name or an optional local guest name, clear unknown road values, and fast access to tools.
- Saved app-wide dark-mode switch, available on the welcome screen and in Home → Settings. All screens, fields, cards, dialogs, and navigation follow it.
- New Motion D logo, with native adaptive and monochrome launcher icons, plus a reusable 512px PNG and preserved generated master.
- Search and category filters, jurisdiction picker, saved laws, source dates and source links.
- Vehicle-specific multi-offence estimates with a repeat-offence switch. Unspecified amounts remain unknown; compounding fees are separate.
- Assistant with sources. Offline matching works without keys. Optional grounded AI uses the FastAPI backend; Groq credentials belong on the server.
- Native PDF reports shared through Android's share sheet. No file-storage permission needed.
- Foreground GPS, including stationary updates, with a zero placeholder and explicit acquisition status when speed is unavailable. Automatic OpenStreetMap limit estimates with manual sign overrides; missing or conflicting tags remain unknown.
- Simulation driven by a slider, never a timer or a fake live signal.
- System speech recognition for search/questions; speech output reads drive status only when requested.
- Weather and mapped cameras requested only after the user sees where coordinates go.
- Local settings: guest name, HTTPS backend URL, dark mode, and lower-frequency GPS mode.

## Backend and data

The app starts with `app/src/main/assets/snapshot.json`, generated from the existing project seed files. A validated synced dataset is stored atomically in app-private files. Failed or incompatible sync never replaces a working library.

The default URL is the original Render deployment. Deploy the backend changes in this checkout to enable the repaired export and grounded assistant API. Legacy Render chat replies are accepted as online responses; incompatible law exports are still rejected. Local browsing and estimates work offline. Change the HTTPS backend URL from Home → Settings. Questions are sent to that configured server. No server key is placed in the APK.

To regenerate the bundled data from the repository root:

```powershell
python scripts/seed_database.py
python scripts/export_frontend_data.py
Copy-Item frontend/data/snapshot.json android-v2/app/src/main/assets/snapshot.json
```

No national fallback is substituted for absent state data. The included records have historical effective dates and have not been independently verified as current law. See `../docs/V2-AUDIT.md`.

## Power-conscious rendering

Static translucency and borders provide the glass appearance without runtime blur. There are no continuously animated decorations. Weather/map requests are throttled and use foreground GPS. Firebase manages authentication session refresh through its SDK. GPS runs while the signed-in/guest app is in the foreground after permission approval, and stops in the background. Low-power mode requests updates no more often than every five seconds; normal mode requests two-second updates. Actual device/provider behavior can differ. Weather refreshes every ten minutes (with one-minute retry when unavailable), mapped limits at most every twenty seconds after movement or every minute otherwise, and state reverse geocoding every two minutes. Cameras remain on demand. There is no background-location permission, foreground service, or wake lock.

UI lists use stable keys; filtering and estimates are remembered. IO and JSON parsing run off the main thread. The release build uses R8. These choices reduce unnecessary work; real-device profiling is still needed before making battery-life claims.

## Tests

```powershell
.\gradlew.bat :app:testDebugUnitTest
.\gradlew.bat :app:connectedDebugAndroidTest
```

The UI flow uses simulation and never grants location permission. It writes screenshots into the test app's external-files directory for retrieval during development. Tests do not authenticate, contact the AI server, or exercise a physical phone.

## Built artifact and previews

A debug APK was built successfully at `../dist/DriveLegal-v2.0-debug.apk`. This is a local evaluation build. See [screenshots and verification](../docs/V2-PREVIEW.md).

## Existing Firebase project

`app/google-services.json` is copied from the original Android project. The project remains `drivelegal-30073`, the Android application ID remains `com.drivelegal.app`, and the Web OAuth client ID is generated from this config by the Google Services plugin. Google ID tokens are exchanged with Firebase Auth; passwords and tokens are never sent to the Render backend or stored in custom app preferences.

The existing debug signing key's SHA-1 matches the Android OAuth client recorded in the original config:

`95:7E:72:22:26:2A:4D:B2:5C:1D:B7:05:01:CA:FC:25:88:8E:DE:82`

Google sign-in still requires the Google provider to remain enabled in Firebase, compatible Google Play services, a network connection, and the correct signing certificate. A production/release signing key needs its own registered fingerprint. Never commit private signing keys. See [Firebase's Google sign-in documentation](https://firebase.google.com/docs/auth/android/google-signin).

Firebase Auth 24.0.1 (BoM 34.4.0) is pinned for compatibility with the project's Kotlin compiler. The latest Auth 25.0.0 uses Kotlin 2.4 metadata and does not compile with the existing Kotlin 2.2 compiler. See [Firebase release notes](https://firebase.google.com/support/release-notes/android).

## Verified Render status

Read-only checks on 27 October 2026 returned HTTP 200 for both the original Render health endpoint and law export. The service reports version 1.0.0 and exports 25 records without v2 metadata IDs. This means the configured host is live, but **the backend fixes in this checkout are not deployed there yet**.

The app detects this incompatibility and keeps its corrected local library. Home → Data & updates → Check Render connection exposes the reachable/compatible state. Deploy the backend from this checkout to the existing Render service to enable updated sync and grounded AI. The updated health endpoint reports backend version 2.0.0; the export should include `violation_id`, `jurisdiction_id`, and `category_id` and contain 31 seeded schedules.

No Render deployment or Firebase console settings were changed during this work. Firebase accounts and Render data APIs are separate integrations; existing Render APIs remain public as before.

## Motion D branding update

The 2.0.2 build replaces the shield badge with a sculpted amber road-ribbon D and forward chevron. Its depth is a static image, not an animated/blur effect. The packaged PNG is 512px (about 265 KiB); Android caches it as ordinary artwork. Native adaptive and monochrome launcher variants follow the same D silhouette. The earlier shield assets are retained as archives.

## 2.0.3 update

See [driving, online assistant, profile, state detection and refresh-rate changes](../docs/V2.0.3-CHANGES.md). Evaluation APK: `../dist/DriveLegal-v2.0.3-debug.apk`.

## 2.0.4 update

[In-app map, speed cameras, jurisdiction defaults and profile changes](../docs/V2.0.4-CHANGES.md). Evaluation APK: `../dist/DriveLegal-v2.0.4-debug.apk`.
