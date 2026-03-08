# Ralph execution prompt (sequential batches)

You are assigned lint-fix work from the generated batch files:

- `files_to_fix_01.md`
- `files_to_fix_02.md`
- ...
- `files_to_fix_13.md`

## Non-negotiable rules

1. Each Ralph instance must work on exactly one batch file.
2. Process batches sequentially in numeric order (`01 -> 02 -> ... -> 13`).
3. Do not start a higher-numbered batch until the lower-numbered one is complete.
4. You may only mark an item as fixed after verifying it is actually fixed.

## Required workflow for one Ralph

1. Pick one batch file (for example `files_to_fix_04.md`).
2. Work through its checklist items in order.
3. For each item:
   - Fix the code for that exact file/rule/location.
   - Re-run lint for the affected file (or full project if needed), for example:
     - `bun x oxlint --tsconfig tsconfig.build.json --config .oxlintrc.json --quiet --format json <file>`
   - Confirm the specific lint error is gone.
   - Review the code change to ensure it is a real fix (not a suppression or accidental bypass).
   - Only then change `[ ]` to `[x]` for that line in the batch file.
4. When all items in the assigned batch are verified fixed, mark the batch status as complete.

## Completion gate

You cannot claim a batch is complete if any listed error still appears in lint output.
