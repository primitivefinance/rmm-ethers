<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [PopulatableEthersRmm](./rmm-ethers.populatableethersrmm.md) &gt; [allocate](./rmm-ethers.populatableethersrmm.allocate.md)

## PopulatableEthersRmm.allocate() method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Gets a ready-to-send from a signer populated ethers transaction for allocating liquidity.

<b>Signature:</b>

```typescript
allocate(params: PositionAllocateParams, overrides?: EthersTransactionOverrides): Promise<PopulatedEthersSignerTransaction<PositionAdjustmentDetails>>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  params | [PositionAllocateParams](./rmm-ethers.positionallocateparams.md) |  |
|  overrides | [EthersTransactionOverrides](./rmm-ethers.etherstransactionoverrides.md) |  |

<b>Returns:</b>

Promise&lt;[PopulatedEthersSignerTransaction](./rmm-ethers.populatedetherssignertransaction.md)<!-- -->&lt;[PositionAdjustmentDetails](./rmm-ethers.positionadjustmentdetails.md)<!-- -->&gt;&gt;

