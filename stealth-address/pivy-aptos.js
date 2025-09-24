import { Account, Aptos, AptosConfig, Network, Ed25519PrivateKey, Secp256k1PrivateKey } from "@aptos-labs/ts-sdk";
import PivyStealthAptos from './pivyStealthHelpersAptos.js';
import 'dotenv/config';

const APTOS_COIN = "0x1::aptos_coin::AptosCoin";
const COIN_STORE = `0x1::account::Account`;
const ADDITIONAL_BALANCE = 100_000_000;
const PACKAGE_ADDRESS = "0xe704a430ef260b94ec27ac058d4cd25302deb1eb3de05ec2e9742a89d80fa50d";
const MODULE_NAME = "pivy_stealth";
const FN_PAY = "pay";

const ALICE_PRIVATE_KEY = process.env.ALICE_PK;
const BOB_PRIVATE_KEY = process.env.BOB_PK;
const PRIVATE_NOTE = "Hello Aptos";
const LABEL = "personal";

(async () => {
    // Setup the client
    const config = new AptosConfig({ network: Network.DEVNET });
    const aptos = new Aptos(config);

    console.log("=== Addresses ===\n");
    const alice = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(ALICE_PRIVATE_KEY) })
    console.log("Alice's address:", alice.accountAddress.toStringLong());
    const bob = Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(BOB_PRIVATE_KEY) })
    console.log("Bob's address:", bob.accountAddress.toStringLong());


    const pivy = new PivyStealthAptos();
    const metaKeys = pivy.generateMetaKeys();
    const { metaSpend, metaView, metaSpendPubB58, metaViewPubB58 } = metaKeys;

    // Extract private keys for receiver operations
    const metaSpendPriv = metaSpend.privateKey.key.data;
    const metaViewPriv = metaView.privateKey.key.data;

    const ephemeral = pivy.generateEphemeralKey();
    const { privateKey: ephPriv, publicKeyB58: ephPubB58 } = ephemeral;
    // console.log(ephPriv, ephPubB58);

    const stealthPub = await pivy.deriveStealthPub(metaSpendPubB58, metaViewPubB58, ephPriv);

    const encryptedNote = await pivy.encryptNote("Hello Aptos", ephPriv, metaViewPubB58);

    console.log('\n🔐 Stealth Payment Setup V2 (Using Class-Based Helper Library):');
    console.log('   Meta Spend Public:', metaSpendPubB58);
    console.log('   Meta View Public :', metaViewPubB58);
    console.log('   Ephemeral Public :', ephPubB58);
    console.log('   Stealth Address  :', stealthPub.stealthAptosAddress);
    console.log('   Encrypted Note   :', encryptedNote.length, 'bytes');
    console.log('   🆕 Using PivyStealthAptos class instance for all operations!');

    console.log(`\n[Step 2]: Fund accounts for integrated transactions`);
    await aptos.fundAccount({
        accountAddress: alice.accountAddress,
        amount: ADDITIONAL_BALANCE,
    });
    await aptos.fundAccount({
        accountAddress: bob.accountAddress,
        amount: ADDITIONAL_BALANCE,
    });
    console.log('   Accounts funded successfully');
    console.log(`   Alice address  : ${alice.accountAddress}`);
    console.log(`   Bob address    : ${bob.accountAddress}`);

    console.log(`\n[Step 3]: Execute integrated stealth payment to ${stealthPub.stealthAptosAddress}`);
    const transaction = await aptos.transaction.build.simple({
        sender: alice.accountAddress,
        data: {
            function: `${PACKAGE_ADDRESS}::${MODULE_NAME}::${FN_PAY}`,
            typeArguments: ["0x1::aptos_coin::AptosCoin"], // or your coin type
            functionArguments: [
                // payer is &signer, provided by the sender
                100_000, // amount as number or U64
                stealthPub.stealthAptosAddress,
                LABEL,
                ephPubB58,
                PRIVATE_NOTE,
                encryptedNote,
            ],
        },
    });

    const [userTransactionResponse] = await aptos.transaction.simulate.simple({
        signerPublicKey: alice.publicKey,
        transaction,
    });

    const committedTxn = await aptos.signAndSubmitTransaction({
        signer: alice,
        transaction: transaction,
    });

    const executedTransaction = await aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
    });

    console.log(`   📋 Transaction digest: ${executedTransaction.transactionHash}`);
    console.log(`   📢 Events emitted:`, executedTransaction.events?.length || 0, 'events');

    console.log(`\n[Step 4]: Receiver processes the payment and decrypts the note`);

    // Receiver decrypts the private note using class method
    console.log("metaviewpriv", Buffer.from(metaViewPriv).toString('hex'));
    const decryptedNote = await pivy.decryptNote(
        encryptedNote,
        Buffer.from(metaViewPriv).toString('hex'),
        ephPubB58
    );

    console.log('   📝 Decrypted private note:', `"${decryptedNote}"`);
    console.log('   🔓 Note decryption successful:', decryptedNote === PRIVATE_NOTE ? '✅ YES' : '❌ NO');

    // Derive stealth keypair for withdrawal using class method
    const stealthKP = await pivy.deriveStealthKeypair(
        metaSpendPriv, 
        metaViewPriv,
        ephPubB58
    );

    console.log('   🔑 Stealth keypair derived successfully');
    console.log('   🏠 Stealth address match:', stealthKP.stealthAddress === stealthPub.stealthAptosAddress ? '✅ YES' : '❌ NO');
    console.log('   🔑 Stealth PK:', stealthKP.privateKey);

    // create account from the secp private key
    const stealthAccount = Account.fromPrivateKey({ privateKey: new Secp256k1PrivateKey(stealthKP.privateKey) });
    console.log('   🔑 Stealth account:', stealthAccount.accountAddress.toStringLong());

})();