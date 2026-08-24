const ABSOLUTE_OR_SPECIAL_URL = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;

export function resolveResourceUri(value: string, baseUri?: string): string {
  const resource = value.trim();
  if (!baseUri || !resource || ABSOLUTE_OR_SPECIAL_URL.test(resource)) {
    return value;
  }

  try {
    return new URL(resource, baseUri).toString();
  } catch {
    return value;
  }
}

export function rewriteCssUrls(css: string, baseUri?: string): string {
  if (!baseUri) {
    return css;
  }

  return css.replace(
    /url\(\s*(?:(['"])(.*?)\1|([^'"\)]*?))\s*\)/gi,
    (match, _quote: string | undefined, quoted: string | undefined, unquoted: string | undefined) => {
      const resource = (quoted ?? unquoted ?? '').trim();
      const resolved = resolveResourceUri(resource, baseUri);
      if (resolved === resource) {
        return match;
      }
      return `url("${resolved.replace(/"/g, '%22')}")`;
    }
  );
}
