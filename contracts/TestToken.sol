// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

/**
 * @notice A mintable ERC20
 */
contract TestToken is ERC20, AccessControl {
    constructor() public ERC20('Test Token', 'TST') {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
