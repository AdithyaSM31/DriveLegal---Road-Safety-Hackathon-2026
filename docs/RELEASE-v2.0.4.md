# DriveLegal v2.0.4 — Android pre-release

Native Kotlin / Jetpack Compose Android v2 with the amber Motion D identity, light/dark themes, Google sign-in through the existing Firebase project, and a preference for the device's highest supported refresh rate.

## Included

- Home dashboard, traffic-law search and bookmarks, fine calculator, PDF sharing, and online Render/Groq assistant with an explicit offline fallback.
- Foreground GPS speed, including stationary zero, simulation, automatic weather and mapped speed-limit estimates, plus manual posted-limit overrides.
- GPS-state jurisdiction defaults for Laws, Fines and Assistant.
- In-app native map with live location, recentering, and nearby mapped speed-camera markers with a device-side lookup fallback.
- Clear SEC. badges and a simplified profile panel with Log out below Dark mode and Low-power drive.

## Install

Download **DriveLegal-v2.0.4-debug.apk** below. Android 8.0 / API 26 or newer is required. This is a debug-signed evaluation APK, not a production-signed Play Store build. Enable installation from your downloading app if Android asks. A checksum file is attached.

## Validation and known limitations

- Native build and 22 unit checks passed; emulator checks covered existing app flows, map tile/location rendering and the profile controls.
- Real-device GPS, Google-account behavior, high-refresh-rate behavior and road coverage still need field testing.
- Speed limits are nearby map estimates; follow posted signs. Missing or conflicting map tags remain unknown.
- Camera coverage can be incomplete. The deployed Render camera endpoint reported outbound networking unavailable during testing. Device-side public Overpass fallbacks are included, but live camera results could not be verified while those services were timing out.
- Live traffic is not configured. Legal records are the supplied historical dataset, not independently verified current law.
- This release publishes source and an APK; the Render backend has not been redeployed. The client supports its existing chat format, while the corrected law export requires deploying the updated backend.

Map data © OpenStreetMap contributors; native rendering uses MapLibre.
