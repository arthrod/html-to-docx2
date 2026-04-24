# Packet 08 — scripts/run-tree-construction-tests.ts + scripts/run-markdown-tests.ts + scripts/run-selector-tests.ts

## File 1: scripts/run-tree-construction-tests.ts (10 errors)
**Lines:** 1, 3, 5, 12, 25, 185, 187, 195, 244, 248

### Error breakdown

#### 1. Cannot find module 'node:...' (lines 1, 3, 5)
```
TS(2307): Cannot find module 'node:fs/promises' / 'node:path' / 'node:url'
```
**Fix:** Resolved by @types/node + tsconfig module change (global prerequisite).

#### 2. import.meta not allowed (line 12)
```
TS(1343): The 'import.meta' meta-property is only allowed when '--module' is 'es2020'...
```
**Fix:** Resolved by tsconfig module change.

#### 3. Argument of type 'any' not assignable (line 25)
```
TS(2345): Argument of type 'any' is not assignable to parameter
```
**Fix:** Add explicit type annotation or assertion.

#### 4. Cannot find name 'process' (lines 185, 187, 195, 244)
```
TS(2580): Cannot find name 'process'
```
**Fix:** Resolved by @types/node.

#### 5. Top-level await (line 248)
```
TS(1378): Top-level 'await' expressions are only allowed when 'module' is 'es2022'...
```
**Fix:** Resolved by tsconfig module change.

---

## File 2: scripts/run-markdown-tests.ts (9 errors)
**Lines:** 1, 65, 67, 69, 79, 88, 96, 145, 159

### Error breakdown

#### 1. Cannot find module 'node:assert/strict' (line 1)
```
TS(2307): Cannot find module 'node:assert/strict'
```
**Fix:** Resolved by @types/node + tsconfig module change.

#### 2. Type 'string' not assignable to 'null | undefined' (lines 65, 67, 69, 79, 88, 96)
```
TS(2322): Type 'string' is not assignable to type 'null | undefined'
```
Assigning strings to `Node` properties that were typed as `null | undefined` by ts-migrate. These are setting `node.data`, `node.name`, or `node.namespace` to string values.

**Fix:** These resolve once the `Node` class properties are properly typed with `string | null` instead of the overly narrow types ts-migrate inferred. The Node class fields should be:
```ts
name: string;
namespace: string | null;
data: string | null;
attrs: Record<string, string>;
children: Node[];
parent: Node | null;
templateContent: Node | null;
```

#### 3. Type 'null' not assignable (line 145)
```
TS(2322): Type 'null' is not assignable to type 'string | undefined'
```
Same Node typing issue — assigning null where the type is too narrow.

**Fix:** Resolved by proper Node typing.

#### 4. Cannot find name 'process' (line 159)
```
TS(2580): Cannot find name 'process'
```
**Fix:** Resolved by @types/node.

---

## File 3: scripts/run-selector-tests.ts (5 errors)
**Lines:** 1, 74, 162, 204, 245

### Error breakdown

#### 1. Cannot find module 'node:assert/strict' (line 1)
```
TS(2307): Cannot find module 'node:assert/strict'
```
**Fix:** Resolved by @types/node + tsconfig module change.

#### 2. Parameter 'n' implicitly has 'any' type (lines 74, 162, 204)
```
TS(7006): Parameter 'n' implicitly has an 'any' type
```
Arrow function parameters without type annotations.

**Fix:** Add explicit `: any` or the correct type (likely `Node`) to the parameter:
```ts
(n: Node) => ...
```

#### 3. Cannot find name 'process' (line 245)
```
TS(2580): Cannot find name 'process'
```
**Fix:** Resolved by @types/node.
