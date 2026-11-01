# DriveLegal v2 implementation and audit

The native Kotlin app is in `android-v2/`. The existing Capacitor project remains in `android/`; the responsive web client remains in `frontend/`. All clients share the original FastAPI service and supplied seed records.

## Confirmed defects corrected

| Finding | Evidence in the original implementation | Correction |
| --- | --- | --- |
| Offline export lost filter identifiers | `FineScheduleOut` stripped jurisdiction, violation, vehicle and category IDs from exported rows | Full metadata included in export and bundled datasets |
| Category filters were ignored | Web client sent `category`; API accepts `category_id` | Shared local filtering uses actual category IDs |
| Offline API failures looked successful | Service worker returned HTTP 200 with an error object | Offline API failures return 503; clients retain a validated snapshot |
| Offline shell depended on remote libraries | Firebase, icons, charts and map libraries loaded at startup; auth could prevent use | Web core uses local assets; native UI uses Compose; guest browsing and calculation work offline |
| Missing record amounts displayed as zero | Web rendering coerced null values to zero | Missing values are explicitly unspecified and prevent false totals |
| Repeat amount could silently become first amount | Backend tested truthiness, conflating null or zero with a missing repeat fine | Selected repeat field is preserved, including zero or unspecified |
| Seeding duplicated schedules | Fine rows always inserted without replacing logical matches | Reseeding replaces each logical schedule |
| Six violations disappeared from fine schedules | Empty vehicle-class arrays skipped the seed loop entirely | Unrestricted entries create a null vehicle-class schedule |
| Parenthesized subsections parsed as section numbers | `183(1)` resolved to section `1` | Parenthesized subsection removed before extracting section |
| Assistant retrieval disabled | Context asked model to use its own knowledge, citations always empty | Retrieve matching jurisdiction records first; deterministic fallback with sources when AI unavailable |
| Server diagnostics exposed to visitors | Chat error returned exception details and valid model list | Private logging, useful record-based fallback |
| Event loop blocked by external requests | Async endpoints used blocking urllib and synchronous model invocation | Map endpoints run in FastAPI's sync thread pool; AI call is asynchronous |
| Fabricated road metrics | Traffic derived from speed or jurisdiction ID parity; safety score derived from dataset counts | Coverage statistics labeled as dataset counts; no unsupported live traffic or safety score |
| Unreliable speed-limit claims | Default 50 km/h; first nearby OSM road tag; global cached limit | API returns unconfirmed nearby candidates, not a confirmed limit; native limit is explicitly user-entered |
| Arbitrary external map latency | No upstream timeouts or coordinate bounds | Timeouts and bounded inputs |
| Browser storage could stall startup | IndexedDB open/read operations had no completion timeout | Bounded storage operations fall back to the included library |
| Windows module MIME type | `.mjs` could be served as text/plain from registry associations | Explicit JavaScript MIME types in static server |
| Hardcoded profile and sample context | Personal name, plate, address, dates and live badges appeared before real data | Guest defaults, optional locally saved name, explicit unavailable/source states |

## Data coverage

After fixing skipped general-vehicle records: **31 fine schedules, 10 violation types, 13 jurisdictions**. There are **25 source violation entries**, with some expanded to multiple vehicle schedules. National coverage is particularly limited. These are project records, not an independently verified current-law database. A source authority homepage is not evidence of a specific current notification. No additional legal amounts were invented to fill the UI.

Production data work still required: verify each notification and effective date against an authoritative source, expand state coverage, represent minimum/maximum/compounding semantics explicitly, and establish an update process. The juvenile-clause feature advertised in the old README has no matching calculator request field or implemented rules engine and is not claimed as supported.

## Native v2 UI

Inspired by the supplied Home, Laws, Drive, Fines, and Assistant references: warm off-white, black cards, amber controls, large typography, compact section badges, segmented vehicle controls, and a prominent central Drive action. Glass uses static translucent fills, thin edges, and small shadows. No backdrop blur, render effects, infinite animation, custom render loop, or continuously rendered map is used.

Native features include an offline library, state/category/text filters, saved records, multi-offence first/repeat estimates, explicit source detail, source-based assistant fallback, optional server AI, system speech input, native PDF sharing, opt-in foreground GPS, a manually set posted limit, on-demand weather/camera lookup, and a clearly labeled slider-driven simulation.

Native v2 now reuses the original Firebase project, original Android package, registered debug signing certificate and Web OAuth client. Google sign-in uses Credential Manager and Firebase Auth; existing email/password accounts, signup, reset, session restoration and sign-out are supported. Offline guest browsing remains available. Both native and web bookmark storage remain local; neither claims cloud bookmark synchronization.

## Verification

Run the documented Node, Python, and Gradle checks. UI instrumentation exercises the five native screens and simulation without requesting GPS permission or contacting a backend. Device energy consumption, actual road GPS accuracy, third-party service availability, Firebase authentication, and production Groq credentials require separate real-device or account testing. No battery-life or performance measurements are claimed from source inspection alone.


## Completed local validation

Kotlin debug APK and test APK compiled successfully. Thirteen native unit tests passed, along with four Android 16.1 emulator instrumentation tests covering the five screens, simulation, a pinned End drive control, and native multi-page PDF rendering. Thirteen API regression tests and seven web/offline tests passed. See [captured previews](V2-PREVIEW.md). Physical-device energy and GPS testing, service credentials, expanded legal verification, and production signing remain necessary before a production release.


## Account, branding and theme update

The Android build is now 2.0.1 (code 21). It uses a saved app-wide light/dark theme and a new code-native Road Shield logo: an amber shield and winding road, with a light check mark on a black field. Reusable SVG artwork is in `assets/brand`; native adaptive and monochrome launcher resources are in the Android project. No runtime logo generation or blur is used.

Live Render checks on 27 October 2026 succeeded with HTTP 200. The deployed backend is still version 1.0.0 with 25 exported records and missing v2 IDs. The corrected local backend reports 2.0.0 and requires deployment before the new data sync/grounded assistant can run remotely. No external deployment was performed. Authentication remains Firebase-owned; the public Render API does not receive Firebase passwords or tokens.


## Motion D branding revision

Version 2.0.2 (code 22) replaces the shield artwork with a generated amber road-ribbon D and forward chevron. The generated master and exact prompt are retained under `assets/brand/`. A 512px static PNG is packaged in the app and companion web client, with a matching vector monochrome launcher silhouette. The old shield is archived. Firebase, dark mode and backend behavior are unchanged by this branding revision.
