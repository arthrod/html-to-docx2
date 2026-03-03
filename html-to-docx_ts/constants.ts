import { cloneDeep } from 'lodash';

export type Orientation = 'landscape' | 'portrait';

export type Direction = 'ltr' | 'rtl';

export type HeaderFooterType = 'default' | 'even' | 'first';

export type LineNumberRestart = 'continuous' | 'newPage' | 'newSection';

export type ListStyleType =
  | 'decimal'
  | 'disc'
  | 'lower-alpha'
  | 'lower-roman'
  | 'upper-alpha'
  | 'upper-roman';

export type VerticalAlign = 'bottom' | 'middle' | 'top';

export type Margins = {
  bottom: number;
  footer: number;
  gutter: number;
  header: number;
  left: number;
  right: number;
  top: number;
};

export type PageSize = {
  height: number;
  width: number;
};

export type HeadingSpacing = {
  after: number;
  before: number;
};

export type HeadingStyleOptions = {
  bold: boolean;
  font: string;
  fontSize: number;
  keepLines: boolean;
  keepNext: boolean;
  outlineLevel: number;
  spacing: HeadingSpacing;
};

export type HeadingOptions = {
  heading1: HeadingStyleOptions;
  heading2: HeadingStyleOptions;
  heading3: HeadingStyleOptions;
  heading4: HeadingStyleOptions;
  heading5: HeadingStyleOptions;
  heading6: HeadingStyleOptions;
};

export type TableRowOptions = {
  cantSplit: boolean;
};

export type TableBorderOptions = {
  color: string;
  size: number;
  stroke: string;
};

export type TableBorderAttributeOptions = {
  size: number;
  stroke: string;
};

export type TableOptions = {
  addSpacingAfter: boolean;
  borderOptions: TableBorderOptions;
  row: TableRowOptions;
};

export type LineNumberOptions = {
  countBy: number;
  restart: LineNumberRestart;
  start: number;
};

export type NumberingOptions = {
  defaultOrderedListStyleType: ListStyleType;
};

export type ImageProcessingOptions = {
  downloadTimeout: number;
  maxCacheEntries: number;
  maxCacheSize: number;
  maxImageSize: number;
  maxRetries: number;
  maxTimeout: number;
  minImageSize: number;
  minTimeout: number;
  retryDelayBase: number;
  suppressSharpWarning: boolean;
  svgHandling: 'convert' | 'native';
  svgSanitization: boolean;
  verboseLogging: boolean;
};

export type BorderSide = {
  color: string;
  size: number;
  spacing: number;
};

export type ParagraphBorders = {
  bottom: BorderSide;
  left: BorderSide;
  right: BorderSide;
  top: BorderSide;
};

export type DocumentOptions = {
  complexScriptFontSize: number;
  createdAt: Date;
  creator: string;
  decodeUnicode: boolean;
  defaultLang: string;
  description: string;
  direction: Direction;
  font: string;
  fontSize: number;
  footer: boolean;
  footerType: HeaderFooterType;
  header: boolean;
  headerType: HeaderFooterType;
  heading: HeadingOptions;
  imageProcessing: ImageProcessingOptions;
  keywords: string[];
  lastModifiedBy: string;
  lineNumber: boolean;
  lineNumberOptions: LineNumberOptions;
  margins: Margins;
  modifiedAt: Date;
  numbering: NumberingOptions;
  orientation: Orientation;
  pageNumber: boolean;
  pageSize: PageSize;
  revision: number;
  skipFirstHeaderFooter: boolean;
  subject: string;
  table: TableOptions;
  title: string;
};

const applicationName = 'html-to-docx';
const defaultOrientation: Orientation = 'portrait';
const landscapeWidth = 15_840;
const landscapeHeight = 12_240;
const landscapeMargins: Margins = {
  bottom: 1800,
  footer: 720,
  gutter: 0,
  header: 720,
  left: 1440,
  right: 1440,
  top: 1800,
};
const portraitMargins: Margins = {
  bottom: 1440,
  footer: 720,
  gutter: 0,
  header: 720,
  left: 1800,
  right: 1800,
  top: 1440,
};
const defaultFont = 'Times New Roman';
const defaultFontSize = 22;
const defaultLang = 'en-US';
const defaultDirection: Direction = 'ltr';
const defaultTableBorderOptions: TableBorderOptions = {
  color: '000000',
  size: 0,
  stroke: 'nil',
};
const defaultTableBorderAttributeOptions: TableBorderAttributeOptions = {
  size: 1,
  stroke: 'single',
};

const SVG_UNIT_TO_PIXEL_CONVERSIONS: Record<string, number> = {
  '%': 1,
  cm: 37.7952755906,
  em: 16,
  in: 96,
  mm: 3.77952755906,
  pc: 16,
  pt: 1.33333333333,
  px: 1,
  rem: 16,
};

const defaultHeadingOptions: HeadingOptions = {
  heading1: {
    bold: true,
    font: defaultFont,
    fontSize: 48,
    keepLines: true,
    keepNext: true,
    outlineLevel: 0,
    spacing: { before: 480, after: 0 },
  },
  heading2: {
    bold: true,
    font: defaultFont,
    fontSize: 36,
    keepLines: true,
    keepNext: true,
    outlineLevel: 1,
    spacing: { before: 360, after: 80 },
  },
  heading3: {
    bold: true,
    font: defaultFont,
    fontSize: 28,
    keepLines: true,
    keepNext: true,
    outlineLevel: 2,
    spacing: { before: 280, after: 80 },
  },
  heading4: {
    bold: true,
    font: defaultFont,
    fontSize: 24,
    keepLines: true,
    keepNext: true,
    outlineLevel: 3,
    spacing: { before: 240, after: 40 },
  },
  heading5: {
    bold: true,
    font: defaultFont,
    fontSize: defaultFontSize,
    keepLines: true,
    keepNext: true,
    outlineLevel: 4,
    spacing: { before: 220, after: 40 },
  },
  heading6: {
    bold: true,
    font: defaultFont,
    fontSize: 20,
    keepLines: true,
    keepNext: true,
    outlineLevel: 5,
    spacing: { before: 200, after: 40 },
  },
};

const defaultDocumentOptions: DocumentOptions = {
  complexScriptFontSize: defaultFontSize,
  createdAt: new Date(),
  creator: applicationName,
  decodeUnicode: false,
  defaultLang,
  description: '',
  direction: defaultDirection,
  font: defaultFont,
  fontSize: defaultFontSize,
  footer: false,
  footerType: 'default',
  header: false,
  headerType: 'default',
  heading: defaultHeadingOptions,
  imageProcessing: {
    downloadTimeout: 5000,
    maxCacheEntries: 100,
    maxCacheSize: 20 * 1024 * 1024,
    maxImageSize: 10 * 1024 * 1024,
    maxRetries: 2,
    maxTimeout: 30000,
    minImageSize: 1024,
    minTimeout: 1000,
    retryDelayBase: 500,
    suppressSharpWarning: false,
    svgHandling: 'convert',
    svgSanitization: true,
    verboseLogging: false,
  },
  keywords: [applicationName],
  lastModifiedBy: applicationName,
  lineNumber: false,
  lineNumberOptions: {
    countBy: 1,
    restart: 'continuous',
    start: 0,
  },
  margins: cloneDeep(portraitMargins),
  modifiedAt: new Date(),
  numbering: {
    defaultOrderedListStyleType: 'decimal',
  },
  orientation: defaultOrientation,
  pageNumber: false,
  pageSize: {
    height: landscapeWidth,
    width: landscapeHeight,
  },
  revision: 1,
  skipFirstHeaderFooter: false,
  subject: '',
  table: {
    addSpacingAfter: true,
    borderOptions: defaultTableBorderOptions,
    row: {
      cantSplit: false,
    },
  },
  title: '',
};
const defaultHTMLString = '<p></p>';
const relsFolderName = '_rels';
const headerFileName = 'header1';
const footerFileName = 'footer1';
const themeFileName = 'theme1';
const documentFileName = 'document';
const headerType = 'header';
const footerType = 'footer';
const themeType = 'theme';
const commentsType = 'comments';
const commentsExtendedType = 'commentsExtended';
const commentsIdsType = 'commentsIds';
const commentsExtensibleType = 'commentsExtensible';
const peopleType = 'people';

// Content types for comment-related XML parts
const commentsExtendedContentType =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml';
const commentsIdsContentType =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.commentsIds+xml';
const commentsExtensibleContentType =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtensible+xml';
const peopleContentType =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.people+xml';

// Relationship types for comment-related XML parts
const commentsExtendedRelationshipType =
  'http://schemas.microsoft.com/office/2011/relationships/commentsExtended';
const commentsIdsRelationshipType =
  'http://schemas.microsoft.com/office/2016/09/relationships/commentsIds';
const commentsExtensibleRelationshipType =
  'http://schemas.microsoft.com/office/2018/08/relationships/commentsExtensible';
const peopleRelationshipType =
  'http://schemas.microsoft.com/office/2011/relationships/people';

const hyperlinkType = 'hyperlink';
const imageType = 'image';
const internalRelationship = 'Internal';
const wordFolder = 'word';
const themeFolder = 'theme';
const paragraphBordersObject: ParagraphBorders = {
  bottom: {
    color: 'FFFFFF',
    size: 0,
    spacing: 3,
  },
  left: {
    color: 'FFFFFF',
    size: 0,
    spacing: 3,
  },
  right: {
    color: 'FFFFFF',
    size: 0,
    spacing: 3,
  },
  top: {
    color: 'FFFFFF',
    size: 0,
    spacing: 3,
  },
};
const colorlessColors: string[] = ['transparent', 'auto'];
const verticalAlignValues: VerticalAlign[] = ['top', 'middle', 'bottom'];

export {
  applicationName,
  colorlessColors,
  commentsExtendedContentType,
  commentsExtendedRelationshipType,
  commentsExtendedType,
  commentsExtensibleContentType,
  commentsExtensibleRelationshipType,
  commentsExtensibleType,
  commentsIdsContentType,
  commentsIdsRelationshipType,
  commentsIdsType,
  commentsType,
  defaultDirection,
  defaultDocumentOptions,
  defaultFont,
  defaultFontSize,
  defaultHeadingOptions,
  defaultHTMLString,
  defaultLang,
  defaultOrientation,
  defaultTableBorderAttributeOptions,
  defaultTableBorderOptions,
  documentFileName,
  footerFileName,
  footerType,
  headerFileName,
  headerType,
  hyperlinkType,
  imageType,
  internalRelationship,
  landscapeHeight,
  landscapeMargins,
  landscapeWidth,
  paragraphBordersObject,
  peopleContentType,
  peopleRelationshipType,
  peopleType,
  portraitMargins,
  relsFolderName,
  SVG_UNIT_TO_PIXEL_CONVERSIONS,
  themeFileName,
  themeFolder,
  themeType,
  verticalAlignValues,
  wordFolder,
};
