## 2025-03-08 - [Server-Side Request Forgery (SSRF) Risk]
**Vulnerability:** The `downloadImageToBase64` function in `src/utils/image.ts` and `src/utils/image-browser.ts` allowed the `fetch` function to be called on any user-provided URL without restricting the protocol. This could potentially allow fetching of local files (like `file:///etc/passwd`) or internal network resources, leading to SSRF.
**Learning:** Functions that download resources based on user-provided input must validate and restrict allowed URL protocols to prevent SSRF vulnerabilities.
**Prevention:** Always validate that URLs strictly start with `http://` or `https://` before fetching them on the server or client side to restrict access to local system resources.
