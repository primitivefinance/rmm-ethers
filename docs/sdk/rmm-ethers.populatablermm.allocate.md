<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [PopulatableRmm](./rmm-ethers.populatablermm.md) &gt; [allocate](./rmm-ethers.populatablermm.allocate.md)

## PopulatableRmm.allocate() method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Allocates liquidity by depositing both pool tokens.

<b>Signature:</b>

```typescript
allocate(params: PositionAllocateParams): Promise<PopulatedRmmTransaction<P, SentRmmTransaction<S, RmmReceipt<R, PositionAdjustmentDetails>>>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  params | [PositionAllocateParams](./rmm-ethers.positionallocateparams.md) |  |

<b>Returns:</b>

Promise&lt;[PopulatedRmmTransaction](./rmm-ethers.populatedrmmtransaction.md)<!-- -->&lt;P, [SentRmmTransaction](./rmm-ethers.sentrmmtransaction.md)<!-- -->&lt;S, [RmmReceipt](./rmm-ethers.rmmreceipt.md)<!-- -->&lt;R, [PositionAdjustmentDetails](./rmm-ethers.positionadjustmentdetails.md)<!-- -->&gt;&gt;&gt;&gt;
