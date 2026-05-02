## 2024-05-02 - Eliminate cloneDeep for RunAttributes
**Learning:** `cloneDeep` from es-toolkit/compat is incredibly slow when used inside hot paths like formatting inline text runs. Replacing it with a shallow copy `{ ...attributes }` for flat objects like `RunAttributes` is roughly 25x faster.
**Action:** Replace `cloneDeep` with object spread where nested object cloning is not strictly required.
