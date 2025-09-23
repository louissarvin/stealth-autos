# PIVY Stealth Address System for Aptos

A comprehensive privacy-preserving payment system for the Aptos blockchain using secp256k1 stealth address cryptography.

## 🎯 Overview

PIVY (Privacy-preserving Payments) enables private cryptocurrency transactions on Aptos by implementing stealth addresses. This system allows users to receive payments without revealing their public address on-chain, providing enhanced privacy and unlinkability.

### Key Features

- 🔐 **Complete Privacy**: Payments appear to random addresses while being fully recoverable by intended recipients
- 🔄 **Hybrid Architecture**: Ed25519 user wallets + secp256k1 stealth cryptography for optimal compatibility
- 🔒 **End-to-End Encryption**: Private notes and ephemeral keys encrypted using ECDH
- ⚡ **Production Ready**: Full Aptos SDK integration with testnet and mainnet support
- 🛠️ **Developer Friendly**: Clean API with comprehensive examples and documentation
- 🔧 **Cross-Platform**: Works in both browser and Node.js environments

## 📁 Project Structure

```
stealth-address/
├── README.md                           # This documentation
├── pivyStealthHelpersAptos.js          # Core stealth address library
├── experimental-aptos.js               # Basic demo and testing
└── pivy-stealth-full-flow-aptos.js     # Complete production flow demo
```

## 🚀 Installation

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Aptos account with testnet funds (for demos)

### Dependencies

```bash
npm install @noble/secp256k1 @noble/hashes @aptos-labs/ts-sdk bs58
```

### Setup

1. Clone or download the stealth address folder
2. Install dependencies
3. Configure your Aptos accounts in demo files (if running demos)

## 📖 Quick Start

### Basic Usage

```javascript
import PivyStealthAptos from './pivyStealthHelpersAptos.js';

// Initialize the library
const pivy = new PivyStealthAptos();

// 1. Receiver: Generate meta keys (one-time setup)
const metaKeys = pivy.generateMetaKeys();
console.log('Share these public keys:', {
  spend: metaKeys.metaSpendPubB58,
  view: metaKeys.metaViewPubB58
});

// 2. Payer: Create stealth payment
const ephemeral = pivy.generateEphemeralKey();
const stealthInfo = await pivy.deriveStealthPub(
  metaKeys.metaSpendPubB58,
  metaKeys.metaViewPubB58,
  ephemeral.privateKey
);

console.log('Send funds to:', stealthInfo.stealthAptosAddress);

// 3. Receiver: Recover stealth keypair
const stealthKP = await pivy.deriveStealthKeypair(
  metaKeys.metaSpend.privateKey.toUint8Array(),
  metaKeys.metaView.privateKey.toUint8Array(),
  ephemeral.publicKeyB58
);

console.log('Recovered address:', stealthKP.stealthAddress);
```

### Running Demos

#### Basic Demo
```bash
node experimental-aptos.js
```

#### Full Production Flow
```bash
# Configure your private keys in the CONFIG section first
node pivy-stealth-full-flow-aptos.js
```

## 🔧 API Documentation

### Core Class: `PivyStealthAptos`

#### Key Generation

##### `generateMetaKeys()`
Generates receiver's meta keypair (spend + view keys).

```javascript
const metaKeys = pivy.generateMetaKeys();
// Returns: { metaSpend, metaView, metaSpendPubB58, metaViewPubB58 }
```

##### `generateEphemeralKey()`
Generates payer's ephemeral keypair for a specific payment.

```javascript
const ephemeral = pivy.generateEphemeralKey();
// Returns: { account, privateKey, publicKeyB58 }
```

#### Stealth Address Operations

##### `deriveStealthPub(metaSpendPubB58, metaViewPubB58, ephPriv32, metaSpendPriv?)`
**Payer side**: Generates stealth address from receiver's public keys.

```javascript
const stealthInfo = await pivy.deriveStealthPub(
  receiverSpendPub,
  receiverViewPub,
  ephemeralPrivateKey
);
// Returns: { stealthPubKeyB58, stealthAptosAddress, stealthPubKeyBytes }
```

##### `deriveStealthKeypair(metaSpendPriv, metaViewPriv, ephPub)`
**Receiver side**: Recovers stealth private key and creates usable account.

```javascript
const stealthKP = await pivy.deriveStealthKeypair(
  metaSpendPrivateKey,
  metaViewPrivateKey,
  ephemeralPublicKey
);
// Returns: { account, stealthAddress, privateKey, toAptosAddress(), publicKeyBase58() }
```

#### Encryption/Decryption

##### `encryptEphemeralPrivKey(ephPriv32, metaViewPub)`
Encrypts ephemeral private key for secure transmission to receiver.

```javascript
const encrypted = await pivy.encryptEphemeralPrivKey(ephPriv, receiverViewPub);
// Returns: Base58-encoded encrypted payload
```

##### `decryptEphemeralPrivKey(encodedPayload, metaViewPriv, ephPub)`
Decrypts ephemeral private key (receiver side).

```javascript
const decrypted = await pivy.decryptEphemeralPrivKey(
  encryptedPayload,
  metaViewPrivateKey,
  ephemeralPublicKey
);
// Returns: 32-byte ephemeral private key
```

##### `encryptNote(plaintext, ephPriv32, metaViewPub)`
Encrypts private note for receiver.

```javascript
const encryptedNote = await pivy.encryptNote(
  "Secret message!",
  ephemeralPrivateKey,
  receiverViewPub
);
// Returns: Encrypted note bytes
```

##### `decryptNote(encryptedBytes, metaViewPriv, ephPub)`
Decrypts private note (receiver side).

```javascript
const message = await pivy.decryptNote(
  encryptedBytes,
  metaViewPrivateKey,
  ephemeralPublicKey
);
// Returns: Decrypted UTF-8 string
```

#### Utility Functions

##### `validateStealthMatch(payerAddress, receiverAddress)`
Validates that payer and receiver derived the same stealth address.

```javascript
const isValid = pivy.validateStealthMatch(
  payerDerivedAddress,
  receiverDerivedAddress
);
// Returns: boolean
```

## 🏗️ Technical Architecture

### Stealth Address Cryptography

The system uses **secp256k1 elliptic curve cryptography** with the following mathematical foundation:

#### Key Derivation
```
StealthPublicKey = MetaSpendPublicKey + (tweak × G)
StealthPrivateKey = MetaSpendPrivateKey + tweak (mod n)

Where:
- tweak = SHA256(ECDH(ephemeralPriv, metaViewPub))
- G = secp256k1 generator point
- n = secp256k1 curve order
```

#### Encryption
- **Key Agreement**: ECDH between ephemeral private key and meta view public key
- **Encryption**: XOR with SHA256 of shared secret
- **Authentication**: Public key verification for integrity

### Hybrid Architecture

The system leverages a **hybrid approach** combining:

1. **Ed25519 Accounts**: User's normal wallets for account management
2. **secp256k1 Cryptography**: Stealth address mathematics and encryption
3. **Aptos SDK Integration**: Native compatibility with Aptos transaction system

### Security Model

#### Privacy Guarantees
- **Unlinkability**: Each payment appears to a different random address
- **Forward Secrecy**: Ephemeral keys ensure past transactions remain private
- **Metadata Protection**: Private notes encrypted end-to-end

#### Security Assumptions
- **Elliptic Curve Discrete Log**: Foundation of secp256k1 security
- **Hash Function Security**: SHA256 and SHA3-256 for key derivation
- **Implementation Security**: Uses audited @noble cryptographic libraries

## 🎮 Demo Scripts

### `experimental-aptos.js`
**Purpose**: Basic stealth address demonstration and testing

**Features**:
- Meta key generation
- Stealth address derivation
- Encryption/decryption testing
- Address validation
- Aptos wallet compatibility test

**Usage**:
```bash
node experimental-aptos.js
```

### `pivy-stealth-full-flow-aptos.js`
**Purpose**: Complete production workflow demonstration

**Features**:
- Real Aptos testnet integration
- Ed25519 → secp256k1 → Ed25519 flow
- Actual payment transactions
- Stealth address withdrawal
- Balance verification

**Configuration**:
```javascript
const CONFIG = {
  NETWORK: Network.TESTNET,
  PAYER_ED25519_PRIVATE_KEY: "0xYourPrivateKey1...",
  RECEIVER_ED25519_PRIVATE_KEY: "0xYourPrivateKey2...",
  PACKAGE_ID: "0xc0d64666b049e1412b7bcd74d0d20b34a10d12f76555843be78f1bb5bd126ee1",
  // ... other settings
};
```

**Usage**:
1. Fund your Ed25519 accounts with testnet APT
2. Update private keys in CONFIG
3. Run: `node pivy-stealth-full-flow-aptos.js`

## 🔍 Use Cases

### Private Payments
Send payments without revealing recipient's identity or linking to previous transactions.

### Payroll Privacy
Employers can pay employees privately without exposing salary information.

### Donation Systems
Accept donations while maintaining donor and recipient privacy.

### DEX Privacy
Trade privately by using stealth addresses for order settlements.

### Multi-Party Transactions
Coordinate private payments in complex financial arrangements.

## 🚨 Security Considerations

### Best Practices
- **Key Management**: Store meta private keys securely and never share them
- **Ephemeral Keys**: Generate fresh ephemeral keys for each payment
- **Network Security**: Use HTTPS/WSS for all communications
- **Validation**: Always validate stealth address derivation matches

### Known Limitations
- **Gas Costs**: Each stealth payment requires on-chain transaction
- **Scanning**: Receivers must scan for payments (not implemented in demos)
- **Metadata Leakage**: Transaction timing and amounts still visible
- **Key Recovery**: Lost meta private keys = permanent fund loss

## 🛠️ Development

### Testing
```bash
# Run basic functionality test
node experimental-aptos.js

# Run full integration test (requires funded accounts)
node pivy-stealth-full-flow-aptos.js
```

### Integration
```javascript
// ES6 Modules
import PivyStealthAptos from './pivyStealthHelpersAptos.js';

// CommonJS (if using require)
const PivyStealthAptos = require('./pivyStealthHelpersAptos.js');

// Static methods (legacy compatibility)
import { deriveStealthPub, encryptNote } from './pivyStealthHelpersAptos.js';
```

### Browser Compatibility
The library works in browsers with modern ES6+ support. Ensure you have:
- WebCrypto API support
- ES6 module support
- Proper CORS configuration for API calls

## 🐛 Troubleshooting

### Common Issues

#### "Unsupported key format"
**Cause**: Invalid key format passed to `to32u8()`
**Solution**: Ensure keys are 64-char hex strings, Base58, or Uint8Array

#### "Decryption failed – ephemeral public key mismatch"
**Cause**: Wrong ephemeral public key used for decryption
**Solution**: Verify ephemeral public key matches the one used for encryption

#### "Account not found" (in full demo)
**Cause**: Account not funded or doesn't exist on network
**Solution**: Fund accounts with testnet/mainnet APT tokens

#### Address mismatch between payer and receiver
**Cause**: Different inputs used for stealth derivation
**Solution**: Ensure exact same meta keys and ephemeral key used by both parties

### Debug Mode
Enable detailed logging by modifying the demo scripts:
```javascript
console.log('Debug - Ephemeral private key:', Buffer.from(ephPriv).toString('hex'));
console.log('Debug - Shared secret:', Buffer.from(shared).toString('hex'));
console.log('Debug - Tweak:', Buffer.from(tweak).toString('hex'));
```

## 📚 Further Reading

- [Stealth Addresses Specification](https://github.com/grin-tech/grin-rfcs/blob/master/text/0006-stealth-addresses.md)
- [Aptos Developer Documentation](https://aptos.dev/)
- [secp256k1 Cryptography](https://en.bitcoin.it/wiki/Secp256k1)
- [ECDH Key Agreement](https://tools.ietf.org/html/rfc3526)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all demos pass
5. Submit a pull request

## 📄 License

This project is provided as-is for educational and research purposes. Please review and test thoroughly before using in production environments.

## ⚠️ Disclaimer

This software is experimental and has not undergone formal security audits. Use at your own risk. The authors are not responsible for any loss of funds or privacy breaches resulting from the use of this software.

---

**Built with ❤️ by the PIVY Team**

For support and questions, please open an issue in the repository.