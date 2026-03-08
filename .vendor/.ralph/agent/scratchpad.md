## Iteration plan

- Found many `@ts-expect-error` directives that are now unused once the global config updates landed; `npx tsc --noEmit` reports 38 TS2578 errors (scripts and selector/html5lib files).
- Plan: remove each unused `@ts-expect-error` comment (the ones flagged).
- After removal, rerun `npx tsc --noEmit` to confirm no remaining compile errors.

## Iteration progress

- Removed all flagged unused `@ts-expect-error` directives from the scripts and HTML serializer/selector sources.
- Re-ran `npx tsc --noEmit` and confirmed a clean compilation with zero errors.
