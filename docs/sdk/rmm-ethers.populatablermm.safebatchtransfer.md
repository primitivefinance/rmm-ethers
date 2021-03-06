<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [PopulatableRmm](./rmm-ethers.populatablermm.md) &gt; [safeBatchTransfer](./rmm-ethers.populatablermm.safebatchtransfer.md)

## PopulatableRmm.safeBatchTransfer() method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Transfers a batch of liquidity tokens to a `recipient` account.

<b>Signature:</b>

```typescript
safeBatchTransfer(params: PositionBatchTransferParams): Promise<PopulatedRmmTransaction<P, SentRmmTransaction<S, RmmReceipt<R, void>>>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  params | [PositionBatchTransferParams](./rmm-ethers.positionbatchtransferparams.md) |  |

<b>Returns:</b>

Promise&lt;[PopulatedRmmTransaction](./rmm-ethers.populatedrmmtransaction.md)<!-- -->&lt;P, [SentRmmTransaction](./rmm-ethers.sentrmmtransaction.md)<!-- -->&lt;S, [RmmReceipt](./rmm-ethers.rmmreceipt.md)<!-- -->&lt;R, void&gt;&gt;&gt;&gt;

