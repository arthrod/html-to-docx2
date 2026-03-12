// @ts-check

import HTMLToDOCX from '../../../dist/browser/index.js'

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
const requireHtmlElement = (id) => {
  const element = document.getElementById(id)
  if (!element) {
    throw new Error(`Missing required element: #${id}`)
  }
  return element
}

/**
 * @param {string} id
 * @returns {HTMLButtonElement}
 */
const requireButtonElement = (id) => {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`Missing required button element: #${id}`)
  }
  return element
}

const statusEl = requireHtmlElement('status')
const detailsEl = requireHtmlElement('details')
const buttonEl = requireButtonElement('generate')

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * @param {string} value
 * @param {string} [details]
 * @returns {void}
 */
const setStatus = (value, details = '') => {
  statusEl.textContent = value
  statusEl.className = value.startsWith('PASS')
    ? 'pass'
    : value.startsWith('FAIL')
      ? 'fail'
      : ''
  detailsEl.textContent = details
}

/**
 * @typedef {Blob | ArrayBuffer | Uint8Array | { buffer: ArrayBuffer; length: number }} BrowserDocxResult
 */

/**
 * @param {BrowserDocxResult} result
 * @returns {Blob}
 */
const normalizeResultToBlob = (result) => {
  if (result instanceof Blob) return result
  if (result instanceof ArrayBuffer) return new Blob([result], { type: DOCX_MIME_TYPE })
  if (result instanceof Uint8Array) {
    const copiedBytes = Uint8Array.from(result)
    return new Blob([copiedBytes], { type: DOCX_MIME_TYPE })
  }
  if (result && result.buffer && typeof result.length === 'number') {
    const bytes = new Uint8Array(result.buffer, 0, result.length)
    const copiedBytes = Uint8Array.from(bytes)
    return new Blob([copiedBytes], { type: DOCX_MIME_TYPE })
  }
  throw new Error(`Unexpected result type: ${Object.prototype.toString.call(result)}`)
}

/**
 * @returns {Promise<void>}
 */
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
