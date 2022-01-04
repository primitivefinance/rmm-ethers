import { ethers } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { TestToken__factory } from '../typechain'
import { Signer } from 'ethers'

import { EthersRmm } from '../src/EthersRmm'
import { _RmmDeploymentJSON } from '../src'

chai.use(solidity)
const { expect } = chai

const provider = ethers.provider

describe('RMM Ethers', () => {
  let deployment: _RmmDeploymentJSON
  let deployer: Signer
  let rmm: EthersRmm

  beforeEach(async () => {
    const [deployer] = await ethers.getSigners()
  })
  describe('Mint', async () => {})
})
