# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

[Inferred from README/FEATURES, not directly confirmed by the user.] Primary users are professionals who collect physical business cards at meetings, conferences, and sales calls (sales, business development, networking-heavy roles) in a Russian-speaking market (UI copy is Russian-first). They photograph a stack of received cards, need the contact digitized quickly and correctly, and want to find a contact later by name, company, or a note they left themselves. A secondary, newly-added job: the user also wants to hand out **their own** contact details digitally instead of (or alongside) a printed card, by showing a QR code the other person scans with their phone camera.

## Product Purpose

CardVault is a local-first digital business-card vault. It replaces a physical box/pile of collected business cards: photograph a card, OCR extracts the fields, the user confirms/corrects them, and the contact is organized into folders, starred, searched, and exported (CSV / vCard / JSON backup). Success is "I can find and act on any contact I've ever collected, without typing it in by hand and without trusting a cloud service with it." The new "My Cards" capability extends this to the outbound direction: the user's own card(s) exist as data in the app and can be shown/shared as a QR code (and via the OS share-sheet) so someone else can scan it straight into their own contacts/CardVault, and the user can also scan someone else's shared QR to receive a card without typing or photographing anything.

## Positioning

Everything lives on-device (IndexedDB / Tauri WebView), including photos; there is no server component and no account. A neighboring "scan a business card" app that syncs to a cloud backend could not truthfully make CardVault's privacy claim. The single React/TypeScript codebase ships to web, Windows/macOS/Linux desktop (Tauri) and Android/iOS from one UI, rather than forking native apps per platform.

## Operating Context

- Photographing a card happens in the moment, often standing up, right after meeting someone — the capture flow must be fast and forgiving.
- OCR (Tesseract.js, rus+eng) needs network access once, to fetch its language model, then works offline.
- Sharing "my card" via QR is a face-to-face, in-the-moment interaction: one person's screen shows a QR, the other person points a phone camera at it, in variable/imperfect lighting (a meeting room, a conference hallway, a cafe).
- The app runs on very different form factors from the same code: a resizable desktop window and a one-handed phone screen; QR display and QR scanning are mobile-primary interactions even though the surface must degrade sensibly on desktop (e.g., desktop shows the QR full-size for someone to scan on their phone, but has no camera-based scan-in on most desktops without a webcam).
- Distribution/export formats already in use: vCard (.vcf), CSV, and a portable JSON backup that inlines photos as data URLs.

## Capabilities and Constraints

- Existing: folders, starring, search, IndexedDB persistence, JSON backup/import, CSV export, single-card vCard export, OCR with manual correction.
- New (this build): a "My Cards" area distinct from the received-cards vault, letting the user author one or more cards representing themselves; a share view that renders that card as a scannable QR (vCard-encoded) plus native/web share-sheet; a QR scanner that decodes another CardVault (or generic vCard) QR and hands it to the existing card-confirmation flow.
- Constraint: no backend, so QR payload must be fully self-contained (a vCard string), not a link to a hosted resource.
- Constraint: iOS builds require macOS + Xcode and cannot be produced or tested on the current Windows dev machine; iOS is covered by CI (GitHub Actions macOS runner) rather than local device testing for now.
- Constraint: camera access (for the scanner) requires the corresponding Tauri capability/permission on Android/iOS and getUserMedia in the browser/webview.
- Open/undecided: no CRM OAuth, no multi-user cloud sync, no encryption/PIN lock — unchanged from the existing MVP scope.

## Brand Commitments

Product name "CardVault" ("Электронная визитница"). Existing visual identity: light, clean, restrained-neutral UI with a single burgundy/wine accent reserved for "starred/important" cards — this is a confirmed existing trait to inherit, not to reinvent, for the new surface.

## Evidence on Hand

Existing implementation (src/App.tsx, src/components/*, src/styles.css) is the visual and interaction ground truth. No logo asset, no marketing copy, no customer/testimonial evidence exists or should be fabricated. There is no existing QR or "my card" UI to inherit from; that composition is new.

## Product Principles

1. Local-first and private by default — no feature may silently require a network round-trip for core functionality (OCR's one-time model fetch is the accepted exception).
2. The user always confirms machine-extracted data before it's saved (OCR today, QR-decoded vCard tomorrow) — automation proposes, the user disposes.
3. One codebase, every platform — new UI must work at both a desktop window and a one-handed phone screen, not just the one it was designed on.
4. Sharing your own card should be as fast as showing someone a physical card: open, show QR, done — no network, no account, no waiting.

## Accessibility & Inclusion

No product-specific requirement established beyond the existing responsive desktop/mobile support. QR scanning must offer a manual/paste fallback for users who cannot use a camera.
