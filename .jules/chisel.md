## 2024-11-20 - SelectorMatcher matches implicit any return
**Learning:** `TS(7023)` implicit any return types can be caused by circular references in mutually recursive functions (`matches`, `_matchesComplex`, `_matchesCompound`, `_matchesSimple`, etc.). When they call each other they cannot be inferred.
**Action:** When fixing recursive functions triggering `TS(7023)` or `TS(7022)` (implicit `any` return types due to recursive references), always add an explicit return type annotation (e.g., `: boolean`) to the function signature to safely resolve the error and enable inference for inner variable assignments.

## 2024-11-20 - Array assignment inferred as never[]
**Learning:** When creating empty arrays such as `const simpleSelectors = []` or `constructor(selectors = [])`, they are inferred as `never[]` or `any[]` and TS complains when elements are pushed to them later or passed into constructors (TS(2345)).
**Action:** When fixing TS(2345) errors where arrays are passed to class constructors or functions, ensure the array variable is explicitly typed upon initialization (e.g., `const simpleSelectors: SimpleSelector[] = []`) to prevent it from being incorrectly inferred as `never[]` or `any[]`.
