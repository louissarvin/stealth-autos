/**
 * PIVY Stealth Address Flow for Aptos - FungibleAsset (USDC) Only
 * 
 * This script demonstrates the stealth address flow specifically for FungibleAsset tokens:
 * 1. Ed25519 payer account (user's normal funded wallet)
 * 2. Generate secp256k1 meta keys for receiver (one-time setup)
 * 3. Ed25519 payer uses secp256k1 crypto to generate stealth address
 * 4. Ed25519 payer sends USDC (FungibleAsset) to stealth address
 * 5. secp256k1 receiver derives stealth private key
 * 6. secp256k1 receiver withdraws to Ed25519 final destination
 * 
 * FungibleAsset Benefits:
 * - Stealth address receives USDC but has 0 APT for gas
 * - Uses pay_fa() and withdraw_fa() functions without type arguments
 * - Requires sponsored transaction for withdrawal
 * - Advanced gas management with sponsor pattern
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey, Secp256k1PrivateKey, SigningSchemeInput } from '@aptos-labs/ts-sdk';
import bs58 from 'bs58';

// Import PIVY stealth functionality
import PivyStealthAptos from './pivyStealthHelpersAptos.js';

/*──────────────────────────────────────────────────────────────────*/
/*  Configuration                                                   */
/*──────────────────────────────────────────────────────────────────*/

const CONFIG = {
  /** Network configuration - Using TESTNET */
  NETWORK: Network.TESTNET,

  /** PIVY Stealth Smart Contract Configuration */
  PIVY_STEALTH: {
    packageId: '0xc0d64666b049e1412b7bcd74d0d20b34a10d12f76555843be78f1bb5bd126ee1',
    moduleName: 'pivy_stealth',
    fnPayFa: 'pay_fa',
    fnWithdrawFa: 'withdraw_fa',
  },
  /** Ed25519 accounts (user's normal wallets) */
  PAYER_ED25519_PRIVATE_KEY: "0xYourPrivateKey1ToFundStealthAddress", // Your funded account
  RECEIVER_ED25519_PRIVATE_KEY: "0xYourPrivateKey2ToReceiveStealthPayments", // Your destination account

  /** FungibleAsset Configuration - USDC Only */
  ASSET_TYPE: '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832', // USDC FA
  PAY_AMOUNT: 1000000n, // 1 USDC (6 decimals)
  WITHDRAW_AMOUNT: 1000000n, // 1 USDC (full withdrawal)

  /** Demo data */
  LABEL_STR: 'PIVY_FUNGIBLEASSET_USDC_DEMO_V1',
  PAYLOAD_STR: 'FungibleAsset flow: USDC with sponsored transaction withdrawal!',
  PRIVATE_NOTE: '🪙 FungibleAsset Demo! Ed25519 payer → secp256k1 stealth → Ed25519 receiver with USDC!',
};

/*──────────────────────────────────────────────────────────────────*/
/*  Helper Utils                                                    */
/*──────────────────────────────────────────────────────────────────*/

const utf8 = new TextEncoder();
const toBytes = (str) => utf8.encode(str);
const pad32 = (u8) => {
  const out = new Uint8Array(32);
  out.set(u8.slice(0, 32));
  return out;
};

/*──────────────────────────────────────────────────────────────────*/
/*  Main FungibleAsset Demo Flow                                    */
/*──────────────────────────────────────────────────────────────────*/

(async () => {
  console.log('🪙 PIVY Stealth Address Flow Demo for Aptos - FungibleAsset (USDC)');
  console.log('   Ed25519 User Wallets + secp256k1 Stealth Cryptography');
  console.log('   🎯 FungibleAsset Focus: Sponsored transaction withdrawal\\n');

  /*────────────────────────────────────────────────────────────────*/
  /*  Step 1: Setup Ed25519 User Accounts + secp256k1 Crypto        */
  /*────────────────────────────────────────────────────────────────*/

  // Initialize PIVY stealth utility class
  const pivy = new PivyStealthAptos();
  
  // Initialize Aptos client
  const config = new AptosConfig({ network: CONFIG.NETWORK });
  const aptos = new Aptos(config);

  // Load Ed25519 user accounts (normal wallets)
  const payerEd25519PrivKey = new Ed25519PrivateKey(CONFIG.PAYER_ED25519_PRIVATE_KEY);
  const receiverEd25519PrivKey = new Ed25519PrivateKey(CONFIG.RECEIVER_ED25519_PRIVATE_KEY);
  
  const payerEd25519Account = Account.fromPrivateKey({ privateKey: payerEd25519PrivKey });
  const receiverEd25519Account = Account.fromPrivateKey({ privateKey: receiverEd25519PrivKey });
  
  const payerAddr = payerEd25519Account.accountAddress.toString();
  const receiverAddr = receiverEd25519Account.accountAddress.toString();

  // Generate secp256k1 meta keys for receiver (one-time setup)
  console.log('[Step 1]: Account setup and secp256k1 meta key generation');
  const metaKeys = pivy.generateMetaKeys();
  const { metaSpend, metaView, metaSpendPubB58, metaViewPubB58 } = metaKeys;
  
  // Extract private keys for receiver operations
  const metaSpendPriv = metaSpend.privateKey.toUint8Array();
  const metaViewPriv = metaView.privateKey.toUint8Array();

  console.log('   💼 Ed25519 User Accounts:');
  console.log(`      Payer: ${payerAddr}`);
  console.log(`      Receiver: ${receiverAddr}`);
  console.log('   🔐 secp256k1 Meta Keys (for stealth crypto):');
  console.log(`      Spend Public: ${metaSpendPubB58}`);
  console.log(`      View Public: ${metaViewPubB58}`);
  
  console.log('   🪙 FungibleAsset Configuration:');
  console.log(`      Asset: ${CONFIG.ASSET_TYPE}`);
  console.log(`      Type: FungibleAsset (USDC)`);
  console.log(`      Functions: pay_fa() / withdraw_fa()`);
  console.log(`      Gas Strategy: Sponsored Transaction`);

  // Check Ed25519 account balances  
  const payerBalance = await aptos.getAccountAPTAmount({ accountAddress: payerAddr });
  console.log(`   💰 Payer APT balance: ${payerBalance} octas (${payerBalance / 100_000_000} APT)`);
  console.log(`   💡 Note: Stealth address will receive USDC but 0 APT - needs sponsored withdrawal`);

  /*────────────────────────────────────────────────────────────────*/
  /*  Step 2: Ed25519 Payer Uses secp256k1 Crypto for Stealth       */
  /*────────────────────────────────────────────────────────────────*/

  console.log('\\n[Step 2]: Ed25519 payer generates stealth address using secp256k1 crypto');
  
  // Generate ephemeral keypair using secp256k1 crypto
  const ephemeral = pivy.generateEphemeralKey();
  const { privateKey: ephPriv, publicKeyB58: ephPubB58 } = ephemeral;

  // Ed25519 payer uses secp256k1 crypto to generate stealth address
  const stealthPub = await pivy.deriveStealthPub(metaSpendPubB58, metaViewPubB58, ephPriv);
  
  // Encrypt data for receiver
  const encryptedMemo = await pivy.encryptEphemeralPrivKey(ephPriv, metaViewPubB58);
  const encryptedNote = await pivy.encryptNote(CONFIG.PRIVATE_NOTE, ephPriv, metaViewPubB58);

  console.log('   🎯 Stealth address generated:', stealthPub.stealthAptosAddress);
  console.log('   🔒 Memo and note encrypted for receiver');
  console.log('   💡 Ed25519 payer successfully used secp256k1 cryptography!');

  /*────────────────────────────────────────────────────────────────*/
  /*  Step 3: Ed25519 Payer Sends USDC to Stealth Address          */
  /*────────────────────────────────────────────────────────────────*/

  console.log('\\n[Step 3]: Ed25519 payer sends USDC (FungibleAsset) to stealth address');

  const labelBytes = pad32(toBytes(CONFIG.LABEL_STR));
  const payloadBytes = toBytes(CONFIG.PAYLOAD_STR);

  console.log('   🔄 Using pay_fa() for FungibleAsset without type arguments');
  const payTransaction = await aptos.transaction.build.simple({
    sender: payerAddr,
    data: {
      function: `${CONFIG.PIVY_STEALTH.packageId}::${CONFIG.PIVY_STEALTH.moduleName}::${CONFIG.PIVY_STEALTH.fnPayFa}`,
      functionArguments: [
        stealthPub.stealthAptosAddress,      // stealth_owner
        CONFIG.ASSET_TYPE,                   // fa_metadata
        CONFIG.PAY_AMOUNT,                   // amount
        Array.from(labelBytes),              // label
        Array.from(bs58.decode(ephPubB58)),  // eph_pubkey
        Array.from(payloadBytes),            // payload
        Array.from(encryptedNote),           // note
      ],
    },
  });
  
  const payRes = await aptos.signAndSubmitTransaction({
    signer: payerEd25519Account,
    transaction: payTransaction,
  });

  await aptos.waitForTransaction({ transactionHash: payRes.hash });
  
  console.log('   ✅ Payment sent successfully!');
  console.log(`   📋 Transaction: ${payRes.hash}`);
  console.log(`   💡 Ed25519 account successfully sent USDC to stealth address!`);
  console.log(`   🔧 Function used: pay_fa() without type arguments`);
  console.log('   💡 Note: Stealth address received USDC but 0 APT - will need sponsored withdrawal');

  /*────────────────────────────────────────────────────────────────*/
  /*  Step 4: Receiver Processes Payment (secp256k1 Crypto)        */
  /*────────────────────────────────────────────────────────────────*/

  console.log('\\n[Step 4]: Receiver processes payment using secp256k1 crypto');
  
  // Decrypt the private note
  const decryptedNote = await pivy.decryptNote(
    encryptedNote,
    Buffer.from(metaViewPriv).toString('hex'),
    ephPubB58
  );
  
  console.log(`   📝 Decrypted note: "${decryptedNote}"`);
  console.log('   🔓 Note decryption:', decryptedNote === CONFIG.PRIVATE_NOTE ? '✅ SUCCESS' : '❌ FAILED');

  // Derive secp256k1 stealth keypair for withdrawal
  const stealthKP = await pivy.deriveStealthKeypair(
    Buffer.from(metaSpendPriv).toString('hex'), 
    Buffer.from(metaViewPriv).toString('hex'), 
    ephPubB58
  );

  console.log('   🔑 Stealth keypair derived from secp256k1 meta keys');
  console.log('   🏠 Address match:', stealthKP.stealthAddress === stealthPub.stealthAptosAddress ? '✅ PERFECT' : '❌ ERROR');

  /*────────────────────────────────────────────────────────────────*/
  /*  Step 5: secp256k1 Stealth Account Withdraws to Ed25519       */
  /*────────────────────────────────────────────────────────────────*/

  console.log('\\n[Step 5]: secp256k1 stealth account withdraws to Ed25519 destination');

  // Check stealth APT balance (should be 0 for FungibleAsset)
  const stealthBalance = await aptos.getAccountAPTAmount({
    accountAddress: stealthPub.stealthAptosAddress,
  });
  console.log(`   💰 Stealth APT balance: ${stealthBalance} octas (${stealthBalance / 100_000_000} APT)`);

  console.log('   🎯 FungibleAsset withdrawal - using sponsored transaction');
  console.log('   💸 Sponsor pays gas, stealth address signs withdrawal');
  
  // Build withdrawal transaction with fee payer
  const withdrawTransaction = await aptos.transaction.build.simple({
    sender: stealthPub.stealthAptosAddress,
    withFeePayer: true, // Enable sponsored transaction
    data: {
      function: `${CONFIG.PIVY_STEALTH.packageId}::${CONFIG.PIVY_STEALTH.moduleName}::${CONFIG.PIVY_STEALTH.fnWithdrawFa}`,
      functionArguments: [
        CONFIG.ASSET_TYPE,          // fa_metadata
        CONFIG.WITHDRAW_AMOUNT,     // amount
        receiverAddr,               // destination
      ],
    },
  });

  // Sign with stealth address (sender)
  const senderAuthenticator = aptos.transaction.sign({
    signer: stealthKP.account, // Stealth address signs
    transaction: withdrawTransaction,
  });

  // Sign with receiver sponsor (fee payer)
  const feePayerAuthenticator = aptos.transaction.signAsFeePayer({
    signer: payerEd25519Account, // Sponsor pays gas
    transaction: withdrawTransaction,
  });

  // Submit transaction with both signatures
  const withdrawRes = await aptos.transaction.submit.simple({
    transaction: withdrawTransaction,
    senderAuthenticator: senderAuthenticator,
    feePayerAuthenticator: feePayerAuthenticator,
  });

  await aptos.waitForTransaction({ transactionHash: withdrawRes.hash });

  console.log('   ✅ Withdrawal completed!');
  console.log(`   📋 Transaction: ${withdrawRes.hash}`);
  console.log(`   💡 secp256k1 stealth → Ed25519 receiver USDC transfer successful!`);
  console.log(`   🔧 Function used: withdraw_fa() without type arguments`);
  console.log('   💸 Gas paid by: Receiver sponsor account (sponsored transaction)');

  /*────────────────────────────────────────────────────────────────*/
  /*  Step 6: Verification and Summary                             */
  /*────────────────────────────────────────────────────────────────*/

  console.log('\\n[Step 6]: Verification and summary');

  // Check final balances
  const finalReceiverBalance = await aptos.getAccountAPTAmount({ accountAddress: receiverAddr });
  const finalStealthBalance = await aptos.getAccountAPTAmount({ accountAddress: stealthPub.stealthAptosAddress });
  
  console.log(`   💰 Final receiver APT balance: ${finalReceiverBalance} octas (${finalReceiverBalance / 100_000_000} APT)`);
  console.log(`   💰 Final stealth APT balance: ${finalStealthBalance} octas (should remain 0)`);
  console.log(`   💡 Note: USDC balance checking would require specific FA queries`);

  console.log('\\n🎉 PIVY FungibleAsset Stealth Flow Complete!');
  console.log('');
  console.log('✅ FungibleAsset (USDC) Specific Benefits Demonstrated:');
  console.log('   💼 Ed25519 accounts for user wallet management');
  console.log('   🔐 secp256k1 cryptography for stealth address math');
  console.log('   🪙 FungibleAsset token support without type arguments');
  console.log('   💸 Sponsored transaction pattern (stealth signs, sponsor pays)');
  console.log('   🔗 Advanced integration between systems');
  console.log('   🎯 Perfect address matching and privacy');
  console.log('   🔒 Complete note encryption/decryption');
  console.log('');
  console.log('📊 Flow Summary:');
  console.log(`   Ed25519 Payer     : ${payerAddr}`);
  console.log(`   Stealth Address   : ${stealthPub.stealthAptosAddress}`);
  console.log(`   Ed25519 Receiver  : ${receiverAddr}`);
  console.log(`   Gas Sponsor       : ${payerAddr}`);
  console.log(`   Payment TX        : ${payRes.hash}`);
  console.log(`   Withdrawal TX     : ${withdrawRes.hash}`);
  console.log(`   Private Message   : "${decryptedNote}"`);
  console.log('');
  console.log('💡 FungibleAsset Advantages:');
  console.log('   • No type arguments needed in function calls');
  console.log('   • Sponsored transaction pattern for gas-less withdrawal');
  console.log('   • Works with any FungibleAsset standard token');
  console.log('   • Flexible gas sponsorship by any account');
  console.log('   • Perfect for tokens where receiver has no native gas');
  console.log('');
  console.log('🎯 FungibleAsset Technical Details:');
  console.log(`   Asset Used: ${CONFIG.ASSET_TYPE}`);
  console.log(`   Payment Function: pay_fa() without type arguments`);
  console.log(`   Withdrawal Function: withdraw_fa() without type arguments`);
  console.log(`   Gas Strategy: Sponsored Transaction (sponsor pays gas)`);
  console.log(`   Amount Sent: ${CONFIG.PAY_AMOUNT / 1000000n} USDC`);
  console.log(`   Amount Withdrawn: ${CONFIG.WITHDRAW_AMOUNT / 1000000n} USDC`);
  console.log('');
  console.log('🔧 Sponsored Transaction Pattern:');
  console.log('   1. Build transaction with withFeePayer: true');
  console.log('   2. Stealth address signs as sender');
  console.log('   3. Sponsor account signs as fee payer');
  console.log('   4. Submit with both authenticators');
  console.log('   5. Stealth controls assets, sponsor pays gas');
})();