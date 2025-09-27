# PIVY Stealth Address System for Aptos

A comprehensive privacy-preserving payment system for the Aptos blockchain using secp256k1 stealth address cryptography with universal token support.

## 🎯 Overview

PIVY (Privacy-preserving Payments) enables private cryptocurrency transactions on Aptos by implementing stealth addresses. This system allows users to receive payments without revealing their public address on-chain, providing enhanced privacy and unlinkability.

### Key Features

- 🔐 **Complete Privacy**: Payments appear to random addresses while being fully recoverable by intended recipients
- 🌟 **Universal Token Support**: Works with both traditional Coins (APT) and modern FungibleAssets (USDC)
- 🤖 **Auto-Detection**: Automatically detects token type and uses appropriate functions
- 🔄 **Hybrid Architecture**: Ed25519 user wallets + secp256k1 stealth cryptography for optimal compatibility
- 💸 **Smart Gas Management**: Native balance for Coins, sponsored transactions for FungibleAssets
- ⚡ **Production Ready**: Full Aptos SDK integration with testnet and mainnet support
- 🛠️ **Developer Friendly**: Clean API with comprehensive examples and documentation

## 📁 Project Structure

```
stealth-address/
├── README.md                           # This comprehensive documentation
├── pivyStealthHelpersAptos.js          # Core stealth address cryptography library
├── pivyUniversalClient.js              # Universal client for auto-detection
│
├── 🎯 CORE DEMO FILES (Start Here!)
├── pivy-stealth-cointype-flow.js       # APT (Coin) demo - native gas payment
├── pivy-stealth-fungibleasset-flow.js  # USDC (FA) demo - sponsored transactions
├── pivy-stealth-full-flow-aptos.js     # Universal demo - auto-detection
│
├── 📚 Additional Files
├── experimental-aptos.js               # Basic crypto testing (no blockchain)
├── pivy-aptos.js                       # Legacy demo file
├── cctp-stealth-sepolia-aptos.js       # Cross-chain CCTP integration
│
├── 📄 Smart Contract ABIs
├── abis/
│   ├── Usdc.json                       # USDC token ABI
│   └── cctp/                           # Circle CCTP protocol ABIs
│
└── 🔧 Utilities
    └── precompiled-move-scripts/        # Pre-compiled Move scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Aptos account with testnet funds

### Installation

```bash
npm install @noble/secp256k1 @noble/hashes @aptos-labs/ts-sdk bs58
```

### Choose Your Demo

Pick the demo that matches your use case:

#### 1. 🪙 APT (CoinType) Demo - Native Gas
**File**: `pivy-stealth-cointype-flow.js`
- Stealth address receives APT and can pay its own gas
- Uses `pay<T>()` and `withdraw<T>()` functions
- Best for: APT payments, gas-rich tokens

#### 2. 💰 USDC (FungibleAsset) Demo - Sponsored Gas
**File**: `pivy-stealth-fungibleasset-flow.js`
- Stealth address receives USDC but has 0 APT for gas
- Uses `pay_fa()` and `withdraw_fa()` functions
- Requires sponsored transaction for withdrawal
- Best for: USDC payments, gas-less tokens

#### 3. 🌟 Universal Demo - Auto-Detection
**File**: `pivy-stealth-full-flow-aptos.js`
- Automatically detects token type and uses correct functions
- Smart gas management based on token type
- Single interface for all tokens
- Best for: Production applications, multi-token support

## 🔧 Configuration & Setup

### Step 1: Fund Your Accounts

1. Get testnet APT from [Aptos Faucet](https://aptoslabs.com/testnet-faucet)
2. For USDC demo, also get testnet USDC

### Step 2: Configure Private Keys

Edit the CONFIG section in your chosen demo file:

```javascript
const CONFIG = {
  // Replace with your actual private keys
  PAYER_ED25519_PRIVATE_KEY: "0xYourPayerPrivateKey",
  RECEIVER_ED25519_PRIVATE_KEY: "0xYourReceiverPrivateKey",
  
  // For Universal demo, choose your token:
  // APT (CoinType):
  // ASSET_TYPE: '0x1::aptos_coin::AptosCoin',
  
  // USDC (FungibleAsset):
  ASSET_TYPE: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832',
};
```

### Step 3: Run Your Chosen Demo

```bash
# APT Demo (native gas)
node pivy-stealth-cointype-flow.js

# USDC Demo (sponsored gas)
node pivy-stealth-fungibleasset-flow.js

# Universal Demo (auto-detection)
node pivy-stealth-full-flow-aptos.js
```

## 📖 Detailed Demo Guides

### 🪙 APT (CoinType) Demo

**File**: `pivy-stealth-cointype-flow.js`

**What it demonstrates**:
- Ed25519 payer sends APT to stealth address
- Stealth address receives APT (native gas token)
- Stealth address can pay its own withdrawal gas
- Uses traditional Coin functions with type arguments

**Flow Summary**:
```
Ed25519 Payer → [APT] → secp256k1 Stealth → [APT] → Ed25519 Receiver
                ↑                           ↑
            pay<T>()                 withdraw<T>()
         (with type args)           (self-paid gas)
```

**Key Features**:
- ✅ Native gas token (APT) enables self-paid transactions
- ✅ Traditional Coin standard compatibility
- ✅ Type arguments for compile-time safety
- ✅ No sponsor needed for withdrawal

**Configuration**:
```javascript
COIN_TYPE: '0x1::aptos_coin::AptosCoin',
PAY_AMOUNT_OCTAS: 100_000_000n, // 1 APT
WITHDRAW_AMOUNT_OCTAS: 50_000_000n, // 0.5 APT
```

### 💰 USDC (FungibleAsset) Demo

**File**: `pivy-stealth-fungibleasset-flow.js`

**What it demonstrates**:
- Ed25519 payer sends USDC to stealth address
- Stealth address receives USDC but 0 APT for gas
- Sponsor account pays gas for stealth address withdrawal
- Uses modern FungibleAsset functions without type arguments

**Flow Summary**:
```
Ed25519 Payer → [USDC] → secp256k1 Stealth → [USDC] → Ed25519 Receiver
                ↑                             ↑
           pay_fa()                    withdraw_fa()
        (no type args)              (sponsor pays gas)
```

**Key Features**:
- ✅ Modern FungibleAsset standard (USDC, WETH, etc.)
- ✅ No type arguments needed
- ✅ Sponsored transaction pattern
- ✅ Gas-less withdrawal for stealth address

**Configuration**:
```javascript
ASSET_TYPE: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832', // USDC
PAY_AMOUNT: 1000000n, // 1 USDC (6 decimals)
WITHDRAW_AMOUNT: 1000000n, // 1 USDC
```

**Sponsored Transaction Pattern**:
```javascript
// 1. Build transaction with fee payer
const transaction = await aptos.transaction.build.simple({
  sender: stealthAddress,
  withFeePayer: true, // Enable sponsored transaction
  data: { /* withdrawal function */ }
});

// 2. Stealth address signs transaction
const senderAuth = aptos.transaction.sign({
  signer: stealthAccount,
  transaction
});

// 3. Sponsor signs as fee payer
const feePayerAuth = aptos.transaction.signAsFeePayer({
  signer: sponsorAccount,
  transaction
});

// 4. Submit with both signatures
const result = await aptos.transaction.submit.simple({
  transaction,
  senderAuthenticator: senderAuth,
  feePayerAuthenticator: feePayerAuth
});
```

### 🌟 Universal Demo (Recommended)

**File**: `pivy-stealth-full-flow-aptos.js`

**What it demonstrates**:
- Automatic token type detection (Coin vs FungibleAsset)
- Smart routing to appropriate functions
- Intelligent gas management based on token type
- Single codebase for all token types

**Flow Summary**:
```
Ed25519 Payer → [ANY TOKEN] → secp256k1 Stealth → [ANY TOKEN] → Ed25519 Receiver
                ↑                                   ↑
        Auto-Detection                     Smart Gas Management
     (pay<T> or pay_fa)                (native or sponsored)
```

**Key Features**:
- 🤖 **Auto-Detection**: Automatically detects Coin vs FungibleAsset
- 🧠 **Smart Routing**: Uses correct functions (`pay<T>` vs `pay_fa`)
- 💸 **Intelligent Gas**: Native for Coins, sponsored for FAs
- 🔧 **Single Interface**: One codebase for all tokens
- 📊 **Debug Info**: Shows detection results and function choices

**Auto-Detection Logic**:
```javascript
// Detects based on asset type format
isFungibleAsset(assetType) {
  // FungibleAssets: 0x[64 hex chars] (Object addresses)
  // Coins: 0xaddress::module::CoinType
  return /^0x[0-9a-f]{64}$/i.test(assetType);
}
```

**Configuration**:
```javascript
// Switch between tokens by changing ASSET_TYPE:

// APT (Coin) - stealth gets native gas
ASSET_TYPE: '0x1::aptos_coin::AptosCoin',
PAY_AMOUNT: 100_000_000n, // 1 APT

// USDC (FungibleAsset) - stealth needs sponsored withdrawal  
ASSET_TYPE: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832',
PAY_AMOUNT: 1000000n, // 1 USDC
```

## 🔍 PIVYUniversalClient

The universal client provides automatic token detection and smart routing:

```javascript
import { PIVYUniversalClient } from './pivyUniversalClient.js';

const pivyUniversal = new PIVYUniversalClient(aptos, CONFIG);

// Automatic detection
const assetInfo = pivyUniversal.getAssetTypeInfo(CONFIG.ASSET_TYPE);
console.log('Detected as:', assetInfo.detectedAs); // "Coin" or "Fungible Asset"
console.log('Function to use:', assetInfo.functionToUse); // "pay<T>" or "pay_fa"
console.log('Is FungibleAsset:', assetInfo.isFungibleAsset); // true/false
```

## 🔐 Core Cryptography Library

### PivyStealthAptos Class

The core library (`pivyStealthHelpersAptos.js`) provides all cryptographic operations:

```javascript
import PivyStealthAptos from './pivyStealthHelpersAptos.js';

const pivy = new PivyStealthAptos();

// 1. Generate receiver's meta keys (one-time setup)
const metaKeys = pivy.generateMetaKeys();

// 2. Payer generates ephemeral key for payment
const ephemeral = pivy.generateEphemeralKey();

// 3. Payer derives stealth address (PUBLIC KEYS ONLY!)
const stealthInfo = await pivy.deriveStealthPub(
  metaKeys.metaSpendPubB58,
  metaKeys.metaViewPubB58,
  ephemeral.privateKey
);

// 4. Receiver recovers stealth keypair
const stealthKP = await pivy.deriveStealthKeypair(
  metaKeys.metaSpend.privateKey.toUint8Array(),
  metaKeys.metaView.privateKey.toUint8Array(),
  ephemeral.publicKeyB58
);
```

### Security Model

**Key Security Properties**:
- ✅ Payer only uses receiver's PUBLIC keys (no private key sharing!)
- ✅ Only receiver can derive stealth private key
- ✅ Each payment uses fresh ephemeral keys
- ✅ Private notes encrypted end-to-end
- ✅ Forward secrecy with ephemeral keys

**Cryptographic Foundation**:
```
StealthPublicKey = MetaSpendPublicKey + (tweak × G)
StealthPrivateKey = MetaSpendPrivateKey + tweak (mod n)

Where:
- tweak = SHA256(ECDH(ephemeralPriv, metaViewPub))
- G = secp256k1 generator point
- n = secp256k1 curve order
```

## 🎮 Smart Contract Integration

The demos work with the deployed PIVY stealth contract:

```javascript
const PIVY_CONTRACT = {
  packageId: '0xc0d64666b049e1412b7bcd74d0d20b34a10d12f76555843be78f1bb5bd126ee1',
  moduleName: 'pivy_stealth',
  
  // Coin functions (with type arguments)
  functions: {
    pay: 'pay<T>',           // Pay with Coin
    withdraw: 'withdraw<T>'   // Withdraw Coin
  },
  
  // FungibleAsset functions (no type arguments) 
  faFunctions: {
    payFa: 'pay_fa',         // Pay with FungibleAsset
    withdrawFa: 'withdraw_fa' // Withdraw FungibleAsset
  }
};
```

## 💡 Use Cases

### 1. Private Payroll
- Employer pays employees privately using stealth addresses
- Employee salaries remain confidential
- Works with any token (APT, USDC, custom tokens)

### 2. Anonymous Donations
- Accept donations without revealing donor or recipient identity
- Each donation appears to different random address
- Private notes for donor messages

### 3. Private DEX Settlements
- Trade settlements to stealth addresses
- Prevent front-running and MEV
- Enhanced trading privacy

### 4. Multi-Token Payments
- Universal interface supports all Aptos tokens
- Automatic detection eliminates technical complexity
- Consistent UX across different token types

## 🔧 Development Guide

### Testing Locally

```bash
# Clone the repository
git clone <repository-url>
cd stealth-address

# Install dependencies
npm install @noble/secp256k1 @noble/hashes @aptos-labs/ts-sdk bs58

# Configure your keys in demo files
# Run basic cryptography test (no blockchain)
node experimental-aptos.js

# Run APT demo (requires funded account)
node pivy-stealth-cointype-flow.js

# Run USDC demo (requires USDC tokens)
node pivy-stealth-fungibleasset-flow.js

# Run universal demo (works with any token)
node pivy-stealth-full-flow-aptos.js
```

### Integration into Your App

```javascript
// ES6 Modules
import PivyStealthAptos from './pivyStealthHelpersAptos.js';
import { PIVYUniversalClient } from './pivyUniversalClient.js';

// Initialize
const pivy = new PivyStealthAptos();
const pivyUniversal = new PIVYUniversalClient(aptosClient, config);

// Use in your payment flow
const stealthPayment = await createStealthPayment(
  receiverMetaKeys,
  assetType,
  amount
);
```

### Browser Compatibility

The library works in modern browsers:
- WebCrypto API support required
- ES6 module support
- No additional polyfills needed

## 🐛 Troubleshooting

### Common Issues

#### ❌ "Account not found"
**Cause**: Account not funded or doesn't exist
**Solution**: Fund accounts with testnet APT from [faucet](https://aptoslabs.com/testnet-faucet)

#### ❌ "Address mismatch between payer and receiver"
**Cause**: Different inputs used for stealth derivation
**Solution**: Ensure exact same meta keys and ephemeral key used by both parties

#### ❌ "Insufficient funds for gas"
**For CoinType**: Ensure stealth address has enough APT for gas
**For FungibleAsset**: Use sponsored transaction pattern

#### ❌ "Function not found" or "Type argument mismatch"
**Cause**: Wrong function used for token type
**Solution**: Use Universal demo for automatic detection

### Debug Mode

Enable detailed logging in demos:

```javascript
// Add to demo files for debugging
console.log('🔍 Debug Info:');
console.log('Asset Type:', CONFIG.ASSET_TYPE);
console.log('Detected As:', assetInfo.detectedAs);
console.log('Function Used:', assetInfo.functionToUse);
console.log('Is FungibleAsset:', assetInfo.isFungibleAsset);
```

### Network Issues

If transactions fail:
1. Check network status (testnet may be down)
2. Verify account balances
3. Ensure correct contract addresses
4. Try with smaller amounts

## 🔒 Security Best Practices

### Key Management
- ✅ Store meta private keys securely
- ✅ Never share private keys
- ✅ Generate fresh ephemeral keys for each payment
- ✅ Use hardware wallets for production

### Transaction Security
- ✅ Always validate stealth address derivation
- ✅ Verify encrypted data integrity
- ✅ Use HTTPS for all network communications
- ✅ Implement proper error handling

### Privacy Considerations
- ✅ Use different stealth addresses for each payment
- ✅ Avoid timing correlations
- ✅ Consider amount privacy (use standard amounts)
- ✅ Implement proper scanning mechanisms

## 📚 Token Support Reference

### Supported Token Types

| Token Type | Examples | Functions | Type Args | Gas Strategy |
|------------|----------|-----------|-----------|--------------|
| **Coin** | APT, Custom Coins | `pay<T>`, `withdraw<T>` | Required | Native Balance |
| **FungibleAsset** | USDC, WETH | `pay_fa`, `withdraw_fa` | None | Sponsored Transaction |

### Token Identification

```javascript
// Coin format (traditional)
'0x1::aptos_coin::AptosCoin'
'0xabc123::my_coin::MyCoin'

// FungibleAsset format (modern)
'0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832' // USDC
'0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' // Other FA
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-demo`
3. Add comprehensive tests
4. Ensure all demos pass
5. Submit a pull request

## 📄 License

This project is provided as-is for educational and research purposes. Please review and test thoroughly before using in production environments.

## ⚠️ Security Disclaimer

This software is experimental and has not undergone formal security audits. Use at your own risk. The authors are not responsible for any loss of funds or privacy breaches resulting from the use of this software.

---

## 🎯 Quick Reference

### Demo Files Priority
1. **Start Here**: `pivy-stealth-full-flow-aptos.js` (Universal)
2. **APT Focus**: `pivy-stealth-cointype-flow.js` (CoinType)  
3. **USDC Focus**: `pivy-stealth-fungibleasset-flow.js` (FungibleAsset)

### Key Files
- **Core Library**: `pivyStealthHelpersAptos.js`
- **Universal Client**: `pivyUniversalClient.js`
- **Basic Testing**: `experimental-aptos.js`

### Configuration
- Update private keys in CONFIG section
- Choose token type (Coin vs FungibleAsset)
- Ensure sufficient balances for testing

### Getting Help
- Check troubleshooting section above
- Review demo file comments
- Test with `experimental-aptos.js` first (no blockchain required)

**Built with ❤️ by the PIVY Team**