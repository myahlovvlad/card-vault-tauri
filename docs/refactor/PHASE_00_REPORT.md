# Phase 0 Report — Baseline

## Status

**COMPLETE** (audit-only; no application code changed).

## Implemented

1. Initialized git in the repository root (`git init -b main`) — none existed before this session.
2. Added `graphify-out/` and `.claude/` to `.gitignore` (tool-local runtime state / machine-specific paths, not project source) before the first commit.
3. Reviewed the full `git add -A` staging list by hand for secrets/build artifacts before committing — clean (71 files: source, docs, generated icon binaries, lockfiles; no `node_modules`, `dist`, `target`, `gen`, `.env`, or credentials).
4. Made one baseline commit on `main` of the codebase exactly as it existed before this refactor.
5. Created branch `refactor/cardvault-v2` from that baseline commit.
6. Full audit of the existing repository → `docs/refactor/CURRENT_STATE.md` (file tree, dependency versions, existing functionality, storage model, domain types, OCR implementation, Tauri config/capabilities, per-platform build status, known limitations, and an explicit gap list against this refactor's target architecture).
7. Ran the baseline checks the spec asks for (§2.5), on this Windows dev machine, for the parts this OS can run.

## Changed files

- `.gitignore` — added `graphify-out/`, `.claude/`.
- `docs/refactor/CURRENT_STATE.md` — new.
- `docs/refactor/PHASE_00_REPORT.md` — new (this file).
- No application source, config, or dependency files were modified.

## Architecture decisions

None yet — Phase 0 is audit-only by design (per the user's chosen pacing: one phase at a time, stop for review). The target architecture from the spec (§3, §6) is recorded as a delta list in `CURRENT_STATE.md` §11; no implementation decisions (e.g., which SQLite crate, which sync-conflict UI pattern) have been made or need to be made until Phase 1 is scoped and approved.

One environment-setup decision made during this phase: installed the `clippy` rustup component (it was missing on this machine). This is a toolchain addition, not a code change, and is required for the spec's own CI plan (§35 runs `cargo clippy`).

## Tests executed

No automated tests exist in this repository yet (confirmed: zero `*.test.*` files anywhere outside `node_modules`, zero `#[test]` functions in `src-tauri/src/*.rs`). `cargo test` was run to confirm the harness itself runs cleanly with 0 tests — see Builds executed below. Writing the first tests is Phase 1+ work (the spec's target architecture — repositories, SQLite, OCR pipeline — doesn't exist yet to test).

## Builds executed

| Check | Command | Result | Evidence |
|---|---|---|---|
| Frontend build | `npm run build` (`tsc && vite build`) | **PASS** | 0 TS errors; Vite output: `dist/index.html`, `dist/assets/index-*.css` (18.92 kB), `dist/assets/index-*.js` (15.87 kB + 350.34 kB), built in 2.99s |
| Rust check | `cargo check` (in `src-tauri/`) | **PASS** | `Finished \`dev\` profile [unoptimized + debuginfo] target(s) in 1m 43s`, 0 warnings |
| Rust tests | `cargo test` (in `src-tauri/`) | **PASS** (0 tests) | `running 0 tests` / `test result: ok. 0 passed; 0 failed` for both the lib and doc-tests |
| Rust lint | `cargo clippy --all-targets -- -D warnings` (in `src-tauri/`) | **PASS** | `Finished \`dev\` profile ... in 2.72s`, exit 0, no lint output at all |
| Rust format | `cargo fmt --check` (in `src-tauri/`) | **PASS** | exit 0, no diff output — codebase is already `rustfmt`-clean |
| Tauri desktop bundle (`npx tauri build`) | — | **NOT_RUN** | Two attempts. First hit a transient `STATUS_ACCESS_VIOLATION (0xC0000005)` crash inside `rustc` compiling `alloc-stdlib` — a known-flaky pattern on this specific machine seen repeatedly in prior sessions across unrelated tools (bash's own `fork()`, `cmd.exe`, `cargo metadata`, `tsx`), not specific to this project's code. Per the working rule ("retry once, don't change code blindly"), retried once; the second attempt's shell (bash) itself became unresponsive (background job produced no log file and no child `cargo`/`rustc`/`node` process ever appeared under it, `ps`/`jobs` hung). Did not attempt a third time. **This is a machine/environment finding, not a code defect** — `cargo check`, `cargo test`, and `cargo clippy` above already independently prove the Rust crate itself compiles cleanly for the desktop target; only the packaging/bundling step (NSIS installer generation) is unverified this session. |
| Android build | `tauri android build --debug --target aarch64 --apk` | **NOT_RUN this phase** | Not re-run in Phase 0 (would duplicate prior-session work). A working debug APK from a prior session already exists on disk at `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`, package `com.vladmyahlov.cardvault` (confirmed via `aapt2 dump badging` in that session). Documented in `CURRENT_STATE.md` §8 as existing evidence, not re-verified today. |
| Android emulator runtime | — | **NOT_RUN / blocked** | Two prior-session attempts (WHPX-accelerated and software-only) both failed to boot the `CardVaultTest` AVD past early QEMU init — apparent host virtualization limitation. No physical Android device attached to this machine. |
| iOS build | GitHub Actions `ios.yml` | **NOT_RUN** | Workflow exists but no git remote existed until this session; it has never actually executed on GitHub. Will only be verifiable once this repo is pushed. |
| macOS build | — | **NOT_RUN** | No macOS CI workflow exists yet; no Mac available. |
| Linux build | — | **NOT_RUN** | No Linux CI workflow exists yet; no Linux machine available in this session. |

## Known limitations

See `CURRENT_STATE.md` §10–§11 for the full list of gaps against the target v2 architecture (no SQLite, no blob storage, no sync engine, no auth/workspaces, no i18n, no tests, `csp: null`, etc.). These are expected at Phase 0 and are the reason Phases 1–7 exist — not regressions introduced this phase.

Environment-specific limitation observed and worth flagging to the user directly: this dev machine exhibits intermittent `STATUS_ACCESS_VIOLATION` crashes in arbitrary native processes (rustc, cmd.exe, bash's fork, tsx/node) under load, and the Android emulator cannot boot at all. Both were already observed in prior sessions on unrelated work in this same repo. Heavy Rust builds (full desktop bundles, Android/iOS builds) may need one manual retry: this is a known machine quirk, not something to "fix" in code.

## Store/compliance impact

None — no store-facing artifact was produced or changed this phase.

## Remaining work

Everything in `CURRENT_STATE.md` §11. Per the user's chosen pacing, the next step is to scope **Phase 1 — Core architecture** (domain separation, repository interfaces, SQLite, filesystem blobs, legacy migration) as its own reviewed unit of work, not to proceed automatically.

## Commit hash

Baseline (`main`, root commit): `09fc143`
Phase 0 docs commit (`refactor/cardvault-v2`): recorded after this file is committed — see the commit immediately following this report in `git log`.
