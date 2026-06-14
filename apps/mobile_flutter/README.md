# VITAL — Flutter app (port)

A Flutter (Dart) port of the VITAL mobile app, built **alongside** the React
Native app in `apps/mobile`. It talks to the **same backend** (`apps/api`) over
REST — nothing on the server, web apps, or shared package changes.

> Status: **all screens ported** (functional). Onboarding (welcome → signup →
> health profile → client info → goals), Dashboard (count-bar hero), Labs
> Summary (status dial + grouped list), Biomarker Detail (range-reference
> chart), VITAL Score, Category Detail, Booking, AI Insights + chat,
> Recommendations, Notifications, Profile, and Subscription (plans → Paymob
> checkout → confirmation).
>
> **Not yet compiled** — Flutter isn't available in the build environment, so
> this is consistent starter code that needs a local `flutter run` + a short
> fix-up pass (analyzer errors, minor API-shape tweaks). The remaining polish:
> the client-info map (webview), go_router (currently Navigator + an AuthGate),
> and pixel parity once the mobile design pass lands.

## Stack
| Concern | Package |
|---|---|
| State | `flutter_riverpod` |
| HTTP | `dio` |
| Secure token storage | `flutter_secure_storage` |
| Fonts (Bricolage Grotesque / Inter) | `google_fonts` |
| WebView (Paymob / maps, later) | `webview_flutter` |
| Charts (dial, range bars) | Flutter `CustomPainter` (no extra dep) |

## Prerequisites
- Flutter SDK 3.4+ (`flutter --version`)
- The VITAL backend running and reachable from your device/emulator
  (deploy it, or run `apps/api` and use your machine's LAN IP / a tunnel —
  `localhost` won't resolve from a phone).

## First-time setup
This folder contains `lib/`, `pubspec.yaml`, and config, but **not** the native
iOS/Android runner folders. Generate them once:

```bash
cd apps/mobile_flutter
flutter create .            # adds ios/ android/ (keeps existing lib/ + pubspec)
flutter pub get
```

## Run
Pass the API base URL with `--dart-define`:

```bash
flutter run --dart-define=API_URL=https://<your-api-host>/api/v1
```

(Default if omitted: `http://localhost:3000/api/v1`.)

Sign in with a user that has an **active subscription**; the Biomarkers screen
is subscription-gated on the backend, and the dial/breakdown populate from that
user's results.

## Layout
```
lib/
  main.dart                 # ProviderScope + AuthGate (login vs shell)
  theme/tokens.dart         # warm-paper colors + Bricolage/Inter text styles
  core/
    api_client.dart         # dio client, token store, Riverpod providers
    auth.dart               # AsyncNotifier<AppUser?> (login / restore / logout)
  models/                   # AppUser, Biomarker, StatusCounts
  widgets/
    status_dial.dart        # CustomPainter wedge ring
    range_bar.dart          # CustomPainter compact range bar
  features/
    auth/login_screen.dart
    home/home_shell.dart    # bottom nav: Home + Biomarkers
    dashboard/dashboard_screen.dart
    biomarkers/             # biomarkers_provider.dart + labs_summary_screen.dart
```

## Next to port
Onboarding (welcome/signup/health-profile/client-info/goals), Biomarker Detail
(range-reference chart), Category Detail, Booking, Insights/Chat, Notifications,
Recommendations, VITAL Score page, Subscription (plans/checkout/confirmation),
Profile. Add `go_router` when the navigation graph grows beyond the slice.
