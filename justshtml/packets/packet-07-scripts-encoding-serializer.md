# Packet 07 — scripts/run-encoding-tests.ts + scripts/run-serializer-tests.ts

## File 1: scripts/run-encoding-tests.ts (12 errors)
**Lines:** 1, 3, 5, 10, 68, 86, 89, 114, 116, 123, 166, 170

### Error breakdown

#### 1. Cannot find module 'node:...' (lines 1, 3, 5)
```
TS(2307): Cannot find module 'node:fs/promises' / 'node:path' / 'node:url'
```
**Fix:** Resolved by @types/node + tsconfig module change (global prerequisite from packet 06).

#### 2. import.meta not allowed (line 10)
```
TS(1343): The 'import.meta' meta-property is only allowed when '--module' is 'es2020'...
```
**Fix:** Resolved by tsconfig `"module": "nodenext"` (global prerequisite).

#### 3. Cannot find name 'Buffer' (lines 68, 86, 89)
```
TS(2580): Cannot find name 'Buffer'. Do you need to install type definitions for node?
```
**Fix:** Resolved by `@types/node` (global prerequisite).

#### 4. Cannot find name 'process' (lines 114, 116, 123, 166)
```
TS(2580): Cannot find name 'process'. Do you need to install type definitions for node?
```
**Fix:** Resolved by `@types/node` (global prerequisite).

#### 5. Top-level await (line 170)
```
TS(1378): Top-level 'await' expressions are only allowed when 'module' is 'es2022'...
```
**Fix:** Resolved by tsconfig `"module": "nodenext"` (global prerequisite).

---

## File 2: scripts/run-serializer-tests.ts (10 errors)
**Lines:** 1, 3, 5, 10, 23, 54, 56, 68, 140, 144

### Error breakdown

#### 1. Cannot find module 'node:...' (lines 1, 3, 5)
```
TS(2307): Cannot find module 'node:fs/promises' / 'node:path' / 'node:url'
```
**Fix:** Resolved by @types/node + tsconfig module change.

#### 2. import.meta not allowed (line 10)
```
TS(1343): The 'import.meta' meta-property is only allowed when '--module' is 'es2020'...
```
**Fix:** Resolved by tsconfig module change.

#### 3. Argument of type 'any' not assignable (line 23)
```
TS(2345): Argument of type 'any' is not assignable to parameter
```
A value read from JSON/parsed data is passed to a function expecting a specific type.

**Fix:** Add explicit type annotation or assertion to the variable. After @types/node is installed, the actual type may become clear. If not, cast as needed.

#### 4. Cannot find name 'process' (lines 54, 56, 68, 140)
```
TS(2580): Cannot find name 'process'
```
**Fix:** Resolved by @types/node.

#### 5. Top-level await (line 144)
```
TS(1378): Top-level 'await' expressions are only allowed when 'module' is 'es2022'...
```
**Fix:** Resolved by tsconfig module change.

---

## Note

Nearly every error in this packet (20 of 22) is resolved by two global tsconfig changes:
1. Install `@types/node` as devDependency
2. Set `"module": "nodenext"` and `"moduleResolution": "nodenext"` in tsconfig

The remaining 2 (line 23 in serializer tests, potential type 'any' issues) need per-site fixes.
