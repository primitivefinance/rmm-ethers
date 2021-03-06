<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [ReadableRmm](./rmm-ethers.readablermm.md) &gt; [getLiquidityBalance](./rmm-ethers.readablermm.getliquiditybalance.md)

## ReadableRmm.getLiquidityBalance() method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Fetches `account`<!-- -->'s balance of liquidity for `poolId`<!-- -->.

<b>Signature:</b>

```typescript
getLiquidityBalance(poolId: string, address: string, overrides?: EthersCallOverrides): Promise<Wei>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  poolId | string |  |
|  address | string |  |
|  overrides | [EthersCallOverrides](./rmm-ethers.etherscalloverrides.md) |  |

<b>Returns:</b>

Promise&lt;Wei&gt;

