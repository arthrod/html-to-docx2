🎯 **What:**
The application used `Math.random()` in `generateHexId` within `src/tracking.ts` to generate identifiers.

⚠️ **Risk:**
`Math.random()` is not a Cryptographically Secure Pseudo-Random Number Generator (CSPRNG). If left unfixed, this could allow predictable tracking IDs, opening up potential collision attacks or allowing an attacker to predict valid IDs when used in security-sensitive contexts.

🛡️ **Solution:**
Replaced `Math.random()` with `globalThis.crypto.getRandomValues()`. To preserve execution speed and avoid garbage collection overhead in hot paths, a `Uint32Array` buffer was pre-allocated at the module level.
The value is bitmasked to a positive 32-bit signed integer and clamped to strictly fall between `1` and `2147483646` according to the OOXML specification, rejecting the extreme boundaries appropriately.
