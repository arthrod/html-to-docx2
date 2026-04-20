## 2024-05-24 - Weak Random Number Generation in tracking IDs
**Vulnerability:** Weak random number generation using `Math.random()` to generate tracking IDs in `src/tracking.ts`.
**Learning:** `Math.random()` is not cryptographically secure and predictable, which could allow attackers to predict tracking IDs. The code also didn't properly ensure uniform distribution across the entire OOXML range since floating point math is prone to precision issues.
**Prevention:** Use `globalThis.crypto.getRandomValues()` to securely generate IDs. When specific range limits are needed, use TypedArrays (`Uint32Array`) and bitmasking (e.g., `& 0x7f_ff_ff_ff`) instead of floating point math to ensure secure and uniformly distributed values.
