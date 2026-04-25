# TypeScript 6 Compatibility Audit

Tracking record of the TS6 readiness pass done per issue #57. The codebase is **not** being migrated to TS6 yet — this document captures the small set of fixes applied preemptively so that when migration happens, the diff is mechanical.

## Fixes applied

### `src/vdom/index.ts` — type predicate return types

The six predicate functions previously returned the truthy/falsy value of `x` directly via `return x && ...`. Under TS6's `strict: true` default, a user-defined type guard must return `boolean`, not `T | falsy`. Each predicate now leads with `typeof x === 'object' && x !== null && ...` — which narrows correctly for the input union and returns a real `boolean`.

(The canonical fix in the CodeRabbit plan is `return x != null && x.type === ...`, but this repo's `no-eq-null` oxlint rule forbids `!=`/`==` null comparison, its `no-undefined` rule warns on the literal keyword `undefined`, and its `oxc/no-optional-chaining` restriction warns on `x?.type`. The `typeof` + `!== null` pattern avoids all three while producing equivalent behavior.)

Affected functions: `_isVNode`, `isWidget`, `isThunk`, `isVHook`, `isVNode` (exported), `isVText` (exported).

`isVHook` also gained a `typeof x === 'object'` guard, since its input type (`VNodePropertyValue`) includes primitives (`string | number | boolean`) on which `.hook` / `.unhook` access is nonsensical. The runtime behavior is unchanged (primitives already produced `false`), but the guard makes it explicit and keeps the strict-mode typechecker happy.

### `tests/examples/typescript/tsconfig.json` — modernize compiler options

TS6 deprecates `moduleResolution: "node"` (and `node10`). The test tsconfig now uses `moduleResolution: "bundler"` with `module: "esnext"`, mirroring the main build config. `target` bumped from `es2018` to `ES2020` for the same reason.

## Confirmed non-issues

During the audit the following potential TS6 pain points were checked and **do not apply** to this codebase:

- No import assertions (`with { type: "json" }` / `assert { type: "json" }`) anywhere — nothing to migrate.
- No bare side-effect imports that would behave differently under TS6.
- No DOM-collection iteration patterns that rely on the old behavior (`NodeList`, `HTMLCollection` usages either spread into arrays or iterate via indexed loops).
- No method-syntax inference patterns that TS6's narrowing changes would affect.

## Things to revisit at actual migration time

- **`tsconfig.build.json` has `strict: false`**. This is intentional (the non-strict bits in the source aren't ready to migrate), and it differs from TS6's default. When migration happens, plan on either flipping it or explicitly tracking each remaining `strict: false`-dependent site.
- **TS6 defaults `types` to `[]`**. If the build relies on ambient types from `@types/node` or similar being picked up implicitly, an explicit `types` array may need to be added to `tsconfig.build.json` and `tsconfig.json`.

## Reference

- Issue: [#57](https://github.com/arthrod/html-to-docx2/issues/57)
- TS6 announcement: Microsoft Dev Blogs, March 6, 2026 — "Announcing TypeScript 6.0 RC"
