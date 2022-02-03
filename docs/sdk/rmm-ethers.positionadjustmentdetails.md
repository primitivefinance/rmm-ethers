<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [PositionAdjustmentDetails](./rmm-ethers.positionadjustmentdetails.md)

## PositionAdjustmentDetails interface

Receipt details returned from a transaction adjusting a Position.

<b>Signature:</b>

```typescript
export interface PositionAdjustmentDetails 
```

## Properties

|  Property | Type | Description |
|  --- | --- | --- |
|  [createdPool?](./rmm-ethers.positionadjustmentdetails.createdpool.md) | boolean | <i>(Optional)</i> Flag to signal a pool was created. |
|  [newPosition](./rmm-ethers.positionadjustmentdetails.newposition.md) | [Position](./rmm-ethers.position.md) | Updated state of the adjusted Position directly after the transaction. |
|  [params](./rmm-ethers.positionadjustmentdetails.params.md) | [PositionAllocateParams](./rmm-ethers.positionallocateparams.md) \| [PositionRemoveParams](./rmm-ethers.positionremoveparams.md) | Parameters of allocate tx. |
