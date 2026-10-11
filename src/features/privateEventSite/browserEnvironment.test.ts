import { describe, expect, it } from 'vitest'
import { isEmbeddedSocialWebView } from './browserEnvironment'

describe('embedded social WebView detection', () => {
  it.each([
    'Mozilla/5.0 [FBAN/EMA;FBAV/500.0.0.0.0;]',
    'Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 [FB_IAB/FB4A;]',
    'Mozilla/5.0 (Linux; Android 14) Instagram 350.0.0.0.0',
  ])('detects supported embedded agents', (userAgent) => {
    expect(isEmbeddedSocialWebView(userAgent)).toBe(true)
  })

  it.each([
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) Gecko/20100101 Firefox/130.0',
  ])('does not classify ordinary browsers as embedded', (userAgent) => {
    expect(isEmbeddedSocialWebView(userAgent)).toBe(false)
  })
})
