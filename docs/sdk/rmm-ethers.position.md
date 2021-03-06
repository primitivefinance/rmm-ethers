<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [Position](./rmm-ethers.position.md)

## Position class

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Rmm liquidity position with a balance and poolId

<b>Signature:</b>

```typescript
export declare class Position 
```

## Remarks

The constructor for this class is marked as internal. Third-party code should not call the constructor directly or create subclasses that extend the `Position` class.

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [balance0](./rmm-ethers.position.balance0.md) |  | Wei | <b><i>(BETA)</i></b> Amount of risky tokens redeemable from liquidity. |
|  [balance1](./rmm-ethers.position.balance1.md) |  | Wei | <b><i>(BETA)</i></b> Amount of stable tokens redeemable from liquidity. |
|  [isEmpty](./rmm-ethers.position.isempty.md) |  | boolean | <b><i>(BETA)</i></b> If there is no balance in the position. |
|  [liquidity](./rmm-ethers.position.liquidity.md) |  | Wei | <b><i>(BETA)</i></b> Amount of liquidity owned by position. |
|  [pool](./rmm-ethers.position.pool.md) |  | Pool | <b><i>(BETA)</i></b> Pool of position. |
|  [totalValue](./rmm-ethers.position.totalvalue.md) |  | Wei | <b><i>(BETA)</i></b> Total value of liquidity position, denominated in the stable token. |
|  [value](./rmm-ethers.position.value.md) |  | { valuePerLiquidity: Wei; values: Wei\[\]; } | <b><i>(BETA)</i></b> Value of liquidity and sides of pool, denominated in the stable token. |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [add(that)](./rmm-ethers.position.add.md) |  | <b><i>(BETA)</i></b> Sums liquidity of <code>this</code> and <code>that</code> position. |
|  [equals(that)](./rmm-ethers.position.equals.md) |  | <b><i>(BETA)</i></b> True of <code>this</code> position liquidity matches <code>that</code> liquidity. |
|  [sub(that)](./rmm-ethers.position.sub.md) |  | <b><i>(BETA)</i></b> Subtracts <code>this</code> liquidity from <code>that</code> liquidity. |
|  [valueOf(side)](./rmm-ethers.position.valueof.md) |  | <b><i>(BETA)</i></b> Value of liquidity for <code>side</code> of pool, denominated in the stable token. |

