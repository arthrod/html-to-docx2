## 2024-05-28 - [HIGH] Fix LFI/SSRF in image fetch functions

**Vulnerability:** The internal `downloadImage` and `downloadImageToBase64` functions called `fetch(url)` directly without verifying the URL protocol, potentially allowing an attacker to fetch arbitrary local files (`file://`), triggering Server-Side Request Forgery (SSRF) and Local File Inclusion (LFI).
**Learning:** `fetch` inherently supports various protocols beyond HTTP/HTTPS in different environments. Relying solely on `fetch`'s internal validation is insufficient if the runtime environment allows `file://` or other sensitive protocols.
**Prevention:** Always parse and explicitly whitelist allowed protocols (`http:`, `https:`, `data:`, `blob:`) using `new URL(...)` before executing network requests.
