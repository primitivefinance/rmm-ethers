import { Pool } from '@primitivefi/rmm-sdk'
import { parseBase64TokenURI } from './parseBase64TokenURI'

/**
 * Parses a raw RMM-LP uri string into a Pool entity.
 *
 * @param raw - URI string returned by PrimitiveManager `uri` function.
 * @returns Pool entity.
 *
 * @beta
 */
export function poolify(raw: string): Pool {
  const data = parseBase64TokenURI(raw)
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
