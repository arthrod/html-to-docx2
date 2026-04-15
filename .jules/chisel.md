## 2025-02-14 - Typing recursive serialize functions correctly

**Learning:** When a recursive function has an implicit return type of `any` (like `nodeToHTML`), explicitly adding the return type (`: string`) not only fixes the function itself, but it natively fixes cascading `any` inference errors on variables storing its result (`childHTML`) downstream without needing extra typing.
**Action:** Always start by typing the return value of a function explicitly rather than typing the variables that store the result.

## 2025-02-14 - Destructured options in JS

**Learning:** The pattern `function toTestFormat(node: any, options = {})` where `options` is later destructured without a type is common. Creating an interface with optional properties (`?`) and typing `options: MyInterface = {}` correctly allows destructured fallbacks like `const { foreignAttributeAdjustments = DEFAULT } = options`.
**Action:** When creating option interfaces for default parameters, strictly use `?` for properties.
