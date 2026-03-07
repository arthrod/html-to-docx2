// @ts-check

/**
 * Browser-only shim for the Node `vm` API.
 *
 * @param {string} _code
 * @param {string | object} [_options]
 * @returns {never}
 */
const runInThisContextShim = (_code, _options) => {
  throw new Error('The Node.js vm module is not available in browsers.')
}

/** @type {{ runInThisContext: typeof runInThisContextShim }} */
const vmShim = {
  runInThisContext: runInThisContextShim,
}

export const runInThisContext = vmShim.runInThisContext
export default vmShim
