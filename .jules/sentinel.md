## 2024-05-20 - [Image Download SSRF]
**Vulnerability:** Found missing protocol validation in `downloadImageToBase64` and `downloadImage` functions which could lead to SSRF (Server-Side Request Forgery) and LFI (Local File Inclusion) by allowing `file://`, `ftp://`, or `gopher://` URLs.
**Learning:** `fetch` or `node-fetch` and internal URL processing functions will attempt to download from any URL passed to them unless strictly validated, exposing the server's internal networks or local files.
**Prevention:** Always validate protocols on user-supplied URLs against an allowlist (e.g., `http:`, `https:`, `data:`) before processing or passing to download functions. Be careful to handle `TypeError` for potentially valid relative URLs where the `URL` constructor may fail.
