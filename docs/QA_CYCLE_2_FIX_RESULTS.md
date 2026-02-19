# QA Cycle 2 — Fix Results

> **Date**: 2026-02-19
> **Issues addressed**: NEW-1 (core/realtime type mapping)
> **NEW-2**: No action needed (informational)

## Verification Results

| Check | Status |
|-------|--------|
| Frontend type-check (6 packages) | PASS |
| Frontend lint (6 packages) | PASS |
| Frontend tests (318) | PASS (0 failures) |

## Fix: NEW-1 — Core vs Realtime KeystrokeEvent Type Mapping

### Problem
Two separate `KeystrokeEvent` interfaces with incompatible field names:
- `@humanwrites/core`: `type`, `timestamp`, `dwellTime`, `flightTime`
- `@humanwrites/realtime`: `eventType`, `timestampMs`, `dwellTimeMs`, `flightTimeMs`

### Solution
- Renamed realtime's `KeystrokeEvent` to `WireKeystrokeEvent` (explicit wire format type)
- Added `toWireFormat(event: CoreKeystrokeEvent): WireKeystrokeEvent` mapping function
- Updated `KeystrokeSender.addEvents()` to accept core `KeystrokeEvent[]` and auto-convert
- Updated barrel exports in `index.ts`

### Files Modified
- `frontend/packages/realtime/src/keystroke-sender.ts`
- `frontend/packages/realtime/src/index.ts`

## NEW-2: V5 Continuous Aggregate — No Action
The `modifier_keys` column in V5 aggregate is semantically correct (it counts modifier key usage). Error counting is handled at the application level using `navigation` category. No migration change needed.

## Deferred Issues (6)
All 6 deferred issues from Cycle 1 remain acceptable for MVP scope:
- #9 CSRF (API-only, SameSite cookies)
- #10 In-memory sessions (MVP single-instance)
- #17 OpenAPI pipeline (post-MVP integration)
- #20 React act() warnings (cosmetic)
- #21 Next.js ESLint config (cosmetic)
- #22 Bundle size (post-MVP monitoring)
