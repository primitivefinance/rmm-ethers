<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [PopulatedEthersSignerTransaction](./rmm-ethers.populatedetherssignertransaction.md)

## PopulatedEthersSignerTransaction class

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Implements [PopulatedRmmTransaction](./rmm-ethers.populatedrmmtransaction.md)

<b>Signature:</b>

```typescript
export declare class PopulatedEthersSignerTransaction<T = unknown> implements PopulatedRmmTransaction<EthersTransactionRequest, SentEthersRmmTransaction<T>> 
```
<b>Implements:</b> [PopulatedRmmTransaction](./rmm-ethers.populatedrmmtransaction.md)<!-- -->&lt;[EthersTransactionRequest](./rmm-ethers.etherstransactionrequest.md)<!-- -->, [SentEthersRmmTransaction](./rmm-ethers.sentethersrmmtransaction.md)<!-- -->&lt;T&gt;&gt;

## Remarks

Instantiates a populated transaction from a signer. Important! This is by sending a raw tx directly from a signer, rather than a tx from a contract. For example, managerContract.populate.allocate() would return an EthersPopulatedTransaction, not an EthersTransactionRequest. Instead, this is doing signer.populate(rawAllocateTx), which returns an EthersTransactionRequest.

The constructor for this class is marked as internal. Third-party code should not call the constructor directly or create subclasses that extend the `PopulatedEthersSignerTransaction` class.

## Properties

|  Property | Modifiers | Type | Description |
|  --- | --- | --- | --- |
|  [rawPopulatedTransaction](./rmm-ethers.populatedetherssignertransaction.rawpopulatedtransaction.md) |  | [EthersTransactionRequest](./rmm-ethers.etherstransactionrequest.md) | <b><i>(BETA)</i></b> |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [send()](./rmm-ethers.populatedetherssignertransaction.send.md) |  | <b><i>(BETA)</i></b> |
