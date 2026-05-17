## 2025-05-17 - Prevent XSS in SVG presentation attributes via url()

**Vulnerability:** Inline SVGs could execute arbitrary JavaScript via presentation attributes like `fill="url(javascript:alert(1))"`, which were only checked against an `ALLOWED_ATTRIBUTES` whitelist without validating the contents of their `url(...)` functions.
**Learning:** Security controls often focus on primary execution vectors like `href` or `<script>` but miss secondary vectors where malicious protocols can be embedded within functional notations (like `url()`) across seemingly benign styling attributes (`fill`, `stroke`, `mask`, `clip-path`).
**Prevention:** When whitelisting attributes that accept URLs or functional notations, always apply protocol sanitization not just to the raw value, but also parse and validate the internal arguments of the `url(...)` wrappers using a non-vulnerable regex.
