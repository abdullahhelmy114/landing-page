/**
 * Requests from automated scanners looking for secrets, backups and admin tools that this site does
 * not have (/.env, /.git/HEAD, /.ssh/id_rsa, /backup.sql, /wp-login.php …). They get a plain 404 at
 * once, before any page, metadata or database work: from worker.ts on Cloudflare, from the proxy on
 * Docker. Cloudflare's WAF can drop them even earlier (README).
 */
const DOT_SEGMENT = /(^|\/)\.(?!well-known(\/|$))[^/]*/;
const RISKY_EXT = /\.(env|git|svn|hg|sql|sqlite3?|db|dump|bak|backup|old|orig|save|swp|tmp|zip|tar|tgz|gz|bz2|xz|rar|7z|php\d?|phtml|asp|aspx|jsp|cgi|pl|py|sh|ini|log|conf|cfg|config|pem|key|crt|p12|pfx|yml|yaml|toml)(\/|$)/i;
const RISKY_PREFIX = /^\/(wp-|wordpress|phpmyadmin|pma\b|xmlrpc|cgi-bin|vendor\/|node_modules\/|server-status|actuator|debug\/|console\b|aws\b|config\.json)/i;

export function isProbe(pathname: string): boolean {
  let p = pathname;
  try {
    p = decodeURIComponent(pathname);
  } catch {
    return true; // a malformed escape is never a real page
  }
  return DOT_SEGMENT.test(p) || RISKY_EXT.test(p) || RISKY_PREFIX.test(p);
}

export const PROBE_RESPONSE_INIT: ResponseInit = {
  status: 404,
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "public, max-age=86400",
    "X-Robots-Tag": "noindex, nofollow",
  },
};
