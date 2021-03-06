<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [PopulatableRmm](./rmm-ethers.populatablermm.md) &gt; [remove](./rmm-ethers.populatablermm.remove.md)

## PopulatableRmm.remove() method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

<b>Signature:</b>

```typescript
remove(params: PositionRemoveParams): Promise<PopulatedRmmTransaction<P, SentRmmTransaction<S, RmmReceipt<R, PositionAdjustmentDetails>>>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  params | [PositionRemoveParams](./rmm-ethers.positionremoveparams.md) | Remove liquidity from pool and withdraws token |

<b>Returns:</b>

Promise&lt;[PopulatedRmmTransaction](./rmm-ethers.populatedrmmtransaction.md)<!-- -->&lt;P, [SentRmmTransaction](./rmm-ethers.sentrmmtransaction.md)<!-- -->&lt;S, [RmmReceipt](./rmm-ethers.rmmreceipt.md)<!-- -->&lt;R, [PositionAdjustmentDetails](./rmm-ethers.positionadjustmentdetails.md)<!-- -->&gt;&gt;&gt;&gt;

