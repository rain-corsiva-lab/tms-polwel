declare module 'sanitize-html' {
  interface IOptions {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemes?: string[];
    allowedSchemesByTag?: Record<string, string[]>;
    allowProtocolRelative?: boolean;
  }
  function sanitizeHtml(dirty: string, options?: IOptions): string;
  namespace sanitizeHtml {}
  export = sanitizeHtml;
}
