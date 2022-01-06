<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [FailedReceipt](./rmm-ethers.failedreceipt.md)

## FailedReceipt type

Indicates that the transaction has been mined, but it failed.

<b>Signature:</b>

```typescript
export declare type FailedReceipt<R = unknown> = {
    status: 'failed';
    rawReceipt: R;
};
```

## Remarks

The `rawReceipt` property is an implementation-specific transaction receipt object.

Returned by [SentRmmTransaction.getReceipt()](./rmm-ethers.sentrmmtransaction.getreceipt.md) and [SentRmmTransaction.waitForReceipt()](./rmm-ethers.sentrmmtransaction.waitforreceipt.md)<!-- -->.
