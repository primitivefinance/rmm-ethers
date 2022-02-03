<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [SendableEthersRmm](./rmm-ethers.sendableethersrmm.md) &gt; [safeBatchTransfer](./rmm-ethers.sendableethersrmm.safebatchtransfer.md)

## SendableEthersRmm.safeBatchTransfer() method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Executes a remove liquidity transaction.

<b>Signature:</b>

```typescript
safeBatchTransfer(params: PositionBatchTransferParams, overrides?: EthersTransactionOverrides): Promise<SentEthersRmmTransaction<void>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  params | [PositionBatchTransferParams](./rmm-ethers.positionbatchtransferparams.md) |  |
|  overrides | [EthersTransactionOverrides](./rmm-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[SentEthersRmmTransaction](./rmm-ethers.sentethersrmmtransaction.md)<!-- -->&lt;void&gt;&gt;
