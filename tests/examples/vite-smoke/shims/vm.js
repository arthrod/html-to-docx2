const vmShim = {
  runInThisContext() {
    throw new Error('The Node.js vm module is not available in browsers.')
  },
}

export const runInThisContext = vmShim.runInThisContext
export default vmShim
