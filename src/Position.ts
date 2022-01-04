import { parseWei, Wei } from 'web3-units'
import { AllocateOptions, Pool, PoolSides } from '@primitivefi/rmm-sdk'

/** Parameters of an allocate transaction. */
export type PositionCreationParams<T = unknown> = { pool: Pool; options: AllocateOptions }

/**
 * Rmm liquidity position with a balance and poolId
 *
 * @beta
 */
export class Position {
  /** Amount of liquidity owned by position. */
  readonly liquidity: Wei
  /** Pool of position. */
  readonly pool: Pool

  /** @internal */
  constructor(pool: Pool, liquidity = parseWei(0)) {
    this.pool = pool
    this.liquidity = liquidity
  }

  /** If there is no balance in the position. */
  get isEmpty(): boolean {
    return this.liquidity.raw.isZero()
  }

  /** Amount of risky tokens redeemable from liquidity. */
  get balance0(): Wei {
    return this.pool.liquidityQuote(this.liquidity, PoolSides.RMM_LP).delRisky
  }

  /** Amount of stable tokens redeemable from liquidity. */
  get balance1(): Wei {
    return this.pool.liquidityQuote(this.liquidity, PoolSides.RMM_LP).delStable
  }

  /** Value of liquidity and sides of pool, denominated in the stable token. */
  get value(): { valuePerLiquidity: Wei; values: Wei[] } {
    return this.pool.getCurrentLiquidityValue(
      this.pool.referencePriceOfRisky?.float ?? this.pool.reportedPriceOfRisky?.float ?? 0,
    )
  }

  /** Total value of liquidity position, denominated in the stable token. */
  get totalValue(): Wei {
    return this.value.valuePerLiquidity.mul(this.liquidity).div(parseWei(1))
  }

  /** Value of liquidity for `side` of pool, denominated in the stable token. */
  valueOf(side: PoolSides): Wei {
    switch (side) {
      case PoolSides.RISKY:
        return this.value.values[0]
      case PoolSides.STABLE:
        return this.value.values[1]
      case PoolSides.RMM_LP:
        return this.totalValue
    }
  }

  /** True of `this` position liquidity matches `that` liquidity. */
  equals(that: Position): boolean {
    return this.liquidity.eq(that.liquidity)
  }

  /** Sums liquidity of `this` and `that` position. */
  add(that: Position): Position {
    return new Position(this.pool, this.liquidity.add(that.liquidity))
  }

  /** Subtracts `this` liquidity from `that` liquidity. */
  sub(that: Position): Position {
    const { liquidity } = that
    return new Position(this.pool, this.liquidity.gt(liquidity) ? this.liquidity.sub(liquidity) : parseWei(0))
  }
}
