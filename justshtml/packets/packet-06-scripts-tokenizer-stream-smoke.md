# Packet 06 — scripts/run-tokenizer-tests.ts + scripts/run-stream-tests.ts + scripts/smoke.ts

## File 1: scripts/run-tokenizer-tests.ts (15 errors)
**Lines:** 1, 3, 5, 11, 24, 36, 42, 81, 87, 103, 159, 161, 173, 245, 249

### Error breakdown

#### 1. Cannot find module 'node:...' (lines 1, 3, 5)
```
TS(2307): Cannot find module 'node:fs/promises' / 'node:path' / 'node:url'
```
The tsconfig doesn't include Node.js type definitions.

**Fix:** Install `@types/node` as a dev dependency and ensure `tsconfig.json` includes `"types": ["node"]` in compilerOptions. This fixes all `node:*` import errors, `process`, and `Buffer` errors across ALL script files.

#### 2. import.meta not allowed (line 11)
```
TS(1343): The 'import.meta' meta-property is only allowed when the '--module' option is 'es2020', 'es2022', 'esnext', 'system', 'node16', or 'nodenext'
```
**Fix:** Change tsconfig `"module"` from `"commonjs"` to `"nodenext"` (or `"es2022"`). Also set `"moduleResolution": "nodenext"`.

#### 3. Argument of type 'any' not assignable (line 24)
```
TS(2345): Argument of type 'any' is not assignable to parameter
```
After fixing @types/node, this may resolve. If not, add an explicit type annotation to the variable.

#### 4. Implicit return type 'any' on recursive functions (lines 36, 81)
```
TS(7023): 'deepUnescape' / 'canonicalize' implicitly has return type 'any'
```
**Fix:** Add explicit return type annotations. `deepUnescape` returns `any` (it processes mixed structures), so type it as `: unknown` or trace the actual return. `canonicalize` returns the same.

#### 5. Object.entries (line 42)
```
TS(2550): Property 'entries' does not exist on type 'ObjectConstructor'
```
**Fix:** Already resolved by tsconfig target/lib change.

#### 6. Element implicitly has 'any' type (lines 87, 103)
```
TS(7053): Element implicitly has an 'any' type because expression of type 'string' can't be used to index
```
**Fix:** Add index signature or type assertion at the access site.

#### 7. Cannot find name 'process' (lines 159, 161, 173, 245)
```
TS(2580): Cannot find name 'process'
```
**Fix:** Resolved by installing `@types/node`.

#### 8. Top-level await (line 249)
```
TS(1378): Top-level 'await' expressions are only allowed when the 'module' option is set to 'es2022', 'esnext', 'system', 'node16', or 'nodenext'
```
**Fix:** Resolved by changing `"module"` to `"nodenext"`.

---

## File 2: scripts/run-stream-tests.ts (2 errors)
**Lines:** 1, 93

### Error breakdown

#### 1. Cannot find module 'node:assert/strict' (line 1)
```
TS(2307): Cannot find module 'node:assert/strict'
```
**Fix:** Resolved by @types/node + module change.

#### 2. Cannot find name 'process' (line 93)
```
TS(2580): Cannot find name 'process'
```
**Fix:** Resolved by @types/node.

---

## File 3: scripts/smoke.ts (2 errors)
**Lines:** 1, 9

### Error breakdown

#### 1. Cannot find module 'node:assert/strict' (line 1)
```
TS(2307): Cannot find module 'node:assert/strict'
```
**Fix:** Resolved by @types/node + module change.

#### 2. Expected 1 argument, got 0 (line 9)
```
TS(2554): Expected 1 arguments, but got 0
```
A function/constructor is called with no arguments but its signature requires one.

**Fix:** Check the call site. Likely a `JustHTML()` call missing the `input` argument, or a function that needs a default parameter added.
