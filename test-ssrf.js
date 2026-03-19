const urls = [
  'http://2130706433/',
  'http://127.0.0.1/',
  'http://localhost/',
  'http://169.254.169.254/',
  '/relative/path.png',
  'data:image/png;base64,123',
  'blob:http://localhost/123',
  '//127.0.0.1/pic.png',
  'javascript:alert(1)',
  'file:///etc/passwd',
]

urls.forEach((u) => {
  try {
    const p = new URL(u)
    console.log(`[OK] ${u} -> prot: ${p.protocol}, host: ${p.hostname}`)
  } catch {
    console.log(`[ERR] ${u}`)
  }
})
