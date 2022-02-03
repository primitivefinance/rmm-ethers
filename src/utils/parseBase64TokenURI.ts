/**
 * Parses raw string URI encoded in Base64.
 *
 * @param uri - JSON string with a `base64` encoding
 *
 * @returns Parsed JSON of `uri`.
 *
 * @beta
 */
export function parseBase64TokenURI(uri: string) {
  const json = Buffer.from(uri.substring(29), 'base64').toString()
  const result = JSON.parse(json)
  return result
}
