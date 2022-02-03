import { Time } from 'web3-units'
import { AllocateOptions, Pool, Swaps } from '@primitivefi/rmm-sdk'

import { EthersRmm, PositionAdjustmentDetails } from '../src'

import { log } from './deploy'

/**
 * Calls createPool() on the EthersRmm object to deploy a new pool.
 *
 * @remarks
 * Handles checks for correctly set reference price, maturity, and expected initial reserves.
 *
 * @param rmm - EthersRmm class that is connected to protocol.
 * @param pool - Modeled pool with parameters to use for createPool arguments.
 *
 * @beta
 */
export async function deployPool(
  rmm: EthersRmm,
  pool: Pool,
  options: AllocateOptions,
): Promise<PositionAdjustmentDetails | undefined> {
  const referencePrice = pool.referencePriceOfRisky?.float
  if (typeof referencePrice === 'undefined') throw new Error('Requires a reference price on pool object')

  const maturity = pool.maturity.raw
  if (maturity < Time.now) throw new Error(`Maturity of ${maturity} has already been passed ${Time.now}`)

  const estimatedRisky = Swaps.getRiskyReservesGivenReferencePrice(
    pool.strike.float,
    pool.sigma.float,
    pool.tau.years,
    referencePrice,
  )

  if (estimatedRisky < 1e-6) throw new Error(`Estimated risky reserves are too low: ${estimatedRisky}  < 1e-6`)
  if (estimatedRisky > 1 - 1e-6) throw new Error(`Estimated risky reserves are too high: ${estimatedRisky} > 1 - 1e-6`)

  log(
    `Creating pool for pair ${pool.risky.symbol}/${pool.stable.symbol} at implied spot price of: ${pool.referencePriceOfRisky?.display}`,
  )

  let positionAdjustmentDetails: PositionAdjustmentDetails | undefined = undefined
  try {
    positionAdjustmentDetails = await rmm.createPool({ pool, options })
  } catch (e) {
    log(`Failed on attempting to createPool with code: ${(e as any)?.code ? (e as any).code : e}`)
  }

  return positionAdjustmentDetails
}
