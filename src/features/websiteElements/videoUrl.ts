const unsupportedVideoHosts = ["youtube.com", "youtu.be", "vimeo.com"] as const;

export function isUnsupportedVideoProviderUrl(value: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(value).hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    return false;
  }
  return unsupportedVideoHosts.some((host) => hostname === host || hostname.endsWith(`.${host}`));
}
