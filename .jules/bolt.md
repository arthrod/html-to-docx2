## 2024-05-24 - Array allocation overhead in string parsing
**Learning:** In Bun/V8, using `.split()` and regex splits inside hot paths (like parsing inline CSS) incurs massive intermediate array allocation overhead and garbage collection pressure.
**Action:** Replace sequential `.split()` and Regex processing with a `while` loop using `.indexOf()` and `.slice()`. This completely eliminates Regex evaluation and intermediate array allocation overhead.
