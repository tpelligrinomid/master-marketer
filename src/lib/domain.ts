/**
 * Domain normalization.
 *
 * Client and competitor domains arrive from the app however the user typed
 * them — "ktcsearch.com", "https://ktcsearch.com/", "https://www.foo.com/about".
 * Most API wrappers strip the scheme themselves, but anything that builds a URL
 * by interpolation (`https://${domain}`) produces "https://https://ktcsearch.com/"
 * and fails silently, and Keywords Everywhere rejects a scheme outright with a 400.
 *
 * Normalize once at the entry point so every downstream consumer gets a bare host.
 */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "") // scheme
    .replace(/^([^/?#]*).*$/, "$1")          // drop path, query, fragment
    .replace(/:\d+$/, "")                    // port
    .replace(/\.$/, "")                      // trailing dot on FQDN
    .toLowerCase();
}
