/** API sessions return root-relative TUS URLs; CDN sessions can return independent URLs. */
export function resolveTusEndpoint(
  endpoint: string,
  apiBaseUrl: string | undefined,
  pageOrigin: string,
) {
  const apiUrl = new URL(apiBaseUrl || pageOrigin, pageOrigin);
  const target = new URL(endpoint, apiUrl);
  if (!/^https?:$/.test(target.protocol)) throw new Error("Unsupported TUS endpoint protocol");
  return { endpoint: target.href, withCredentials: target.origin === apiUrl.origin };
}
