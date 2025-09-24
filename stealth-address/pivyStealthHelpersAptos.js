/**
 * PIVY Stealth Address Helpers for Aptos
 * 
 * A comprehensive utility library for PIVY stealth addresses on Aptos blockchain.
 * Provides cryptographic functions for privacy-preserving payments using secp256k1.
 * 
 * Features:
 * - Stealth address generation and recovery
 * - Ephemeral key encryption/decryption
 * - Private note encryption/decryption
 * - Aptos-compatible address derivation
 * - Cross-platform compatibility (browser/node)
 * 
 * @author PIVY Team
 * @version 1.0.0
 */

import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { sha3_256 } from '@noble/hashes/sha3';
import bs58 from 'bs58';
import { randomBytes } from 'crypto';

// Aptos SDK imports (modern)
import { Account, Secp256k1PrivateKey, SigningSchemeInput } from '@aptos-labs/ts-sdk';

/*──────────────────────────────────────────────────────────────────*/
/*  Main PivyStealthAptos Class                                     */
/*──────────────────────────────────────────────────────────────────*/

/**
 * PIVY Stealth Address Suite for Aptos Blockchain
 * 
 * A comprehensive class for handling stealth addresses, encryption, and
 * privacy-preserving payments on the Aptos blockchain using secp256k1.
 * 
 * @example
 * // Basic usage
 * const pivy = new PivyStealthAptos();
 * const metaKeys = pivy.generateMetaKeys();
 * const ephemeral = pivy.generateEphemeralKey();
 * const stealth = await pivy.deriveStealthPub(
 *   metaKeys.metaSpendPubB58,
 *   metaKeys.metaViewPubB58,
 *   ephemeral.privateKey
 * );
 * 
 * // Static usage
 * const stealthInfo = await PivyStealthAptos.deriveStealthPub(...);
 */
export class PivyStealthAptos {
  
  /*──────────────────────────────────────────────────────────────────*/
  /*  Core Utilities                                                  */
  /*──────────────────────────────────────────────────────────────────*/

  /**
   * Extracts the private key bytes from an Aptos account.
   * 
   * @param {Account} account - Aptos account object
   * @returns {Uint8Array} 32-byte private key
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const account = Account.generate();
   * const privBytes = pivy.getPrivBytes(account);
   */
  getPrivBytes(account) {
    return account.privateKey.toUint8Array();
  }

  /**
   * Extracts the public key bytes from an Aptos account.
   * 
   * @param {Account} account - Aptos account object
   * @returns {Uint8Array} 33-byte compressed public key
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const account = Account.generate();
   * const pubBytes = pivy.getPubBytes(account);
   */
  getPubBytes(account) {
    return secp.getPublicKey(account.privateKey.toUint8Array(), true);
  }

  /**
   * Converts a UTF-8 string to bytes.
   * 
   * @param {string} str - String to convert
   * @returns {Uint8Array} UTF-8 encoded bytes
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const bytes = pivy.toBytes("Hello, Aptos!");
   */
  toBytes(str) {
    const utf8 = new TextEncoder();
    return utf8.encode(str);
  }

  /**
   * Pads a Uint8Array to exactly 32 bytes.
   * 
   * @param {Uint8Array} u8 - Input array
   * @returns {Uint8Array} 32-byte padded array
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const padded = pivy.pad32(new Uint8Array([1, 2, 3]));
   * // Returns 32-byte array with [1, 2, 3, 0, 0, ...]
   */
  pad32(u8) {
    const out = new Uint8Array(32);
    out.set(u8.slice(0, 32));
    return out;
  }

  /**
   * Converts various key formats to a standardized 32-byte Uint8Array.
   * 
   * Supports multiple input formats:
   * - Hex strings (64 characters)
   * - Base58 encoded strings
   * - Buffer JSON objects
   * - Uint8Array instances
   * 
   * @param {string|Uint8Array|Object} raw - Input key in various formats
   * @returns {Uint8Array} 32-byte key as Uint8Array
   * @throws {Error} If input format is not supported
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const key1 = pivy.to32u8("5f8b2c4d..."); // hex string
   * const key2 = pivy.to32u8("9WzQeP..."); // base58 string
   * const key3 = pivy.to32u8(new Uint8Array(32)); // direct array
   */
  to32u8(raw) {
    if (raw instanceof Uint8Array) return raw;
    if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, 'hex');
    if (typeof raw === 'string') return bs58.decode(raw);
    if (raw?.type === 'Buffer') return Uint8Array.from(raw.data);
    throw new Error('Unsupported key format');
  }

  /**
   * Converts secp256k1 public key point to Aptos address format.
   * 
   * Uses the exact Aptos SDK format discovered through debugging:
   * SDK format: 0x01 | 0x41 | uncompressed_pubkey | 0x02
   * Where 0x01 = key type prefix, 0x41 = length (65), 0x02 = auth scheme
   * 
   * @param {Uint8Array} point - 33-byte compressed secp256k1 public key
   * @returns {string} Aptos address with 0x prefix
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const pubKey = secp.getPublicKey(privateKey, true);
   * const address = pivy.secp256k1PointToAptosAddress(pubKey);
   * // Returns: "0x1a2b3c..." (matches SDK exactly)
   */
  secp256k1PointToAptosAddress(point) {
    // STEP 1: Convert compressed (33 bytes) to uncompressed (65 bytes)
    const uncompressedPubKey = secp.Point.fromHex(point).toRawBytes(false);
    
    // STEP 2: Match exact SDK format discovered through debugging
    const keyTypePrefix = new Uint8Array([0x01]);           // Secp256k1 key type
    const keyLength = new Uint8Array([0x41]);              // Length = 65 (0x41)
    const authScheme = new Uint8Array([0x02]);             // Single key scheme
    
    // STEP 3: Concatenate: prefix + length + pubkey + scheme (matches SDK exactly)
    const data = new Uint8Array(1 + 1 + uncompressedPubKey.length + 1);
    data.set(keyTypePrefix, 0);
    data.set(keyLength, 1);
    data.set(uncompressedPubKey, 2);
    data.set(authScheme, 2 + uncompressedPubKey.length);
    
    // STEP 4: Apply SHA3-256 hash (same as SDK)
    const authKey = sha3_256(data);
    
    // STEP 5: Convert to hex address
    return '0x' + Buffer.from(authKey).toString('hex');
  }

  /*──────────────────────────────────────────────────────────────────*/
  /*  Encryption/Decryption Functions                                 */
  /*──────────────────────────────────────────────────────────────────*/

  /**
   * Encrypts an ephemeral private key for secure transmission.
   * 
   * Uses ECDH key agreement between ephemeral private key and meta view public key
   * to derive a shared encryption key. The plaintext includes both the private key
   * and corresponding public key for integrity verification.
   * 
   * @param {string|Uint8Array} ephPriv32 - 32-byte ephemeral private key
   * @param {string|Uint8Array} metaViewPub - 33-byte meta view public key
   * @returns {Promise<string>} Base58-encoded encrypted payload
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const ephPriv = randomBytes(32);
   * const metaViewPub = receiverViewPublicKey;
   * const encrypted = await pivy.encryptEphemeralPrivKey(ephPriv, metaViewPub);
   */
  async encryptEphemeralPrivKey(ephPriv32, metaViewPub) {
    const shared = secp.getSharedSecret(this.to32u8(ephPriv32), this.to32u8(metaViewPub), true);
    const keyBytes = sha256(shared.slice(1)); // Remove compression flag
    
    // Plaintext: ephemeral private key + ephemeral public key
    const ephPub = secp.getPublicKey(this.to32u8(ephPriv32), true);
    const plain = new Uint8Array([...this.to32u8(ephPriv32), ...ephPub]);
    
    // XOR encryption
    const enc = new Uint8Array(plain.length);
    for (let i = 0; i < plain.length; i++) {
      enc[i] = plain[i] ^ keyBytes[i % 32];
    }
    
    // Prepend random nonce for layout compatibility
    const nonce = randomBytes(24);
    return bs58.encode(new Uint8Array([...nonce, ...enc]));
  }

  /**
   * Decrypts an ephemeral private key from encrypted payload.
   * 
   * Reverses the encryption process using ECDH shared secret. Verifies
   * integrity by checking that the decrypted public key matches the
   * provided ephemeral public key.
   * 
   * @param {string} encodedPayload - Base58-encoded encrypted payload
   * @param {string|Uint8Array} metaViewPriv - Meta view private key
   * @param {string|Uint8Array} ephPub - Expected ephemeral public key
   * @returns {Promise<Uint8Array>} 32-byte ephemeral private key
   * @throws {Error} If decryption fails or public key mismatch
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const decrypted = await pivy.decryptEphemeralPrivKey(
   *   encryptedPayload,
   *   metaViewPrivateKey,
   *   ephemeralPublicKey
   * );
   */
  async decryptEphemeralPrivKey(encodedPayload, metaViewPriv, ephPub) {
    const payload = bs58.decode(encodedPayload);
    const encrypted = payload.slice(24); // Skip 24-byte nonce
    
    const shared = secp.getSharedSecret(this.to32u8(metaViewPriv), this.to32u8(ephPub), true);
    const keyBytes = sha256(shared.slice(1));
    
    // XOR decryption
    const dec = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      dec[i] = encrypted[i] ^ keyBytes[i % 32];
    }
    
    // Verify integrity
    const ephPriv32 = dec.slice(0, 32);
    const receivedPub = dec.slice(32);
    const computedPub = secp.getPublicKey(ephPriv32, true);
    
    if (!computedPub.every((b, i) => b === receivedPub[i])) {
      throw new Error('Decryption failed – ephemeral public key mismatch');
    }
    
    return ephPriv32;
  }

  /**
   * Encrypts a private note using ECDH shared secret.
   * 
   * Creates a shared encryption key between ephemeral private key and
   * meta view public key, then XOR-encrypts the UTF-8 plaintext.
   * 
   * @param {string} plaintext - UTF-8 message to encrypt
   * @param {string|Uint8Array} ephPriv32 - 32-byte ephemeral private key
   * @param {string|Uint8Array} metaViewPub - 33-byte meta view public key
   * @returns {Promise<Uint8Array>} Encrypted note with 24-byte nonce prefix
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const note = "🎉 Secret payment message";
   * const encrypted = await pivy.encryptNote(note, ephPriv, metaViewPub);
   */
  async encryptNote(plaintext, ephPriv32, metaViewPub) {
    const shared = secp.getSharedSecret(this.to32u8(ephPriv32), this.to32u8(metaViewPub), true);
    const keyBytes = sha256(shared.slice(1));
    
    const plaintextBytes = new TextEncoder().encode(plaintext);
    
    // XOR encryption
    const enc = new Uint8Array(plaintextBytes.length);
    for (let i = 0; i < plaintextBytes.length; i++) {
      enc[i] = plaintextBytes[i] ^ keyBytes[i % 32];
    }
    
    // Prepend random nonce
    const nonce = randomBytes(24);
    return new Uint8Array([...nonce, ...enc]);
  }

  /**
   * Decrypts a private note using ECDH shared secret.
   * 
   * Derives the same shared encryption key used for encryption and
   * XOR-decrypts the ciphertext back to UTF-8 plaintext.
   * 
   * @param {Uint8Array} encryptedBytes - Encrypted note with nonce prefix
   * @param {string|Uint8Array} metaViewPriv - Meta view private key
   * @param {string|Uint8Array} ephPub - Ephemeral public key
   * @returns {Promise<string>} Decrypted UTF-8 message
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const decrypted = await pivy.decryptNote(
   *   encryptedBytes,
   *   metaViewPrivateKey,
   *   ephemeralPublicKey
   * );
   * console.log(decrypted); // "🎉 Secret payment message"
   */
  async decryptNote(encryptedBytes, metaViewPriv, ephPub) {
    const encrypted = encryptedBytes.slice(24); // Skip 24-byte nonce
    
    const shared = secp.getSharedSecret(this.to32u8(metaViewPriv), this.to32u8(ephPub), true);
    const keyBytes = sha256(shared.slice(1));
    
    // XOR decryption
    const dec = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      dec[i] = encrypted[i] ^ keyBytes[i % 32];
    }
    
    return new TextDecoder().decode(dec);
  }

  /*──────────────────────────────────────────────────────────────────*/
  /*  Stealth Address System                                          */
  /*──────────────────────────────────────────────────────────────────*/

  /**
   * Generates a stealth address from meta public keys (payer side).
   * 
   * This function is used by payers to create stealth addresses without
   * needing any private keys. Uses elliptic curve point addition:
   * StealthPublicKey = MetaSpendPublicKey + (tweak * G)
   * 
   * The tweak is derived from ECDH shared secret between ephemeral private
   * key and meta view public key, ensuring only the receiver can derive
   * the corresponding private key.
   * 
   * SECURITY: This function only uses PUBLIC keys - no private keys from receiver!
   * 
   * @param {string} metaSpendPubB58 - Base58-encoded meta spend public key
   * @param {string} metaViewPubB58 - Base58-encoded meta view public key  
   * @param {string|Uint8Array} ephPriv32 - 32-byte ephemeral private key
   * @returns {Promise<Object>} Stealth address information
   * @returns {string} returns.stealthPubKeyB58 - Base58-encoded stealth public key
   * @returns {string} returns.stealthAptosAddress - Aptos address format
   * @returns {Uint8Array} returns.stealthPubKeyBytes - Raw public key bytes
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const ephPriv = randomBytes(32);
   * const stealth = await pivy.deriveStealthPub(
   *   receiverMetaSpendPub,
   *   receiverMetaViewPub,
   *   ephPriv
   * );
   * console.log("Send funds to:", stealth.stealthAptosAddress);
   */
  async deriveStealthPub(metaSpendPubB58, metaViewPubB58, ephPriv32) {
    // Calculate shared secret and derive tweak
    const shared = secp.getSharedSecret(this.to32u8(ephPriv32), this.to32u8(metaViewPubB58), true);
    const tweak = sha256(shared.slice(1));
    
    // Convert tweak to scalar
    const tweakScalar = BigInt('0x' + Buffer.from(tweak).toString('hex')) % secp.CURVE.n;
    
    // Point arithmetic: StealthPub = MetaSpendPub + tweak * G
    const tweakPoint = secp.Point.BASE.multiply(tweakScalar);
    const metaSpendPoint = secp.Point.fromHex(this.to32u8(metaSpendPubB58));
    const stealthPoint = metaSpendPoint.add(tweakPoint);
    
    // Convert to compressed bytes
    const stealthPubKeyBytes = stealthPoint.toRawBytes(true);
    
    // ✅ Use our fixed custom derivation (should now match SDK exactly)
    const stealthAptosAddress = this.secp256k1PointToAptosAddress(stealthPubKeyBytes);
    
    return {
      stealthPubKeyB58: bs58.encode(stealthPubKeyBytes),
      stealthAptosAddress,
      stealthPubKeyBytes
    };
  }

  /**
   * Recovers stealth keypair from meta private keys (receiver side).
   * 
   * This function is used by receivers to derive the private key for
   * a stealth address. Uses scalar arithmetic:
   * StealthPrivateKey = MetaSpendPrivateKey + tweak (mod n)
   * 
   * Only the receiver possessing both meta private keys can perform
   * this derivation, ensuring payment privacy and security.
   * 
   * @param {string|Uint8Array} metaSpendPriv - Meta spend private key
   * @param {string|Uint8Array} metaViewPriv - Meta view private key
   * @param {string|Uint8Array} ephPub - Ephemeral public key from payment
   * @returns {Promise<Object>} Stealth keypair and utilities
   * @returns {Account} returns.account - Aptos-compatible account
   * @returns {string} returns.stealthAddress - Aptos address
   * @returns {Uint8Array} returns.privateKey - Raw private key bytes
   * @returns {Function} returns.toAptosAddress - Get address function
   * @returns {Function} returns.publicKeyBase58 - Get public key function
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const stealthKP = await pivy.deriveStealthKeypair(
   *   metaSpendPrivateKey,
   *   metaViewPrivateKey,
   *   ephemeralPublicKey
   * );
   * 
   * // Use with Aptos transactions
   * const payload = { ... };
   * const txnRequest = await client.generateTransaction(address, payload);
   * const signedTxn = await client.signTransaction(stealthKP.aptosAccount, txnRequest);
   */
  async deriveStealthKeypair(metaSpendPriv, metaViewPriv, ephPub) {
    // Calculate the same shared secret and tweak as payer
    const shared = secp.getSharedSecret(this.to32u8(metaViewPriv), this.to32u8(ephPub), true);
    const tweak = sha256(shared.slice(1));
    
    // Convert to scalars
    const tweakScalar = BigInt('0x' + Buffer.from(tweak).toString('hex')) % secp.CURVE.n;
    
    const metaSpendPrivBytes = this.to32u8(metaSpendPriv);
    const metaSpendScalar = BigInt('0x' + Buffer.from(metaSpendPrivBytes).toString('hex')) % secp.CURVE.n;
    
    // Scalar arithmetic: StealthPriv = MetaSpendPriv + tweak
    const stealthPrivScalar = (metaSpendScalar + tweakScalar) % secp.CURVE.n;
    
    // Convert scalar back to 32-byte private key
    const stealthPrivBytes = new Uint8Array(32);
    const scalarHex = stealthPrivScalar.toString(16).padStart(64, '0');
    for (let i = 0; i < 32; i++) {
      stealthPrivBytes[i] = parseInt(scalarHex.slice(i * 2, i * 2 + 2), 16);
    }
    
    // Derive public key and create Aptos-compatible objects
    const stealthPubKeyBytes = secp.getPublicKey(stealthPrivBytes, true);
    const privateKey = new Secp256k1PrivateKey(stealthPrivBytes);
    const account = Account.fromPrivateKey({ privateKey });
    
    // ✅ Use SDK for address derivation - this ensures wallet compatibility
    const stealthAddress = account.accountAddress.toString();
    
    return {
      account,
      stealthAddress,
      privateKey: stealthPrivBytes,
      
      // Helper methods for compatibility
      toAptosAddress: () => stealthAddress,
      publicKeyBase58: () => bs58.encode(stealthPubKeyBytes)
    };
  }

  /*──────────────────────────────────────────────────────────────────*/
  /*  Utility Functions                                               */
  /*──────────────────────────────────────────────────────────────────*/

  /**
   * Generates a new set of meta keys for stealth address usage.
   * 
   * Creates both spend and view keypairs required for the stealth
   * address system. These should be generated once and stored securely.
   * 
   * @returns {Object} Meta keypair set
   * @returns {Account} returns.metaSpend - Spend account
   * @returns {Account} returns.metaView - View account
   * @returns {string} returns.metaSpendPubB58 - Base58 spend public key
   * @returns {string} returns.metaViewPubB58 - Base58 view public key
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const metaKeys = pivy.generateMetaKeys();
   * // Store these securely for stealth address usage
   * console.log("Spend Public:", metaKeys.metaSpendPubB58);
   * console.log("View Public:", metaKeys.metaViewPubB58);
   */
  generateMetaKeys() {
    const metaSpend = Account.generate({ scheme: SigningSchemeInput.Secp256k1Ecdsa });
    const metaView = Account.generate({ scheme: SigningSchemeInput.Secp256k1Ecdsa });
    
    return {
      metaSpend,
      metaView,
      metaSpendPubB58: bs58.encode(this.getPubBytes(metaSpend)),
      metaViewPubB58: bs58.encode(this.getPubBytes(metaView))
    };
  }

  /**
   * Generates a new ephemeral keypair for a stealth payment.
   * 
   * Creates a one-time keypair used for this specific payment.
   * The private key is used by the payer, and the public key
   * is shared with the receiver for key derivation.
   * 
   * @returns {Object} Ephemeral keypair information
   * @returns {Account} returns.account - Full account object
   * @returns {Uint8Array} returns.privateKey - 32-byte private key
   * @returns {string} returns.publicKeyB58 - Base58 public key
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const ephemeral = pivy.generateEphemeralKey();
   * const stealth = await pivy.deriveStealthPub(
   *   metaSpendPub,
   *   metaViewPub,
   *   ephemeral.privateKey
   * );
   */
  generateEphemeralKey() {
    const account = Account.generate({ scheme: SigningSchemeInput.Secp256k1Ecdsa });
    const privateKey = account.privateKey.toUint8Array();
    const publicKeyB58 = bs58.encode(this.getPubBytes(account));
    
    return {
      account,
      privateKey,
      publicKeyB58
    };
  }

  /**
   * Validates that two stealth addresses match (payer vs receiver derivation).
   * 
   * Useful for testing and verification that both parties derived
   * the same stealth address from the same inputs.
   * 
   * @param {string} payerAddress - Address computed by payer
   * @param {string} receiverAddress - Address computed by receiver
   * @returns {boolean} True if addresses match
   * 
   * @example
   * const pivy = new PivyStealthAptos();
   * const payerStealth = await pivy.deriveStealthPub(...);
   * const receiverStealth = await pivy.deriveStealthKeypair(...);
   * const valid = pivy.validateStealthMatch(
   *   payerStealth.stealthAptosAddress,
   *   receiverStealth.stealthAddress
   * );
   */
  validateStealthMatch(payerAddress, receiverAddress) {
    return payerAddress === receiverAddress;
  }

  /*──────────────────────────────────────────────────────────────────*/
  /*  Static Methods (for backward compatibility)                     */
  /*──────────────────────────────────────────────────────────────────*/

  static getPrivBytes(account) {
    return new PivyStealthAptos().getPrivBytes(account);
  }

  static getPubBytes(account) {
    return new PivyStealthAptos().getPubBytes(account);
  }

  static toBytes(str) {
    return new PivyStealthAptos().toBytes(str);
  }

  static pad32(u8) {
    return new PivyStealthAptos().pad32(u8);
  }

  static to32u8(raw) {
    return new PivyStealthAptos().to32u8(raw);
  }

  static secp256k1PointToAptosAddress(point) {
    return new PivyStealthAptos().secp256k1PointToAptosAddress(point);
  }

  static async encryptEphemeralPrivKey(ephPriv32, metaViewPub) {
    return new PivyStealthAptos().encryptEphemeralPrivKey(ephPriv32, metaViewPub);
  }

  static async decryptEphemeralPrivKey(encodedPayload, metaViewPriv, ephPub) {
    return new PivyStealthAptos().decryptEphemeralPrivKey(encodedPayload, metaViewPriv, ephPub);
  }

  static async encryptNote(plaintext, ephPriv32, metaViewPub) {
    return new PivyStealthAptos().encryptNote(plaintext, ephPriv32, metaViewPub);
  }

  static async decryptNote(encryptedBytes, metaViewPriv, ephPub) {
    return new PivyStealthAptos().decryptNote(encryptedBytes, metaViewPriv, ephPub);
  }

  static async deriveStealthPub(metaSpendPubB58, metaViewPubB58, ephPriv32) {
    return new PivyStealthAptos().deriveStealthPub(metaSpendPubB58, metaViewPubB58, ephPriv32);
  }

  static async deriveStealthKeypair(metaSpendPriv, metaViewPriv, ephPub) {
    return new PivyStealthAptos().deriveStealthKeypair(metaSpendPriv, metaViewPriv, ephPub);
  }

  static generateMetaKeys() {
    return new PivyStealthAptos().generateMetaKeys();
  }

  static generateEphemeralKey() {
    return new PivyStealthAptos().generateEphemeralKey();
  }

  static validateStealthMatch(payerAddress, receiverAddress) {
    return new PivyStealthAptos().validateStealthMatch(payerAddress, receiverAddress);
  }
}

/*──────────────────────────────────────────────────────────────────*/
/*  Legacy Function Exports (for backward compatibility)            */
/*──────────────────────────────────────────────────────────────────*/

export const getPrivBytes = PivyStealthAptos.getPrivBytes;
export const getPubBytes = PivyStealthAptos.getPubBytes;
export const toBytes = PivyStealthAptos.toBytes;
export const pad32 = PivyStealthAptos.pad32;
export const to32u8 = PivyStealthAptos.to32u8;
export const secp256k1PointToAptosAddress = PivyStealthAptos.secp256k1PointToAptosAddress;
export const encryptEphemeralPrivKey = PivyStealthAptos.encryptEphemeralPrivKey;
export const decryptEphemeralPrivKey = PivyStealthAptos.decryptEphemeralPrivKey;
export const encryptNote = PivyStealthAptos.encryptNote;
export const decryptNote = PivyStealthAptos.decryptNote;
export const deriveStealthPub = PivyStealthAptos.deriveStealthPub;
export const deriveStealthKeypair = PivyStealthAptos.deriveStealthKeypair;
export const generateMetaKeys = PivyStealthAptos.generateMetaKeys;
export const generateEphemeralKey = PivyStealthAptos.generateEphemeralKey;
export const validateStealthMatch = PivyStealthAptos.validateStealthMatch;

// Export all functions as default object for convenience (backward compatibility)
export default PivyStealthAptos;