import { Pool } from '@primitivefi/rmm-sdk'

/**
 * Parses raw string URI encoded in Base64.
 *
 * @param uri - JSON string with a `base64` encoding
 *
 * @returns Parsed JSON of `uri`.
 *
 * @beta
 */
export function parseTokenURI(uri: string) {
  const json = Buffer.from(uri.substring(29), 'base64').toString()
  const result = JSON.parse(json)
  return result
}

/**
 * Parses a raw RMM-LP uri string into a Pool entity.
 *
 * @param raw - URI string returned by PrimitiveManager `uri` function.
 * @returns Pool entity.
 *
 * @beta
 */
export function poolify(raw: string): Pool {
  const data = parseTokenURI(raw)
  const {
    factory,
    riskyName,
    riskySymbol,
    riskyDecimals,
    riskyAddress,
    stableName,
    stableSymbol,
    stableDecimals,
    stableAddress,
    strike,
    sigma,
    gamma,
    maturity,
    lastTimestamp,
    reserveRisky,
    reserveStable,
    liquidity,
    invariant,
    chainId,
  } = data.properties

  const risky = { address: riskyAddress, name: riskyName, symbol: riskySymbol, decimals: riskyDecimals }
  const stable = { address: stableAddress, name: stableName, symbol: stableSymbol, decimals: stableDecimals }
  const calibration = { strike, sigma, maturity, lastTimestamp, gamma }
  const reserve = { reserveRisky, reserveStable, liquidity }
  return new Pool(
    chainId,
    factory,
    { ...risky },
    { ...stable },
    { ...calibration },
    { ...reserve },
    invariant,
    undefined,
  )
}
