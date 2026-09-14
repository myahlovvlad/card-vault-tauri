# Architecture

## Core principle

The same React application is the source UI for browser and Tauri targets. Platform-specific capabilities are added behind adapters instead of forking the UI.

## Layers

1. `components` — presentation and form confirmation.
2. `lib/storage.ts` — persistence boundary. Current adapter is IndexedDB.
3. `lib/ocr.ts` — OCR boundary. Current adapter is Tesseract.js/WASM.
4. `lib/connectors.ts` — integration boundary for CRM, contacts and calendar.
5. `src-tauri` — native shell and future native commands/plugins.

## Production evolution

For production native apps, introduce a `StorageAdapter` interface with IndexedDB for web and SQLite for Tauri. Add encryption/keychain/biometric support and migrations. Keep export JSON as portable interoperability format.
