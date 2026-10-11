export function extractDomain(url: string): string {
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }
    const parsed = new URL(cleanUrl);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function formatUrl(url: string): string {
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }
  return cleanUrl;
}

export function extractApexDomain(url: string): string {
  try {
    const domain = extractDomain(url).toLowerCase();
    // Special handling for IP addresses or empty/short domains
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain) || !domain.includes('.')) {
      return domain;
    }
    const parts = domain.split('.');
    if (parts.length <= 2) {
      return domain;
    }
    // Handle multi-part ccTLDs like .co.uk, .com.au, .org.uk, .co.in, .gov.uk, etc.
    const secondToLast = parts[parts.length - 2];
    const twoPartTLDs = new Set([
      'co', 'com', 'org', 'net', 'edu', 'gov', 'mil', 'ac', 'nom', 'gen'
    ]);
    if (parts.length > 2 && twoPartTLDs.has(secondToLast) && parts[parts.length - 1].length === 2) {
      return parts.slice(-3).join('.');
    }
    return parts.slice(-2).join('.');
  } catch {
    return url;
  }
}

export function getApexFaviconUrl(url: string, size = 64): string {
  const apex = extractApexDomain(url);
  if (!apex || apex.length < 3) return '';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(apex)}&sz=${size}`;
}

export function getFaviconUrl(url: string, size = 64): string {
  const domain = extractDomain(url);
  if (!domain || domain.length < 3) return '';
  return `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(formatUrl(url))}&size=${size}`;
}

export { FaviconImage } from '../components/Common/FaviconImage';
