import JSZip from 'jszip';
import { XMLBuilder } from 'xmlbuilder2/lib/interfaces';

/** Active suggestion state for nesting */
export declare interface ActiveSuggestion {
    id: string;
    type: 'insert' | 'remove';
    author?: string;
    date?: string;
    revisionId: number;
}

/** Document-wide set of allocated hex IDs to ensure uniqueness (per R12). */
export declare const allocatedIds: Set<string>;

export declare const applicationName = "html-to-docx";

export declare type BorderOptions = {
    color?: string;
    size?: number;
};

export declare type BorderSide = {
    color: string;
    size: number;
    spacing: number;
};

export declare type BrowserDocxResult = Blob;

/**
 * Build a comment end token string.
 */
export declare function buildCommentEndToken(id: string): string;

/**
 * Build a comment range end marker.
 */
export declare function buildCommentRangeEnd(id: number): XMLBuilder;

/**
 * Build a comment range start marker.
 */
export declare function buildCommentRangeStart(id: number): XMLBuilder;

/**
 * Build a comment reference run (appears after commentRangeEnd).
 */
export declare function buildCommentReferenceRun(id: number): XMLBuilder;

/**
 * Build a comment start token string.
 */
export declare function buildCommentStartToken(payload: CommentPayload): string;

/**
 * Build a deleted text element (w:delText) for deletions.
 */
export declare function buildDeletedTextElement(text: string): XMLBuilder;

/**
 * Build a suggestion end token string.
 */
export declare function buildSuggestionEndToken(id: string, type: 'insert' | 'remove'): string;

/**
 * Build a suggestion start token string.
 */
export declare function buildSuggestionStartToken(payload: SuggestionPayload, type: 'insert' | 'remove'): string;

/**
 * Build a text element for normal text.
 */
export declare function buildTextElement(text: string): XMLBuilder;

export declare const colorlessColors: ReadonlyArray<string>;

/** Payload for comment tokens */
export declare interface CommentPayload {
    id: string;
    authorName?: string;
    authorInitials?: string;
    date?: string;
    /** OOXML paraId for round-trip threading fidelity */
    paraId?: string;
    /** OOXML parentParaId for round-trip threading fidelity */
    parentParaId?: string;
    text?: string;
    replies?: CommentReply[];
}

/** Payload for a single comment reply */
export declare interface CommentReply {
    id: string;
    authorName?: string;
    authorInitials?: string;
    date?: string;
    /** OOXML paraId for round-trip threading fidelity */
    paraId?: string;
    text?: string;
}

export declare const commentsExtendedContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml";

export declare const commentsExtendedRelationshipType = "http://schemas.microsoft.com/office/2011/relationships/commentsExtended";

export declare const commentsExtendedType = "commentsExtended";

export declare const commentsExtensibleContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtensible+xml";

export declare const commentsExtensibleRelationshipType = "http://schemas.microsoft.com/office/2018/08/relationships/commentsExtensible";

export declare const commentsExtensibleType = "commentsExtensible";

export declare const commentsIdsContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.commentsIds+xml";

export declare const commentsIdsRelationshipType = "http://schemas.microsoft.com/office/2016/09/relationships/commentsIds";

export declare const commentsIdsType = "commentsIds";

export declare const commentsType = "comments";

export declare const defaultDirection: Direction;

export declare const defaultDocumentOptions: DocumentOptions$1;

export declare const defaultFont = "Times New Roman";

export declare const defaultFontSize = 22;

export declare const defaultHeadingOptions: HeadingOptions$1;

export declare const defaultHTMLString = "<p></p>";

export declare const defaultLang = "en-US";

export declare const defaultOrientation: Orientation;

export declare const defaultTableBorderAttributeOptions: TableBorderAttributeOptions;

export declare const defaultTableBorderOptions: TableBorderOptions$1;

export declare type Direction = 'ltr' | 'rtl';

export declare const documentFileName = "document";

export declare type DocumentMargins = {
    bottom: number;
    footer: number;
    gutter: number;
    header: number;
    left: number;
    right: number;
    top: number;
};

declare type DocumentOptions$1 = {
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
    heading: HeadingOptions$1;
    imageProcessing: ImageProcessingOptions;
    keywords: string[];
    lastModifiedBy: string;
    lineNumber: boolean;
    lineNumberOptions: LineNumberOptions$2;
    margins: Margins$2;
    modifiedAt: Date;
    numbering: NumberingOptions$1;
    orientation: Orientation;
    pageNumber: boolean;
    pageSize: PageSize$2;
    revision: number;
    skipFirstHeaderFooter: boolean;
    subject: string;
    table: TableOptions$2;
    title: string;
};

export declare type DocumentOptions = {
    complexScriptFontSize?: number | string;
    createdAt?: Date;
    creator?: string;
    decodeUnicode?: boolean;
    defaultLang?: string;
    description?: string;
    direction?: 'ltr' | 'rtl';
    font?: string;
    fontSize?: number | string;
    footer?: boolean;
    footerType?: 'default' | 'even' | 'first';
    header?: boolean;
    headerType?: 'default' | 'even' | 'first';
    heading?: HeadingOptions;
    imageProcessing?: ImageProcessing;
    keywords?: string[];
    lastModifiedBy?: string;
    lineNumber?: boolean | LineNumberOptions;
    lineNumberOptions?: LineNumberOptions;
    margins?: Margins;
    modifiedAt?: Date;
    numbering?: NumberingOptions;
    orientation?: 'landscape' | 'portrait';
    pageNumber?: boolean;
    pageSize?: PageSize;
    revision?: number;
    skipFirstHeaderFooter?: boolean;
    subject?: string;
    table?: TableOptions;
    title?: string;
};

export declare const DOCX_COMMENT_END_TOKEN_PREFIX = "[[DOCX_CMT_END:";

export declare const DOCX_COMMENT_START_TOKEN_PREFIX = "[[DOCX_CMT_START:";

export declare const DOCX_COMMENT_TOKEN_SUFFIX = "]]";

export declare const DOCX_DELETION_END_TOKEN_PREFIX = "[[DOCX_DEL_END:";

export declare const DOCX_DELETION_START_TOKEN_PREFIX = "[[DOCX_DEL_START:";

export declare const DOCX_DELETION_TOKEN_SUFFIX = "]]";

export declare const DOCX_INSERTION_END_TOKEN_PREFIX = "[[DOCX_INS_END:";

export declare const DOCX_INSERTION_START_TOKEN_PREFIX = "[[DOCX_INS_START:";

export declare const DOCX_INSERTION_TOKEN_SUFFIX = "]]";

/** DocxDocument constructor properties */
export declare interface DocxDocumentProperties {
    complexScriptFontSize?: number | null;
    createdAt?: Date;
    creator?: string;
    direction?: Direction;
    description?: string;
    font?: string;
    fontSize?: number | null;
    footer?: boolean;
    footerType?: HeaderFooterType;
    header?: boolean;
    headerType?: HeaderFooterType;
    heading?: typeof defaultDocumentOptions.heading;
    htmlString: string | null;
    imageProcessing?: typeof defaultDocumentOptions.imageProcessing;
    keywords?: string[];
    lang?: string;
    lastModifiedBy?: string;
    lineNumber?: boolean;
    lineNumberOptions?: LineNumberOptions$1;
    margins?: Margins$1 | null;
    modifiedAt?: Date;
    numbering?: ListStyleDefaults;
    orientation?: Orientation;
    pageNumber?: boolean;
    pageSize?: PageSize$1 | null;
    revision?: number;
    skipFirstHeaderFooter?: boolean;
    subject?: string;
    table?: TableOptions$1;
    title?: string;
    zip: JSZip;
}

export declare type DocxListStyleType = 'decimal' | 'lowerLetter' | 'lowerRoman' | 'upperLetter' | 'upperRoman';

/**
 * Ensure tracking state is initialized on the document instance.
 */
export declare function ensureTrackingState(docxDocumentInstance: TrackingDocumentInstance): TrackingState;

/** File relationship entry */
export declare interface FileRelationship {
    fileName: string;
    lastRelsId: number;
    rels: RelationshipObject[];
}

/**
 * Collect all tracking token strings from text.
 */
export declare function findDocxTrackingTokens(text: string): string[];

/** Font table object */
export declare interface FontTableObject {
    fontName: string;
    genericFontName: string;
}

export declare const footerFileName = "footer1";

/** Footer object stored in the document */
export declare interface FooterObject {
    footerId: number;
    relationshipId: number;
    type: HeaderFooterType;
}

/** Section footer result */
export declare interface FooterResult {
    footerId: number;
    footerXML: XMLBuilder;
}

export declare const footerType = "footer";

declare function generateContainer(htmlString: string, headerHTMLString?: string | null, documentOptions?: DocumentOptions, footerHTMLString?: string | null): Promise<Blob | Buffer | Uint8Array>;
export { generateContainer as HTMLtoDOCX }
export default generateContainer;

/** Generate a unique 8-char uppercase hex ID < 0x7FFFFFFF per OOXML spec. */
export declare function generateHexId(): string;

/**
 * Check if text contains any DOCX tracking tokens.
 */
export declare function hasTrackingTokens(text: string): boolean;

export declare const headerFileName = "header1";

export declare type HeaderFooterType = 'default' | 'even' | 'first';

/** Header object stored in the document */
export declare interface HeaderObject {
    headerId: number;
    relationshipId: number;
    type: HeaderFooterType;
}

/** Section header result */
export declare interface HeaderResult {
    headerId: number;
    headerXML: XMLBuilder;
}

export declare const headerType = "header";

declare type HeadingOptions$1 = {
    heading1: HeadingStyleOptions$1;
    heading2: HeadingStyleOptions$1;
    heading3: HeadingStyleOptions$1;
    heading4: HeadingStyleOptions$1;
    heading5: HeadingStyleOptions$1;
    heading6: HeadingStyleOptions$1;
};

export declare type HeadingOptions = {
    heading1?: HeadingStyleOptions;
    heading2?: HeadingStyleOptions;
    heading3?: HeadingStyleOptions;
    heading4?: HeadingStyleOptions;
    heading5?: HeadingStyleOptions;
    heading6?: HeadingStyleOptions;
};

declare type HeadingSpacing$1 = {
    after: number;
    before: number;
};

export declare type HeadingSpacing = {
    after?: number;
    before?: number;
    line?: number;
    lineRule?: 'atLeast' | 'auto' | 'exact';
};

declare type HeadingStyleOptions$1 = {
    bold: boolean;
    font: string;
    fontSize: number;
    keepLines: boolean;
    keepNext: boolean;
    outlineLevel: number;
    spacing: HeadingSpacing$1;
};

export declare type HeadingStyleOptions = {
    bold?: boolean;
    color?: string;
    font?: string;
    fontSize?: number;
    italic?: boolean;
    spacing?: HeadingSpacing;
    underline?: boolean;
};

export declare type HtmlToDocxResult = BrowserDocxResult | NodeDocxResult;

export declare const hyperlinkType = "hyperlink";

/**
 * Browser-compatible image dimension parser
 * Parses image dimensions from a Buffer without using Node.js fs module
 */
export declare type ImageDimensions = {
    height: number;
    type: 'bmp' | 'gif' | 'jpg' | 'png' | 'unknown' | 'webp';
    width: number;
};

export declare type ImageProcessing = {
    downloadTimeout?: number;
    maxCacheEntries?: number;
    maxCacheSize?: number;
    maxImageSize?: number;
    maxRetries?: number;
    maxTimeout?: number;
    minImageSize?: number;
    minTimeout?: number;
    retryDelayBase?: number;
    suppressSharpWarning?: boolean;
    svgHandling?: 'convert' | 'native';
    svgSanitization?: boolean;
    verboseLogging?: boolean;
};

export declare type ImageProcessingOptions = {
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

export declare const imageType = "image";

export declare const internalRelationship = "Internal";

export declare const landscapeHeight = 12240;

export declare const landscapeMargins: Margins$2;

export declare const landscapeWidth = 15840;

/** Line number options */
declare interface LineNumberOptions$1 {
    countBy?: number;
    restart?: LineNumberRestart;
    start?: number;
}

declare type LineNumberOptions$2 = {
    countBy: number;
    restart: LineNumberRestart;
    start: number;
};

export declare type LineNumberOptions = {
    countBy?: number;
    distance?: number;
    restart?: 'continuous' | 'newPage' | 'newSection';
    start?: number;
};

export declare type LineNumberRestart = 'continuous' | 'newPage' | 'newSection';

export declare type ListStyle = {
    'list-style-type'?: ListStyleType$1;
};

export declare type ListStyleDefaults = {
    defaultOrderedListStyleType: DocxListStyleType;
};

declare type ListStyleType$1 = 'circle' | 'decimal' | 'decimal-bracket' | 'decimal-bracket-end' | 'disc' | 'lower-alpha' | 'lower-alpha-bracket-end' | 'lower-roman' | 'square' | 'upper-alpha' | 'upper-alpha-bracket-end' | 'upper-roman';

export declare type ListStyleType = 'decimal' | 'disc' | 'lower-alpha' | 'lower-roman' | 'upper-alpha' | 'upper-roman';

/** Margins configuration (optional fields for input) */
declare interface Margins$1 {
    bottom?: number;
    footer?: number;
    gutter?: number;
    header?: number;
    left?: number;
    right?: number;
    top?: number;
}

declare type Margins$2 = {
    bottom: number;
    footer: number;
    gutter: number;
    header: number;
    left: number;
    right: number;
    top: number;
};

export declare type Margins = {
    bottom?: number;
    footer?: number;
    gutter?: number;
    header?: number;
    left?: number;
    right?: number;
    top?: number;
};

/** Media file info */
export declare interface MediaFileInfo {
    fileContent: string;
    fileNameWithExtension: string;
    id: number;
    isSVG?: boolean;
}

export declare const namespaces: {
    readonly a: "http://schemas.openxmlformats.org/drawingml/2006/main";
    readonly b: "http://schemas.openxmlformats.org/officeDocument/2006/bibliography";
    readonly cdr: "http://schemas.openxmlformats.org/drawingml/2006/chartDrawing";
    readonly contentTypes: "http://schemas.openxmlformats.org/package/2006/content-types";
    readonly coreProperties: "http://schemas.openxmlformats.org/package/2006/metadata/core-properties";
    readonly corePropertiesRelation: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties";
    readonly dc: "http://purl.org/dc/elements/1.1/";
    readonly dcmitype: "http://purl.org/dc/dcmitype/";
    readonly dcterms: "http://purl.org/dc/terms/";
    readonly comments: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments";
    readonly fontTable: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable";
    readonly footers: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer";
    readonly headers: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header";
    readonly hyperlinks: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink";
    readonly images: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
    readonly m: "http://schemas.openxmlformats.org/officeDocument/2006/math";
    readonly numbering: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering";
    readonly o: "urn:schemas-microsoft-com:office:office";
    readonly officeDocumentRelation: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
    readonly pic: "http://schemas.openxmlformats.org/drawingml/2006/picture";
    readonly r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    readonly relationship: "http://schemas.openxmlformats.org/package/2006/relationships";
    readonly settingsRelation: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings";
    readonly sl: "http://schemas.openxmlformats.org/schemaLibrary/2006/main";
    readonly styles: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
    readonly themes: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme";
    readonly v: "urn:schemas-microsoft-com:vml";
    readonly ve: "http://schemas.openxmlformats.org/markup-compatibility/2006";
    readonly vt: "http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes";
    readonly w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    readonly w10: "urn:schemas-microsoft-com:office:word";
    readonly w14: "http://schemas.microsoft.com/office/word/2010/wordml";
    readonly w15: "http://schemas.microsoft.com/office/word/2012/wordml";
    readonly w16cid: "http://schemas.microsoft.com/office/word/2016/wordml/cid";
    readonly w16cex: "http://schemas.microsoft.com/office/word/2018/wordml/cex";
    readonly webSettingsRelation: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/webSettings";
    readonly wne: "http://schemas.microsoft.com/office/word/2006/wordml";
    readonly wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
    readonly xsd: "http://www.w3.org/2001/XMLSchema";
    readonly xsi: "http://www.w3.org/2001/XMLSchema-instance";
};

export declare type NodeDocxResult = Buffer | Uint8Array;

/** Numbering object */
export declare interface NumberingObject {
    numberingId: number;
    properties: NumberingProperties;
    type: 'ol' | 'ul';
}

declare type NumberingOptions$1 = {
    defaultOrderedListStyleType: ListStyleType;
};

export declare type NumberingOptions = {
    defaultOrderedListStyleType?: DocxListStyleType;
};

/** Numbering properties */
export declare interface NumberingProperties {
    attributes?: Record<string, string | undefined>;
    start?: number;
    style?: {
        'list-style-type'?: ListStyleType$1;
        [key: string]: string | undefined;
    };
}

/** OOXML namespace URIs used in DOCX documents */
export declare type OoxmlNamespaces = typeof namespaces;

export declare type Orientation = 'landscape' | 'portrait';

/** Page size configuration */
declare interface PageSize$1 {
    height?: number;
    width?: number;
}

declare type PageSize$2 = {
    height: number;
    width: number;
};

export declare type PageSize = {
    height?: number;
    width?: number;
};

export declare type ParagraphBorders = {
    bottom: BorderSide;
    left: BorderSide;
    right: BorderSide;
    top: BorderSide;
};

export declare const paragraphBordersObject: ParagraphBorders;

/** Parsed token from text */
export declare type ParsedToken = {
    type: 'text';
    value: string;
} | {
    type: 'insStart';
    data: SuggestionPayload;
} | {
    type: 'insEnd';
    id: string;
} | {
    type: 'delStart';
    data: SuggestionPayload;
} | {
    type: 'delEnd';
    id: string;
} | {
    type: 'commentStart';
    data: CommentPayload;
} | {
    type: 'commentEnd';
    id: string;
};

export declare const peopleContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.people+xml";

export declare const peopleRelationshipType = "http://schemas.microsoft.com/office/2011/relationships/people";

export declare const peopleType = "people";

export declare const portraitMargins: Margins$2;

/** Relationship object */
export declare interface RelationshipObject {
    relationshipId: number;
    target: string;
    targetMode: string;
    type: string;
}

/** Relationship XML output */
export declare interface RelationshipXMLOutput {
    fileName: string;
    xmlString: string;
}

export declare const relsFolderName = "_rels";

/** Reset allocated IDs between documents. */
export declare function resetAllocatedIds(): void;

export declare type Row = {
    cantSplit?: boolean;
};

/**
 * Split text into an array of text segments and parsed tokens.
 */
export declare function splitDocxTrackingTokens(text: string): ParsedToken[];

/** Comment stored in the document */
export declare interface StoredComment {
    id: number;
    authorName: string;
    authorInitials: string;
    date?: string;
    text: string;
    /** 8-char uppercase hex ID < 0x7FFFFFFF, links comments.xml <-> commentsExtended.xml <-> commentsIds.xml */
    paraId: string;
    /** 8-char uppercase hex ID < 0x7FFFFFFF, links commentsIds.xml <-> commentsExtensible.xml */
    durableId: string;
    /** paraId of parent comment; present only on replies */
    parentParaId?: string;
}

/** Style object */
export declare interface StyleObject {
    [key: string]: string | number | boolean | null | undefined | Record<string, string>;
}

/** Payload for insertion/deletion tokens */
export declare interface SuggestionPayload {
    id: string;
    author?: string;
    date?: string;
}

export declare const SVG_UNIT_TO_PIXEL_CONVERSIONS: Readonly<Record<SvgUnit, number>>;

export declare type SvgUnit = '%' | 'cm' | 'em' | 'in' | 'mm' | 'pc' | 'pt' | 'px' | 'rem';

export declare type TableBorderAttributeOptions = {
    size: number;
    stroke: string;
};

declare type TableBorderOptions$1 = {
    color: string;
    size: number;
    stroke: string;
};

export declare type TableBorderOptions = BorderOptions;

/** Table options */
declare interface TableOptions$1 {
    row?: {
        cantSplit?: boolean;
    };
}

declare type TableOptions$2 = {
    addSpacingAfter: boolean;
    borderOptions: TableBorderOptions$1;
    row: TableRowOptions;
};

export declare type TableOptions = {
    borderOptions?: BorderOptions;
    row?: Row;
};

export declare type TableRowOptions = {
    cantSplit: boolean;
};

export declare const themeFileName = "theme1";

export declare const themeFolder = "theme";

export declare const themeType = "theme";

/** Interface for document instance with tracking support */
export declare interface TrackingDocumentInstance {
    _trackingState?: TrackingState;
    comments: StoredComment[];
    commentIdMap: Map<string, number>;
    lastCommentId: number;
    revisionIdMap: Map<string, number>;
    lastRevisionId: number;
    ensureComment: (data: Partial<CommentPayload>, parentParaId?: string) => number;
    getCommentId: (id: string) => number;
    getRevisionId: (id?: string) => number;
}

/** Tracking state maintained during document generation */
export declare interface TrackingState {
    suggestionStack: ActiveSuggestion[];
    replyIdsByParent: Map<string, string[]>;
}

export declare type VerticalAlign = 'bottom' | 'middle' | 'top';

export declare const verticalAlignValues: ReadonlyArray<VerticalAlign>;

export declare type VNode = {
    children?: VNode[];
    [key: string]: VNode[] | string | number | boolean | null | undefined;
};

export declare interface VTree {
    children?: VTree[];
    properties?: Record<string, VTreePropertyValue>;
    tagName?: string;
    text?: string;
}

/** Virtual DOM tree node */
declare type VTreePropertyValue = string | number | boolean | null | undefined | Record<string, string>;

export declare const wordFolder = "word";

/**
 * Wrap a run fragment with a suggestion (w:ins or w:del).
 */
export declare function wrapRunWithSuggestion(runFragment: XMLBuilder, suggestion: ActiveSuggestion): XMLBuilder;

export { }
