<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [SendableEthersRmm](./rmm-ethers.sendableethersrmm.md)

## SendableEthersRmm class

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Ethers implementation of [SendableRmm](./rmm-ethers.sendablermm.md)

<b>Signature:</b>

```typescript
export declare class SendableEthersRmm implements SendableRmm<EthersTransactionReceipt, EthersTransactionResponse> 
```
<b>Implements:</b> [SendableRmm](./rmm-ethers.sendablermm.md)<!-- -->&lt;[EthersTransactionReceipt](./rmm-ethers.etherstransactionreceipt.md)<!-- -->, [EthersTransactionResponse](./rmm-ethers.etherstransactionresponse.md)<!-- -->&gt;

## Constructors

|  Constructor | Modifiers | Description |
|  --- | --- | --- |
|  [(constructor)(populate)](./rmm-ethers.sendableethersrmm._constructor_.md) |  | <b><i>(BETA)</i></b> Constructs a new instance of the <code>SendableEthersRmm</code> class |

## Methods

|  Method | Modifiers | Description |
|  --- | --- | --- |
|  [allocate(params, overrides)](./rmm-ethers.sendableethersrmm.allocate.md) |  | <b><i>(BETA)</i></b> Executes an allocate liquidity transaction from a signer. |
|  [createEngine(params, overrides)](./rmm-ethers.sendableethersrmm.createengine.md) |  | <b><i>(BETA)</i></b> Executes a deploy engine transaction from the primitive factory using the signer. |
|  [remove(params, overrides)](./rmm-ethers.sendableethersrmm.remove.md) |  | <b><i>(BETA)</i></b> Executes a remove liquidity transaction. |
|  [safeBatchTransfer(params, overrides)](./rmm-ethers.sendableethersrmm.safebatchtransfer.md) |  | <b><i>(BETA)</i></b> Executes a remove liquidity transaction. |
|  [safeTransfer(params, overrides)](./rmm-ethers.sendableethersrmm.safetransfer.md) |  | <b><i>(BETA)</i></b> Executes a remove liquidity transaction. |
