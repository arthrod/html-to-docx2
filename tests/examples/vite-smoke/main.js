import HTMLToDOCX from '../../../dist/browser.js'

const statusEl = document.getElementById('status')
const detailsEl = document.getElementById('details')
const buttonEl = document.getElementById('generate')

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

const setStatus = (value, details = '') => {
  statusEl.textContent = value
  statusEl.className = value.startsWith('PASS')
    ? 'pass'
    : value.startsWith('FAIL')
      ? 'fail'
      : ''
  detailsEl.textContent = details
}

const normalizeResultToBlob = (result) => {
  if (result instanceof Blob) return result
  if (result instanceof ArrayBuffer) return new Blob([result], { type: DOCX_MIME_TYPE })
  if (result instanceof Uint8Array) return new Blob([result], { type: DOCX_MIME_TYPE })
  if (result && result.buffer && typeof result.length === 'number') {
    return new Blob([new Uint8Array(result)], { type: DOCX_MIME_TYPE })
  }
  throw new Error(`Unexpected result type: ${Object.prototype.toString.call(result)}`)
}

const runSmoke = async () => {
  try {
    buttonEl.disabled = true
    setStatus('running', 'Generating DOCX in browser...')

    if (typeof HTMLToDOCX !== 'function') {
      throw new Error('HTMLToDOCX export is unavailable')
    }

    const result = await HTMLToDOCX('<p>Vite polyfill smoke test</p>', null, {
      title: 'Vite Smoke',
      creator: 'Vite Smoke',
      imageProcessing: {
        svgHandling: 'native',
      },
    })

    const blob = normalizeResultToBlob(result)
    const size = blob.size

    if (!size || size < 100) {
      throw new Error(`Generated file is unexpectedly small (${size} bytes)`)
    }

    setStatus(
      'PASS_BLOB',
      `Generated ${size} bytes (${Object.prototype.toString.call(result)})`
    )
    console.log('[SMOKE] PASS_BLOB', {
      size,
      rawType: Object.prototype.toString.call(result),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    setStatus('FAIL', message)
    console.error('[SMOKE] FAIL', error)
  } finally {
    buttonEl.disabled = false
  }
}

buttonEl.addEventListener('click', () => {
  void runSmoke()
})

void runSmoke()
