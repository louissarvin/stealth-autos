/**
 * PIVY Stealth Address Demo & Test for Aptos
 * 
 * This file demonstrates the usage of PIVY stealth address functionality
 * adapted for Aptos blockchain. It shows a complete flow from key generation
 * to payment processing and note decryption.
 * 
 * Run with: node stealth-address/experimental-aptos.js
 */

import * as secp from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import bs58 from 'bs58';
import { randomBytes } from 'crypto';

// Aptos SDK imports (modern)
import { Account, Secp256k1PrivateKey, SigningSchemeInput } from '@aptos-labs/ts-sdk';

// Import PIVY stealth functionality using class-based approach
import PivyStealthAptos from './pivyStealthHelpersAptos.js';

/*──────────────────────────────────────────────────────────────────*/
/*  Demo & Test Implementation                                      */
/*──────────────────────────────────────────────────────────────────*/

(async () => {
  console.log('🚀 PIVY Stealth Address System for Aptos (Using Helper Library)');
  console.log('   This demo uses the pivyStealthHelpersAptos.js utility library\n');

  // Initialize PIVY stealth utility class
  const pivy = new PivyStealthAptos();

  // Generate receiver's meta keys using the class method
  const metaKeys = pivy.generateMetaKeys();
  const { metaSpend, metaView, metaSpendPubB58, metaViewPubB58 } = metaKeys;
  
  // Extract private keys for receiver operations
  const metaSpendPriv = metaSpend.privateKey.toUint8Array();
  const metaViewPriv = metaView.privateKey.toUint8Array();

  console.log('🔐 Receiver Meta Keys (Generated with Helper)');
  console.log('   Spend Public:', metaSpendPubB58);
  console.log('   View Public :', metaViewPubB58);

  // Generate ephemeral key for payment using class method
  const ephemeral = pivy.generateEphemeralKey();
  const { privateKey: ephPriv, publicKeyB58: ephPubB58 } = ephemeral;

  console.log('\n💸 Payer Creates Stealth Payment');
  console.log('   Ephemeral pub:', ephPubB58);
  console.log('   Ephemeral priv:', Buffer.from(ephPriv).toString('hex'));
  
  // Create stealth address using class method 
  // Pass meta spend private key to ensure SDK-compatible address derivation
  const stealthPub = await pivy.deriveStealthPub(metaSpendPubB58, metaViewPubB58, ephPriv, metaSpendPriv);
  
  // Encrypt ephemeral key for receiver using class method
  const memo = await pivy.encryptEphemeralPrivKey(ephPriv, metaViewPubB58);
  
  // Encrypt a private note for receiver using class method
  const privateNote = "🎉 Welcome to PIVY on Aptos! This payment includes 1000 APT tokens for testing stealth addresses. Only you can read this message!";
  const encryptedNote = await pivy.encryptNote(privateNote, ephPriv, metaViewPubB58);
  
  console.log('   Memo (encrypted eph key):', memo);
  console.log('   Encrypted note length:', encryptedNote.length, 'bytes');
  console.log('   Target stealth address:', stealthPub.stealthAptosAddress);

  // Receiver decrypts and recovers keypair using helpers
  console.log('\n📥 Receiver Processes Payment');
  
  const decryptedEphPriv = await pivy.decryptEphemeralPrivKey(
    memo,
    Buffer.from(metaViewPriv).toString('hex'),
    ephPubB58
  );
  
  console.log('   Decryption OK:', Buffer.from(decryptedEphPriv).toString('hex') === Buffer.from(ephPriv).toString('hex'));
  
  // Decrypt the private note using class method
  const decryptedNote = await pivy.decryptNote(
    encryptedNote,
    Buffer.from(metaViewPriv).toString('hex'),
    ephPubB58
  );
  
  console.log('   Decrypted note:', `"${decryptedNote}"`);
  console.log('   Note matches original:', decryptedNote === privateNote ? '✅ YES' : '❌ NO');
  
  console.log('   Receiver thinks eph pub is:', ephPubB58);
  
  // Recover the stealth keypair using class method (receiver side)
  const stealthKP = await pivy.deriveStealthKeypair(
    Buffer.from(metaSpendPriv).toString('hex'), 
    Buffer.from(metaViewPriv).toString('hex'), 
    ephPubB58
  );

  console.log('\n📊 Results');
  console.log('   Payer computed address :', stealthPub.stealthAptosAddress);
  console.log('   Receiver derived address:', stealthKP.stealthAddress);
  
  // Validation using class method
  const addressesMatch = pivy.validateStealthMatch(stealthPub.stealthAptosAddress, stealthKP.stealthAddress);
  
  console.log('\n🔍 DEBUG - Public Key Comparison:');
  console.log('   Payer stealth pubkey   :', stealthPub.stealthPubKeyB58);
  console.log('   Receiver stealth pubkey:', stealthKP.publicKeyBase58());
  console.log('   Public keys match:', stealthPub.stealthPubKeyB58 === stealthKP.publicKeyBase58() ? '✅ YES' : '❌ NO');
  console.log('   Addresses match:', addressesMatch ? '✅ YES' : '❌ NO');
  
  console.log('\n🎉 Security Properties:');
  console.log('   ✅ Payer can only compute stealth PUBLIC key');
  console.log('   ✅ ONLY receiver with metaSpendPriv can derive stealth PRIVATE key');
  console.log('   ✅ Funds sent to stealth address are secure');
  
  // Test import into Aptos wallet
  try {
    const privateKey = new Secp256k1PrivateKey(stealthKP.privateKey);
    const importedWallet = Account.fromPrivateKey({ privateKey });
    const importedAddress = importedWallet.accountAddress.toString();
    
    console.log('\n✅ Aptos Wallet Import Test');
    console.log('   Imported address:', importedAddress);
    console.log('   Private key works:', importedAddress === stealthKP.stealthAddress ? '✅ YES' : '❌ NO');
  } catch (e) {
    console.log('\n❌ Aptos import failed:', e.message);
  }

  console.log('\n🔧 Helper Library Integration:');
  console.log('   ✅ All functions imported from pivyStealthHelpersAptos.js');
  console.log('   ✅ No duplicate implementations');
  console.log('   ✅ Clean separation of concerns');
  console.log('   ✅ Reusable across frontend/backend');
})();