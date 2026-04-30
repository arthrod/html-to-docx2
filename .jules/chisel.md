## 2025-02-23 - [Implicit `any` Object Values as `Record<string, string | null>`]
**Learning:** [When converting JS functions that build objects dynamically (like HTML attribute maps) and have `@ts-expect-error` ignoring implicit `any` indexing, assigning `Record<string, string | null>` precisely represents the dynamic keys while strongly typing the values, rather than settling for `Record<string, any>`.]
**Action:** [Analyze the actual possible values assigned in the loop (e.g. `entry.value` or `null`) and construct the most specific type for the dynamically populated record, fully removing the compiler error and `any` fallback.]

## 2025-02-23 - [Untyped `options` parameters with optional properties]
**Learning:** [JS options objects, often given `options: any` and defaulting to `{}`, lead to extensive `@ts-expect-error TS(2339)` across the function body. The `any` bypasses the initial check, but specific property access still flags errors in stricter setups.]
**Action:** [Create an explicit `Options` interface with optional (`?`) properties. Map every accessed property, ensuring it can accommodate both the expected type and `null` if the implementation does loose checks. Apply this interface to replace `any` and safely delete all associated `@ts-expect-error`s.]
