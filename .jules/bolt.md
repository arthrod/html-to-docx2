## 2024-05-18 - Avoid breaking short-circuiting in RegEx optimizations
**Learning:** When optimizing away `regex.test()` in favor of direct `regex.match()` checks within `if/else if` chains, hoisting all `.match()` calls to the top of the block breaks short-circuit evaluation. This causes all regexes to be evaluated unconditionally, resulting in a net performance regression despite removing the `.test()` calls.
**Action:** When replacing `regex.test()` with `regex.match()` inside an `if/else if` chain, use inline assignments (e.g. `if ((match = str.match(regex)))`) to preserve short-circuit evaluation, ensuring subsequent regexes are only evaluated if earlier ones fail.

## 2024-05-18 - Careful with Number.parseInt fallbacks
**Learning:** Using `|| null` as a fallback for `Number.parseInt()` (e.g., `Number.parseInt(str, 10) || null`) incorrectly maps a valid numeric `'0'` string to `null`, since `0` is falsy. This can cause subtle bugs (like losing `font-size: 0`).
**Action:** Always parse the value and check explicitly using `Number.isNaN()` (e.g., `const parsed = Number.parseInt(str, 10); return Number.isNaN(parsed) ? null : parsed`).
