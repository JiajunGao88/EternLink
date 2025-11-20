# EternLink - Blockchain Proof of Existence MVP

A blockchain-based file proof of existence system with local encryption and on-chain hash storage.

## Features

- ✅ Local file encryption (AES-256-GCM + PBKDF2)
- ✅ File hash stored on blockchain (Base Sepolia Testnet)
- ✅ On-chain file existence verification
- ✅ Support for .txt file format
- ✅ Complete client-side encryption for privacy protection

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Blockchain**: Base Sepolia (EVM Compatible)
- **Smart Contract**: Solidity 0.8.20
- **Encryption**: Web Crypto API (AES-GCM, PBKDF2, SHA-256)
- **Wallet**: MetaMask

## Project Structure

```
EternLink/
├── contracts/           # Smart contracts
│   └── ProofOfExistence.sol
├── src/
│   ├── App.tsx         # Main application component
│   ├── main.tsx        # Application entry point
│   ├── index.css       # Styles
│   └── utils/
│       ├── crypto.ts   # Encryption utilities
│       └── contract.ts # Contract interaction utilities
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Deploy Smart Contract

#### Using Remix IDE

1. Visit [Remix IDE](https://remix.ethereum.org)
2. Create new file `ProofOfExistence.sol`
3. Copy content from `contracts/ProofOfExistence.sol`
4. Select compiler version 0.8.20
5. Compile the contract
6. In "Deploy & Run", select "Injected Provider - MetaMask"
7. Ensure MetaMask network is Base Sepolia (Chain ID: 84532)
8. Click "Deploy" to deploy contract
9. Copy the deployed contract address

#### Configure MetaMask Network

If Base Sepolia network is not available in MetaMask, add it manually:

- **Network Name**: Base Sepolia
- **RPC URL**: https://sepolia.base.org
- **Chain ID**: 84532
- **Currency Symbol**: ETH
- **Block Explorer**: https://sepolia.basescan.org

#### Get Test Tokens

Visit Base Sepolia Faucet to get test ETH:
- https://docs.base.org/docs/tools/network-faucets

### 3. Configure Frontend

1. Open `src/App.tsx`
2. Find `DEFAULTS.CONTRACT_ADDRESS`
3. Replace with your deployed contract address from Remix

Or enter the contract address directly in the application interface.

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:5173

### 5. Using the Application

1. **Connect Wallet**: Click "Connect MetaMask" button
2. **Select File**: Choose a .txt file
3. **Enter Password**: Input encryption password (keep it safe)
4. **Encrypt & Register**: Click "Encrypt & Register" button
5. **Verify Existence**: Use "Verify on Chain" button to verify file registration

## How It Works

### Encryption Flow

1. **File Selection**: User selects a .txt file
2. **Calculate Hash**: Compute SHA-256 hash of plaintext file
3. **Encrypt File**: Derive key using PBKDF2, encrypt with AES-GCM
4. **Pack & Download**: Package encrypted file as .enc format and download
5. **Register on Chain**: Write file hash and metadata to smart contract

### Verification Flow

1. **Select File**: Choose original .txt file
2. **Calculate Hash**: Recompute SHA-256 hash of file
3. **Query Chain**: Call smart contract `exists()` function
4. **Return Result**: Display whether file exists on blockchain

### Security Features

- **Client-Side Encryption**: All encryption happens locally in browser
- **Key Derivation**: PBKDF2 with 250,000 iterations
- **Encryption Algorithm**: AES-256-GCM for confidentiality and integrity
- **Hash Storage**: Only file hash stored on-chain, not content
- **Privacy Protection**: File content never exposed on blockchain

## Smart Contract Documentation

### ProofOfExistence.sol

**Functions**:
- `register()`: Register file hash to blockchain
- `exists()`: Check if file is registered

**Events**:
- `FileRegistered`: File registration event with all metadata

**Mappings**:
- `ownerOf`: File hash to owner address mapping

## File Format

### .enc File Format

Encrypted files use the following format:

```
[salt (16 bytes)][IV (12 bytes)][encrypted data (variable length)]
```

- **salt**: PBKDF2 salt value (16 bytes)
- **IV**: AES-GCM initialization vector (12 bytes)
- **encrypted data**: Encrypted file content

## Important Notes

### Security Warnings

- ⚠️ **Password Management**: Lost password means lost file access
- ⚠️ **File Backup**: Keep .enc encrypted files safe
- ⚠️ **Test Network**: Currently using testnet, not for production

### Limitations

- Currently only supports .txt file format
- File size should be reasonable (to avoid high gas fees)
- Only hash stored on-chain, not file content

### Gas Fees

- Base Sepolia Testnet: Nearly free
- Base Mainnet: Very low fees
- Ethereum Mainnet: Higher fees

## Future Roadmap

- [ ] Support more file formats (PDF, images, etc.)
- [ ] Integrate IPFS for encrypted file storage
- [ ] Add file decryption functionality
- [ ] Support batch file registration
- [ ] Add file metadata querying
- [ ] Support mainnet deployment

## Development Guide

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Lint Code

```bash
npm run lint
```

## FAQ

### Q: Why Base Sepolia?

A: Base Sepolia is Coinbase's L2 testnet with extremely low gas fees, mature tooling, and easy migration to Base mainnet.

### Q: Is file content stored on-chain?

A: No. Only file hash and metadata are stored on-chain. File content is encrypted and stored locally.

### Q: How to decrypt files?

A: Current MVP version doesn't include decryption feature. Future versions will add this. You need to save the encrypted file and password.

### Q: Can I use this on mainnet?

A: Yes, but you need to:
1. Deploy contract to mainnet (Base mainnet or Ethereum mainnet)
2. Update chain ID and contract address in frontend config
3. Use real ETH to pay gas fees

## License

MIT License

## Contributing

Issues and Pull Requests are welcome!

## Contact

For questions, please submit an Issue or contact the maintainers.
