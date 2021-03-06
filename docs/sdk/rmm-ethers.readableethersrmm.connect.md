<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [@primitivefi/rmm-ethers](./rmm-ethers.md) &gt; [ReadableEthersRmm](./rmm-ethers.readableethersrmm.md) &gt; [connect](./rmm-ethers.readableethersrmm.connect.md)

## ReadableEthersRmm.connect() method

> This API is provided as a preview for developers and may change based on feedback that we receive. Do not use this API in a production environment.
> 

Connect to Rmm protocol and instantiate `ReadableEthersRmm` object.

<b>Signature:</b>

```typescript
static connect(signerOrProvider: EthersSigner | EthersProvider): Promise<ReadableEthersRmm>;
```

## Parameters

|  Parameter | Type | Description |
|  --- | --- | --- |
|  signerOrProvider | [EthersSigner](./rmm-ethers.etherssigner.md) \| [EthersProvider](./rmm-ethers.ethersprovider.md) | Ethers <code>signer</code> or <code>provider</code>. |

<b>Returns:</b>

Promise&lt;[ReadableEthersRmm](./rmm-ethers.readableethersrmm.md)<!-- -->&gt;

