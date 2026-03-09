## 2024-05-24 - [SSRF & LFI in Image Fetching]
**Vulnerability:** The `downloadImageToBase64` functions allowed fetching any URL scheme (e.g., `file://`, `ftp://`), opening up Local File Inclusion (LFI) and Server-Side Request Forgery (SSRF) attack vectors.
**Learning:** Functions that download resources must validate the URL protocol. Absolute URLs without protocol validation are extremely dangerous.
**Prevention:** Implement strict protocol whitelisting (e.g., `http:`, `https:`, `data:`). For applications that must support relative URLs, parsing the URL using `new URL()` and explicitly catching and handling `TypeError` is an effective strategy to validate absolute URLs while safely passing through relative ones.
