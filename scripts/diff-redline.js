#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { diffLines, diffWordsWithSpace } = require('diff');
const JSZip = require('jszip');
const {
  extractDocx,
  normalizeXML,
  getAllFiles,
  shouldIgnoreFile,
  filesAreIdentical,
  isXMLFile,
} = require('./diff-utils');

/**
 * DOCX Redlining Script - Creates a new DOCX with tracked changes
 *
 * This script compares two DOCX files and generates a third DOCX that shows
 * all differences as tracked changes (redlines) while preserving original styles.
 *
 * Usage: node scripts/diff-redline.js <baseline.docx> <current.docx> <output.docx>
 */

// Generate a random RSID (8-digit hex)
function generateRSID() {
  return Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');
}

// Get current date in Word format (YYYY-MM-DDTHH:MM:SSZ)
function getWordDate() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Parse XML and extract text runs with their formatting
 * Returns array of { text, rPr, rsid } objects
 */
function parseTextRuns(xmlContent) {
  const runs = [];

  // Match <w:r> elements with their properties
  const runRegex = /<w:r(?: [^>]*)?>[\s\S]*?<\/w:r>/g;
  const matches = xmlContent.match(runRegex);

  if (!matches) return runs;

  for (const runXml of matches) {
    // Extract w:rPr (run properties) if present
    const rPrMatch = runXml.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/);
    const rPr = rPrMatch ? rPrMatch[0] : '';

    // Extract RSID from w:r tag
    const rsidMatch = runXml.match(/w:rsidR="([^"]+)"/);
    const rsid = rsidMatch ? rsidMatch[1] : '';

    // Extract text from <w:t> elements
    const textMatches = runXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
    if (textMatches) {
      const text = textMatches
        .map(t => t.replace(/<w:t[^>]*>|<\/w:t>/g, ''))
        .join('');

      runs.push({ text, rPr, rsid, fullXml: runXml });
    }
  }

  return runs;
}

/**
 * Parse paragraphs with their properties and runs
 */
function parseParagraphs(xmlContent) {
  const paragraphs = [];

  // Match <w:p> elements
  const paraRegex = /<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>/g;
  const matches = xmlContent.match(paraRegex);

  if (!matches) return paragraphs;

  for (const paraXml of matches) {
    // Extract w:pPr (paragraph properties)
    const pPrMatch = paraXml.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/);
    const pPr = pPrMatch ? pPrMatch[0] : '';

    // Extract runs
    const runs = parseTextRuns(paraXml);

    // Get full text
    const text = runs.map(r => r.text).join('');

    paragraphs.push({
      pPr,
      runs,
      text,
      fullXml: paraXml,
    });
  }

  return paragraphs;
}

/**
 * Create tracked change XML for a deletion
 */
function createDeletion(text, rPr, rsid, author = 'Claude', date = getWordDate()) {
  const delRsid = generateRSID();
  const xmlSpace = text.match(/^\s|\s$/) ? ' xml:space="preserve"' : '';

  return `<w:del w:id="${delRsid}" w:author="${author}" w:date="${date}">` +
    `<w:r${rsid ? ` w:rsidDel="${delRsid}"` : ''}>` +
    (rPr || '') +
    `<w:delText${xmlSpace}>${escapeXml(text)}</w:delText>` +
    `</w:r>` +
    `</w:del>`;
}

/**
 * Create tracked change XML for an insertion
 */
function createInsertion(text, rPr, rsid, author = 'Claude', date = getWordDate()) {
  const insRsid = generateRSID();
  const xmlSpace = text.match(/^\s|\s$/) ? ' xml:space="preserve"' : '';

  return `<w:ins w:id="${insRsid}" w:author="${author}" w:date="${date}">` +
    `<w:r${rsid ? ` w:rsidR="${insRsid}"` : ''}>` +
    (rPr || '') +
    `<w:t${xmlSpace}>${escapeXml(text)}</w:t>` +
    `</w:r>` +
    `</w:ins>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a redlined paragraph by comparing baseline and current
 */
function createRedlinedParagraph(baselinePara, currentPara) {
  if (!baselinePara && !currentPara) return '';

  // If paragraph is new (only in current)
  if (!baselinePara && currentPara) {
    const runs = currentPara.runs.map(run =>
      createInsertion(run.text, run.rPr, run.rsid)
    ).join('');
    return `<w:p>${currentPara.pPr}${runs}</w:p>`;
  }

  // If paragraph is deleted (only in baseline)
  if (baselinePara && !currentPara) {
    const runs = baselinePara.runs.map(run =>
      createDeletion(run.text, run.rPr, run.rsid)
    ).join('');
    return `<w:p>${baselinePara.pPr}${runs}</w:p>`;
  }

  // Both exist - compare text runs
  const baselineText = baselinePara.text;
  const currentText = currentPara.text;

  // If identical, use baseline as-is
  if (baselineText === currentText) {
    return baselinePara.fullXml;
  }

  // Perform word-level diff
  const diff = diffWordsWithSpace(baselineText, currentText);

  // Build redlined runs
  const redlinedRuns = [];
  let baselineRunIndex = 0;
  let baselineCharOffset = 0;
  let currentRunIndex = 0;
  let currentCharOffset = 0;

  for (const part of diff) {
    const text = part.value;

    if (!part.added && !part.removed) {
      // Unchanged text - use baseline runs with original formatting
      let remainingText = text;

      while (remainingText.length > 0 && baselineRunIndex < baselinePara.runs.length) {
        const run = baselinePara.runs[baselineRunIndex];
        const runText = run.text.substring(baselineCharOffset);

        if (runText.length <= remainingText.length) {
          // Use entire remaining run
          const rsidAttr = run.rsid ? ` w:rsidR="${run.rsid}"` : '';
          const xmlSpace = runText.match(/^\s|\s$/) ? ' xml:space="preserve"' : '';
          redlinedRuns.push(
            `<w:r${rsidAttr}>${run.rPr}<w:t${xmlSpace}>${escapeXml(runText)}</w:t></w:r>`
          );
          remainingText = remainingText.substring(runText.length);
          baselineRunIndex++;
          baselineCharOffset = 0;
        } else {
          // Use part of run
          const partText = runText.substring(0, remainingText.length);
          const rsidAttr = run.rsid ? ` w:rsidR="${run.rsid}"` : '';
          const xmlSpace = partText.match(/^\s|\s$/) ? ' xml:space="preserve"' : '';
          redlinedRuns.push(
            `<w:r${rsidAttr}>${run.rPr}<w:t${xmlSpace}>${escapeXml(partText)}</w:t></w:r>`
          );
          baselineCharOffset += remainingText.length;
          remainingText = '';
        }
      }

      currentCharOffset += text.length;
      if (currentRunIndex < currentPara.runs.length) {
        const currentRun = currentPara.runs[currentRunIndex];
        if (currentCharOffset >= currentRun.text.length) {
          currentRunIndex++;
          currentCharOffset = 0;
        }
      }
    } else if (part.removed) {
      // Deleted text - preserve baseline formatting
      let remainingText = text;

      while (remainingText.length > 0 && baselineRunIndex < baselinePara.runs.length) {
        const run = baselinePara.runs[baselineRunIndex];
        const runText = run.text.substring(baselineCharOffset);

        if (runText.length <= remainingText.length) {
          redlinedRuns.push(createDeletion(runText, run.rPr, run.rsid));
          remainingText = remainingText.substring(runText.length);
          baselineRunIndex++;
          baselineCharOffset = 0;
        } else {
          const partText = runText.substring(0, remainingText.length);
          redlinedRuns.push(createDeletion(partText, run.rPr, run.rsid));
          baselineCharOffset += remainingText.length;
          remainingText = '';
        }
      }
    } else if (part.added) {
      // Inserted text - use current formatting
      let remainingText = text;

      while (remainingText.length > 0 && currentRunIndex < currentPara.runs.length) {
        const run = currentPara.runs[currentRunIndex];
        const runText = run.text.substring(currentCharOffset);

        if (runText.length <= remainingText.length) {
          redlinedRuns.push(createInsertion(runText, run.rPr, run.rsid));
          remainingText = remainingText.substring(runText.length);
          currentRunIndex++;
          currentCharOffset = 0;
        } else {
          const partText = runText.substring(0, remainingText.length);
          redlinedRuns.push(createInsertion(partText, run.rPr, run.rsid));
          currentCharOffset += remainingText.length;
          remainingText = '';
        }
      }
    }
  }

  // Use baseline paragraph properties (preserve original structure)
  return `<w:p>${baselinePara.pPr}${redlinedRuns.join('')}</w:p>`;
}

/**
 * Generate redlined document.xml
 */
function generateRedlinedDocument(baselineXml, currentXml) {
  // Parse both documents
  const baselineParagraphs = parseParagraphs(baselineXml);
  const currentParagraphs = parseParagraphs(currentXml);

  // Extract document structure (before <w:body> and after </w:body>)
  const bodyStartMatch = baselineXml.match(/([\s\S]*?<w:body>)/);
  const bodyEndMatch = baselineXml.match(/(<\/w:body>[\s\S]*)/);

  const documentPrefix = bodyStartMatch ? bodyStartMatch[1] : '';
  const documentSuffix = bodyEndMatch ? bodyEndMatch[1] : '';

  // Perform paragraph-level diff
  const baselineTexts = baselineParagraphs.map(p => p.text);
  const currentTexts = currentParagraphs.map(p => p.text);

  const paraDiff = diffLines(baselineTexts.join('\n'), currentTexts.join('\n'));

  const redlinedParagraphs = [];
  let baselineIndex = 0;
  let currentIndex = 0;

  for (const part of paraDiff) {
    const lineCount = part.value.split('\n').length - 1;

    if (!part.added && !part.removed) {
      // Unchanged paragraphs - compare each one
      for (let i = 0; i < lineCount; i++) {
        const redlined = createRedlinedParagraph(
          baselineParagraphs[baselineIndex],
          currentParagraphs[currentIndex]
        );
        redlinedParagraphs.push(redlined);
        baselineIndex++;
        currentIndex++;
      }
    } else if (part.removed) {
      // Deleted paragraphs
      for (let i = 0; i < lineCount; i++) {
        const redlined = createRedlinedParagraph(
          baselineParagraphs[baselineIndex],
          null
        );
        redlinedParagraphs.push(redlined);
        baselineIndex++;
      }
    } else if (part.added) {
      // Inserted paragraphs
      for (let i = 0; i < lineCount; i++) {
        const redlined = createRedlinedParagraph(
          null,
          currentParagraphs[currentIndex]
        );
        redlinedParagraphs.push(redlined);
        currentIndex++;
      }
    }
  }

  return documentPrefix + redlinedParagraphs.join('') + documentSuffix;
}

/**
 * Enable track changes in settings.xml
 */
function enableTrackChanges(settingsXml) {
  // Add trackRevisions element if not present
  if (!settingsXml.includes('<w:trackRevisions')) {
    // Add after <w:proofState> or before </w:settings>
    const proofStateMatch = settingsXml.match(/(<w:proofState[^>]*\/>)/);
    if (proofStateMatch) {
      return settingsXml.replace(
        proofStateMatch[0],
        `${proofStateMatch[0]}<w:trackRevisions/>`
      );
    } else {
      return settingsXml.replace('</w:settings>', '<w:trackRevisions/></w:settings>');
    }
  }
  return settingsXml;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: node scripts/diff-redline.js <baseline.docx> <current.docx> <output.docx>');
    process.exit(1);
  }

  const baselinePath = args[0];
  const currentPath = args[1];
  const outputPath = args[2];

  if (!fs.existsSync(baselinePath)) {
    console.error(`Baseline file not found: ${baselinePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(currentPath)) {
    console.error(`Current file not found: ${currentPath}`);
    process.exit(1);
  }

  console.log('📊 DOCX Redlining\n');
  console.log(`Baseline: ${baselinePath}`);
  console.log(`Current:  ${currentPath}`);
  console.log(`Output:   ${outputPath}\n`);

  // Extract both DOCX files
  const tempDir = path.join(__dirname, '..', '.tmp-redline');
  const baselineDir = path.join(tempDir, 'baseline');
  const currentDir = path.join(tempDir, 'current');

  console.log('Extracting DOCX files...');
  await extractDocx(baselinePath, baselineDir);
  await extractDocx(currentPath, currentDir);
  console.log('✓ Extraction complete\n');

  // Read document.xml from both
  const baselineDocPath = path.join(baselineDir, 'word', 'document.xml');
  const currentDocPath = path.join(currentDir, 'word', 'document.xml');

  const baselineXml = fs.readFileSync(baselineDocPath, 'utf8');
  const currentXml = fs.readFileSync(currentDocPath, 'utf8');

  console.log('Generating redlined document...');
  const redlinedXml = generateRedlinedDocument(baselineXml, currentXml);

  // Update settings.xml to enable track changes
  const settingsPath = path.join(baselineDir, 'word', 'settings.xml');
  if (fs.existsSync(settingsPath)) {
    const settingsXml = fs.readFileSync(settingsPath, 'utf8');
    const updatedSettings = enableTrackChanges(settingsXml);
    fs.writeFileSync(settingsPath, updatedSettings);
  }

  // Write redlined document.xml
  fs.writeFileSync(baselineDocPath, redlinedXml);

  console.log('✓ Redlining complete\n');

  // Create output DOCX from modified baseline
  console.log('Creating output DOCX...');
  const zip = new JSZip();

  // Read all files from baseline directory
  const allFiles = getAllFiles(baselineDir);

  for (const file of allFiles) {
    const filePath = path.join(baselineDir, file);
    const content = fs.readFileSync(filePath);
    zip.file(file, content);
  }

  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  fs.writeFileSync(outputPath, zipBuffer);
  console.log('✓ Output DOCX created\n');

  // Cleanup temp directory
  fs.rmSync(tempDir, { recursive: true, force: true });

  console.log(`✅ Redlined document saved to: ${outputPath}`);
  console.log('\nOpen in Microsoft Word to see tracked changes.');

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
