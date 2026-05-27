## 2024-05-31 - [Array Accumulation Types]
**Learning:** Empty array initializations without explicit types (`const selectors = []`) often default to `never[]` or `any[]`, causing `TS(2345)` when pushed to or assigned later. The compiler doesn't perform multi-line backward type inference reliably for these assignments.
**Action:** Always explicitly type arrays upon initialization (`const selectors: ComplexSelector[] = []`) to prevent these downstream assignment and method call errors.

## 2024-05-31 - [Recursive Method Type Annotations]
**Learning:** Methods that call themselves or call each other in a cycle (e.g., `matches` -> `_matchesComplex` -> `matches`) trigger `TS(7023)` implicit `any` return types because the TypeScript compiler abandons return type inference to avoid infinite loops.
**Action:** When a method recurses, always add an explicit return type (e.g., `: boolean`) to break the inference cycle and provide the compiler a solid boundary.
