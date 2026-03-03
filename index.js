/* eslint-disable no-useless-escape */
import JSZip from 'jszip';
import { minify } from 'html-minifier-terser';

import createDocumentOptionsAndMergeWithDefaults from './src/utils/options-utils';
import addFilesToContainer from './src/html-to-docx';

const minifyHTMLString = async (htmlString) => {
  try {
    if (typeof htmlString === 'string' || htmlString instanceof String) {
      const minifiedHTMLString = await minify(htmlString, {
        collapseWhitespace: true,
        removeComments: true,
      });
      return minifiedHTMLString;
    }

    throw new Error('invalid html string');
  } catch (error) {
    return null;
  }
};

const DOCX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const resolveRuntime = () => {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  return {};
};

const isNodeRuntime = (runtime) =>
  Boolean(runtime && runtime.process && runtime.process.versions && runtime.process.versions.node);

async function generateContainer(
  htmlString,
  headerHTMLString,
  documentOptions = {},
  footerHTMLString
) {
  const zip = new JSZip();

  const normalizedDocumentOptions = createDocumentOptionsAndMergeWithDefaults(documentOptions);

  let contentHTML = htmlString;
  let headerHTML = headerHTMLString;
  let footerHTML = footerHTMLString;
  if (htmlString && !normalizedDocumentOptions['preprocessing']['skipHTMLMinify']) {
    contentHTML = await minifyHTMLString(contentHTML);
  }
  if (headerHTMLString && !normalizedDocumentOptions['preprocessing']['skipHTMLMinify']) {
    headerHTML = await minifyHTMLString(headerHTML);
  }
  if (footerHTMLString && !normalizedDocumentOptions['preprocessing']['skipHTMLMinify']) {
    footerHTML = await minifyHTMLString(footerHTML);
  }

  await addFilesToContainer(zip, contentHTML, normalizedDocumentOptions, headerHTML, footerHTML);

  const buffer = await zip.generateAsync({ type: 'arraybuffer' });

  const runtime = resolveRuntime();
  const hasBuffer = Boolean(runtime?.Buffer && typeof runtime.Buffer.from === 'function');
  const hasBlob = typeof runtime?.Blob === 'function';

  // Keep Node.js return type stable (Buffer), even on newer Node versions with Blob support.
  if (isNodeRuntime(runtime) && hasBuffer) {
    return runtime.Buffer.from(new Uint8Array(buffer));
  }
  if (hasBlob) {
    return new runtime.Blob([buffer], {
      type: DOCX_MIME_TYPE,
    });
  }

  // Last fallback for non-browser runtimes that only provide Buffer.
  if (hasBuffer) {
    return runtime.Buffer.from(new Uint8Array(buffer));
  }

  throw new Error(
    'Add blob support using a polyfill eg https://github.com/bjornstar/blob-polyfill'
  );
}

export default generateContainer;
