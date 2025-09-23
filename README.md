# PIVY Stealth Payment System for Aptos

A complete implementation of ERC-5564 stealth addresses on Aptos, enabling private and unlinkable payments while maintaining self-custody.

## 🎯 Overview

PIVY brings privacy-preserving payments to Aptos through stealth addresses - a cryptographic technique that generates unique destination addresses for each payment while allowing only the intended recipient to detect and control them.

### Key Features

- ✅ **Perfect Unlinkability**: Each payment gets a unique destination address
- ✅ **Self-Custody**: Users maintain complete control over their funds
- ✅ **Cross-Token Support**: Works with any Aptos token (APT, USDC, etc.)
- ✅ **Event-Based Discovery**: Efficient payment detection through blockchain events
- ✅ **Mathematical Privacy**: Computationally impossible to link payments
- ✅ **Production Ready**: Comprehensive testing and documentation

## 🏗️ Architecture

### Core Components

1. **Stealth Address Generation**: Cryptographically derive unique addresses per payment
2. **Event Store**: Global registry for payment announcements and discovery
3. **Meta Keys**: User's permanent keys for payment detection and control
4. **Ephemeral Keys**: One-time keys ensuring payment uniqueness

### Privacy Model

```
┌─────────────┐    ┌─────────────────┐    ┌─────────────┐
│    Payer    │───▶│ Stealth Address │───▶│  Receiver   │
│  (Bob)      │    │   (0xf693...)   │    │  (Alice)    │
└─────────────┘    └─────────────────┘    └─────────────┘
      │                      │                     │
      ▼                      ▼                     ▼
  Generates              Unlinkable            Detects &
  unique address         destination           controls
```

## 🚀 Quick Start

### Prerequisites

- [Aptos CLI](https://aptos.dev/tools/aptos-cli-tool/install-aptos-cli) installed
- Aptos account with sufficient balance
- Basic understanding of Move programming

### Installation

1. **Clone and Navigate**
   ```bash
   git clone <repository-url>
   cd stealth-address-aptos
   ```

2. **Initialize Your Environment**
   ```bash
   export EVENT_STORE_ADDRESS=<your_deployed_address>
   ```

3. **Compile**
   ```bash
   aptos move compile
   ```

4. **Deploy Contract**
   ```bash
   aptos move publish --named-addresses pivy_stealth=<your_account_address>
   ```

## 🔐 Cryptographic Implementation

### Stealth Address Generation

1. **Meta Key Generation**
   ```
   Meta Spend Keys: (spend_priv, spend_pub)
   Meta View Keys: (view_priv, view_pub)
   ```

2. **Payment Flow**
   ```
   Payer generates ephemeral key: (eph_priv, eph_pub)
   Shared secret: shared_secret = eph_priv * view_pub
   Stealth address: stealth_pub = spend_pub + hash(shared_secret) * G
   ```

3. **Detection Flow**
   ```
   Receiver computes: shared_secret = view_priv * eph_pub
   Derives stealth key: stealth_priv = spend_priv + hash(shared_secret)
   Verifies control: stealth_priv * G == stealth_pub
   ```

### Security Properties

- **Perfect Forward Secrecy**: Compromised keys don't affect past payments
- **Computational Unlinkability**: 2^256 search space makes linking impossible
- **Non-Interactive**: No communication needed between payer and receiver
- **Quantum Resistant**: Can be upgraded to post-quantum curves

## 🧪 Testing

### Run All Tests
```bash
aptos move test --profile default
```

### Test Coverage

The test suite covers:
- ✅ Event store initialization and management
- ✅ Meta key registration with validation
- ✅ Payment announcements and transfers
- ✅ Withdrawals from stealth addresses
- ✅ Error handling and edge cases
- ✅ Event emission and validation
- ✅ System statistics and queries
- ✅ Integration scenarios
- ✅ Maximum and minimum input validation

### Test Structure

```
tests/
├── pivy_stealth_tests.move    # Comprehensive test suite
│   ├── Initialization Tests   # Event store setup
│   ├── Registration Tests     # Meta key validation
│   ├── Payment Tests         # Payment flow testing
│   ├── Withdrawal Tests      # Fund withdrawal testing
│   ├── Utility Tests         # Helper function testing
│   ├── Integration Tests     # End-to-end scenarios
│   └── Edge Case Tests       # Boundary condition testing
```

## 🎛️ Configuration

### Environment Variables

```bash
# Network configuration
export NETWORK=testnet              # devnet, testnet, mainnet
export PROFILE=default              # Aptos CLI profile
export MODULE_ADDRESS=0x1           # Where module is deployed
export EVENT_STORE_ADDRESS=0x...    # Event store location
```

### Network Addresses

| Network | Module Address | Event Store |
|---------|---------------|-------------|
| Devnet  | `0x1`         | TBD         |
| Testnet | `0x1`         | TBD         |
| Mainnet | TBD           | TBD         |

## 🛠️ Development

### Project Structure

```
stealth-address-aptos/
├── Move.toml                 # Move package configuration
├── sources/
│   └── pivy_stealth.move    # Main contract implementation
├── scripts/
│   ├── deploy.sh            # Deployment automation
│   └── interact.sh          # CLI interaction tools
├── tests/
│   └── pivy_stealth_tests.move # Comprehensive test suite
└── README.md                # This documentation
```

### Building

```bash
# Compile the module
aptos move compile --profile default

# Run tests
aptos move test --profile default

# Deploy to network
./scripts/deploy.sh <network> <profile>
```

### Adding New Features

1. Implement new functions in `sources/pivy_stealth.move`
2. Add comprehensive tests in `tests/pivy_stealth_tests.move`
3. Update CLI scripts if needed
4. Update documentation

## 🔍 Monitoring & Analytics

### Event Types

The system emits three types of events:

1. **PaymentAnnouncementEvent**: When payments are made
2. **WithdrawalEvent**: When funds are withdrawn
3. **RegistrationEvent**: When users register meta keys

## 🚨 Security Considerations

### Best Practices

1. **Key Management**
   - Store meta private keys securely (hardware wallets recommended)
   - Never share private keys over insecure channels
   - Use different meta keys for different purposes

2. **Operational Security**
   - Use VPN/Tor when scanning for payments
   - Vary withdrawal timing to prevent correlation
   - Consider using multiple meta key sets

3. **Smart Contract Security**
   - Module is immutable once deployed
   - All funds remain in user custody
   - No admin keys or backdoors

### Threat Model

**Protected Against:**
- ✅ Transaction graph analysis
- ✅ Address clustering attacks
- ✅ Timing correlation attacks
- ✅ Amount correlation attacks

**Not Protected Against:**
- ❌ IP address correlation (use VPN/Tor)
- ❌ Device fingerprinting (use privacy tools)
- ❌ Social engineering attacks

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add comprehensive tests
5. Update documentation
6. Submit a pull request

### Development Guidelines

- Follow Move coding standards
- Maintain 100% test coverage
- Document all public functions
- Use meaningful variable names
- Add inline comments for complex logic

### Reporting Issues

Please report security issues privately to the maintainers.
For general bugs, use the GitHub issue tracker.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **ERC-5564**: Stealth address standard specification
- **Aptos Foundation**: Blockchain platform and Move language
- **Privacy Research Community**: Cryptographic techniques and analysis

---

**Built with privacy in mind, powered by mathematics, secured by cryptography.** 🔐✨