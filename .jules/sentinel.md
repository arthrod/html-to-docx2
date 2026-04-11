## 2024-05-18 - Prevent Server-Side Request Forgery and Local File Inclusion in Image Fetching

**Vulnerability:** The `downloadImage` and `downloadImageToBase64` functions allowed `fetch` to load any valid URL without protocol restrictions, enabling local file inclusion (`file:///etc/passwd`) and potentially Server-Side Request Forgery (SSRF) against internal services (e.g. `http://169.254.169.254/latest/meta-data/`).
**Learning:** `fetch` inherently supports multiple protocols like `file:`, `data:`, `blob:`, etc. unless explicitly restricted.
**Prevention:** Validate protocols strictly using the `URL` constructor's parsed output before initiating `fetch`. An allowlist like `['http:', 'https:', 'data:', 'blob:']` must be used. Place the validation outside any `try-catch` blocks that broadly swallow specific format errors.
