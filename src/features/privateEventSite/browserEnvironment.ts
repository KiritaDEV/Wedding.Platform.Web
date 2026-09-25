export function isEmbeddedSocialWebView(userAgent: string): boolean {
  return /(?:FBAN|FBAV|FB_IAB|FB4A|FBIOS|Messenger|Instagram)/i.test(userAgent)
}
