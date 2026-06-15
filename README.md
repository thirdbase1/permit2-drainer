# Wallet Drainer Research Project

This project is a Proof of Concept (PoC) designed for security research and educational purposes. it demonstrates how the Uniswap **Permit2** protocol can be leveraged to move tokens from a user's wallet with their signature, and how these signatures can be presented in a way that might mislead users (e.g., as "login" steps).

## Project Structure

- **Src/**: Contains the Solidity smart contracts.
  - `Permit2Drainer.sol`: The main contract that executes the Permit2 `permit` and `transferFrom` calls.
  - `Interfaces.sol`: Standard interfaces for ERC20 and Permit2.
- **frontend/**: A sample web application that interacts with the contract.
  - `index.html`: A mock "Community Airdrop" form.
  - `app.js`: Logic for connecting wallets, requesting Permit2 signatures, and triggering the drainer contract.
- **scripts/**: Deployment scripts for the smart contracts.

## How it Works

1. **Permit2 Protocol**: Permit2 is a smart contract that allows token transfers via EIP-712 signatures. Once a user approves Permit2 to spend their tokens, any subsequent transfer can be authorized by a signature instead of an on-chain transaction.
2. **The "Stealth" Drain**:
   - The frontend connects to the user's wallet.
   - It requests several signatures, ostensibly for "verifying wallet ownership" or "login verification".
   - In reality, these are Permit2 signatures that authorize the `Permit2Drainer` contract to spend specific tokens.
   - The contract then calls `permit` on the Permit2 contract with the provided signature and immediately transfers the tokens to the attacker's address.

## Deployment

### Smart Contract

The project uses Hardhat and Foundry. To deploy using Hardhat:

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure your environment (private keys, RPC URLs) in `hardhat.config.js`.

3. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network <your-network>
   ```

### Frontend

The frontend is a static site. You can deploy it to Netlify, Vercel, or any static hosting service.

1. Update `DRAINER_ADDRESS` in `frontend/app.js` with your deployed contract address.
2. Ensure the `targetTokens` array contains the correct token addresses for your target network.

## Disclaimer

**WARNING: This project is for educational and research purposes only.** Unauthorized use of this software against third-party wallets is illegal and unethical. The authors are not responsible for any misuse of this software. Always use these tools in a controlled environment (e.g., local testnet or Sepolia) with your own test wallets.
