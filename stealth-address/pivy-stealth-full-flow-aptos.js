/**
 * PIVY Stealth Address Hybrid Flow for Aptos - Ed25519 + secp256k1 Crypto
 * 
 * This script demonstrates the optimal stealth address flow:
 * 1. Ed25519 payer account (user's normal funded wallet)
 * 2. Generate secp256k1 meta keys for receiver (one-time setup)
 * 3. Ed25519 payer uses secp256k1 crypto to generate stealth address
 * 4. Ed25519 payer sends APT to stealth address
 * 5. secp256k1 receiver derives stealth private key
 * 6. secp256k1 receiver withdraws to Ed25519 final destination
 * 
 * Benefits:
 * - Users keep their existing Ed25519 wallets
 * - No need to fund additional secp256k1 accounts
 * - Clean separation of account management and cryptography
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey, Secp256k1PrivateKey, SigningSchemeInput } from '@aptos-labs/ts-sdk';
import bs58 from 'bs58';

// Import PIVY stealth functionality using class-based approach
import PivyStealthAptos from './pivyStealthHelpersAptos.js';

/*──────────────────────────────────────────────────────────────────*/
/*  Configuration                                                   */
/*──────────────────────────────────────────────────────────────────*/

const CONFIG = {
  /** Network configuration - Using TESTNET */
  NETWORK: Network.TESTNET,

  /** Package ID containing the stealth payment module */
  PACKAGE_ID: '0xc0d64666b049e1412b7bcd74d0d20b34a10d12f76555843be78f1bb5bd126ee1',

  /** Module and function names */
  MODULE_NAME: 'pivy_stealth',
  FN_PAY: 'pay',
  FN_WITHDRAW: 'withdraw',

  /** Ed25519 accounts (user's normal wallets) */
  PAYER_ED25519_PRIVATE_KEY: "0xYourPrivateKey1ToFundedStealthAddress", // Your funded account
  RECEIVER_ED25519_PRIVATE_KEY: "0xYourPrivateKey2ToWithdrawFundsFromStealthAddress", // Your destination account

  /** Coin type and amounts */
  COIN_TYPE: '0x1::aptos_coin::AptosCoin',
  PAY_AMOUNT_OCTAS: 50_000_000n, // Amount to pay to stealth address 
  WITHDRAW_AMOUNT_OCTAS: 40_000_000n, // Amount to withdraw to Ed25519 destination

  /** Demo data */
  LABEL_STR: 'PIVY_HYBRID_DEMO_APTOS_V1',
  PAYLOAD_STR: 'Hybrid flow: Ed25519 wallets + secp256k1 crypto!',
  PRIVATE_NOTE: '🔗 Hybrid Flow Demo! Ed25519 payer → secp256k1 stealth → Ed25519 receiver. Best of both worlds!',
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
/*  Main Hybrid Demo Flow                                          */
/*──────────────────────────────────────────────────────────────────*/

(async () => {
  console.log('🔗 PIVY Stealth Address Hybrid Flow Demo for Aptos');
  console.log('   Ed25519 User Wallets + secp256k1 Stealth Cryptography\\n');

  /*────────────────────────────────────────────────────────────────*/
  /*  Step 1: Setup Ed25519 User Accounts + secp256k1 Crypto        */
  /*────────────────────────────────────────────────────────────────*/

  // Initialize PIVY stealth utility class
  const pivy = new PivyStealthAptos();

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

  // Initialize Aptos client
  const config = new AptosConfig({ network: CONFIG.NETWORK });
  const aptos = new Aptos(config);

  // Check Ed25519 account balances
  const payerBalance = await aptos.getAccountAPTAmount({ accountAddress: payerAddr });
  console.log(`   💰 Payer balance: ${payerBalance} octas (${payerBalance / 100_000_000} APT)`);

  /*────────────────────────────────────────────────────────────────*/
  /*  Step 2: Ed25519 Payer Uses secp256k1 Crypto for Stealth       */
  /*────────────────────────────────────────────────────────────────*/

  console.log('\\n[Step 2]: Ed25519 payer generates stealth address using secp256k1 crypto');
  
  // Generate ephemeral keypair using secp256k1 crypto
  const ephemeral = pivy.generateEphemeralKey();
  const { privateKey: ephPriv, publicKeyB58: ephPubB58 } = ephemeral;

  // Ed25519 payer uses secp256k1 crypto to generate stealth address
  const stealthPub = await pivy.deriveStealthPub(metaSpendPubB58, metaViewPubB58, ephPriv, metaSpendPriv);
  
  // Encrypt data for receiver
  const encryptedMemo = await pivy.encryptEphemeralPrivKey(ephPriv, metaViewPubB58);
  const encryptedNote = await pivy.encryptNote(CONFIG.PRIVATE_NOTE, ephPriv, metaViewPubB58);

  console.log('   🎯 Stealth address generated:', stealthPub.stealthAptosAddress);
  console.log('   🔒 Memo and note encrypted for receiver');
  console.log('   💡 Ed25519 payer successfully used secp256k1 cryptography!');

  /*────────────────────────────────────────────────────────────────*/
  /*  Step 3: Ed25519 Payer Sends APT to Stealth Address           */
  /*────────────────────────────────────────────────────────────────*/

  console.log('\\n[Step 3]: Ed25519 payer sends APT to stealth address');

  const labelBytes = pad32(toBytes(CONFIG.LABEL_STR));
  const payloadBytes = toBytes(CONFIG.PAYLOAD_STR);

  // Ed25519 payer sends payment to stealth address
  const payTransaction = await aptos.transaction.build.simple({
    sender: payerAddr,
    data: {
      function: `${CONFIG.PACKAGE_ID}::${CONFIG.MODULE_NAME}::${CONFIG.FN_PAY}`,
      typeArguments: [CONFIG.COIN_TYPE],
      functionArguments: [
        stealthPub.stealthAptosAddress,      // stealth_owner
        CONFIG.PAY_AMOUNT_OCTAS,             // amount
        Array.from(labelBytes),              // label
        Array.from(bs58.decode(ephPubB58)),  // eph_pubkey
        Array.from(payloadBytes),            // payload
        Array.from(encryptedNote),           // note
      ],
    },
  });

  const payRes = await aptos.signAndSubmitTransaction({
    signer: payerEd25519Account, // Ed25519 account signs the transaction
    transaction: payTransaction,
  });

  await aptos.waitForTransaction({ transactionHash: payRes.hash });
  
  console.log('   ✅ Payment sent successfully!');
  console.log(`   📋 Transaction: ${payRes.hash}`);
  console.log('   💡 Ed25519 account successfully sent to stealth address!');

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

  // Check stealth balance
  const stealthBalance = await aptos.getAccountAPTAmount({
    accountAddress: stealthPub.stealthAptosAddress,
  });
  console.log(`   💰 Stealth balance: ${stealthBalance} octas`);

  // secp256k1 stealth account withdraws to Ed25519 receiver
  const withdrawTransaction = await aptos.transaction.build.simple({
    sender: stealthPub.stealthAptosAddress, // secp256k1 stealth address
    data: {
      function: `${CONFIG.PACKAGE_ID}::${CONFIG.MODULE_NAME}::${CONFIG.FN_WITHDRAW}`,
      typeArguments: [CONFIG.COIN_TYPE],
      functionArguments: [
        CONFIG.WITHDRAW_AMOUNT_OCTAS,        // amount
        receiverAddr,                        // Ed25519 destination!
      ],
    },
  });

  const withdrawRes = await aptos.signAndSubmitTransaction({
    signer: stealthKP.account, // secp256k1 account signs withdrawal
    transaction: withdrawTransaction,
  });

  await aptos.waitForTransaction({ transactionHash: withdrawRes.hash });

  console.log('   ✅ Withdrawal completed!');
  console.log(`   📋 Transaction: ${withdrawRes.hash}`);
  console.log('   💡 secp256k1 stealth → Ed25519 receiver transfer successful!');

  /*────────────────────────────────────────────────────────────────*/
  /*  Step 6: Verification and Summary                             */
  /*────────────────────────────────────────────────────────────────*/

  console.log('\\n[Step 6]: Verification and summary');

  // Check final balances
  const finalReceiverBalance = await aptos.getAccountAPTAmount({ accountAddress: receiverAddr });
  console.log(`   💰 Final receiver balance: ${finalReceiverBalance} octas`);

  console.log('\\n🎉 PIVY Hybrid Stealth Flow Complete!');
  console.log('');
  console.log('✅ Hybrid Architecture Benefits Demonstrated:');
  console.log('   💼 Ed25519 accounts for user wallet management');
  console.log('   🔐 secp256k1 cryptography for stealth address math');
  console.log('   🔗 Seamless integration between both systems');
  console.log('   💰 No need to fund additional accounts');
  console.log('   🎯 Perfect address matching and privacy');
  console.log('   🔒 Complete note encryption/decryption');
  console.log('');
  console.log('📊 Flow Summary:');
  console.log(`   Ed25519 Payer     : ${payerAddr}`);
  console.log(`   Stealth Address   : ${stealthPub.stealthAptosAddress}`);
  console.log(`   Ed25519 Receiver  : ${receiverAddr}`);
  console.log(`   Payment TX        : ${payRes.hash}`);
  console.log(`   Withdrawal TX     : ${withdrawRes.hash}`);
  console.log(`   Private Message   : "${decryptedNote}"`);
  console.log('');
  console.log('💡 This hybrid approach is optimal because:');
  console.log('   • Users keep familiar Ed25519 wallets');
  console.log('   • Leverages proven secp256k1 stealth standards');
  console.log('   • No additional account funding needed');
  console.log('   • Clean separation of concerns');
  console.log('   • Maximum compatibility and usability');
})();