// Copyright (c) 2024, Pivy
// SPDX-License-Identifier: Apache-2.0

/// PIVY Stealth Payment System for Aptos Move
///
/// This module implements a complete stealth payment system on Aptos, providing privacy-preserving
/// cryptocurrency transactions through cryptographic stealth addresses. The system supports both
/// traditional Coin types and modern Fungible Assets, with event-only tracking and integrated 
/// token transfers with automatic asset management.
///
/// ## Core Functions
///
/// ### Coin Functions (Traditional Aptos Coins)
/// - `announce<CoinType>()` - Records stealth payment events for off-chain indexing
/// - `pay<CoinType>()` - Executes stealth payment with automatic coin management
/// - `announce_withdraw<CoinType>()` - Records withdrawal events for tracking
/// - `withdraw<CoinType>()` - Executes stealth withdrawal with automatic handling
///
/// ### Fungible Asset Functions (Modern FA Standard)
/// - `announce_fa()` - Records stealth payment events for Fungible Assets
/// - `pay_fa()` - Executes stealth payment with automatic FA management
/// - `announce_withdraw_fa()` - Records withdrawal events for FA tracking
/// - `withdraw_fa()` - Executes stealth withdrawal with automatic FA handling
///
/// ## Key Features
/// 
/// - **Privacy-First Design**: Uses cryptographic stealth addresses for unlinkable payments
/// - **Universal Token Support**: Works with native APT and any other Aptos coin types
/// - **Automatic Coin Management**: Handles coin operations seamlessly
/// - **Atomic Operations**: Single-transaction payment and event recording
/// - **Off-Chain Indexing**: Events enable discovery and tracking of stealth activity
/// - **Gas Efficiency**: Optimized for minimal on-chain footprint
///
/// ## Security Properties
///
/// - Stealth addresses provide perfect unlinkability between payer and receiver
/// - Only the intended recipient can derive the private key for stealth addresses
/// - All coin operations use Move's built-in safety guarantees
/// - Event data is public but payment metadata remains encrypted

module pivy_stealth::pivy_stealth {
    use std::signer;
    use std::string::String;
    use std::vector;
    use std::type_info;
    
    use aptos_framework::timestamp;
    use aptos_framework::coin;
    use aptos_framework::event;
    use aptos_framework::fungible_asset::{Self, Metadata, FungibleAsset};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::object::{Self, Object};

    /* ------------------------------------------------------------------ */
    /*                               Errors                                */
    /* ------------------------------------------------------------------ */
    
    /// Error code for invalid payment amounts (zero or negative)
    const EInvalidAmount: u64 = 0;
    
    /// Error code when coin balance is insufficient for the requested operation
    const EInsufficientFunds: u64 = 1;
    
    /// Error code when payload or note exceeds maximum allowed length
    const EPayloadTooLong: u64 = 2;

    /* ------------------------------------------------------------------ */
    /*                                Events                               */
    /* ------------------------------------------------------------------ */

    /// Event emitted for every stealth payment.
    #[event]
    struct PaymentEvent<phantom CoinType> has drop, store {
        /// The stealth address receiving the payment
        stealth_owner: address,
        /// The address that initiated the payment
        payer: address,
        /// Amount of tokens being transferred (in smallest unit)
        amount: u64,
        /// Type of coin being transferred
        coin_type: String,
        /// 32-byte identifier for payment categorization/tracking
        label: vector<u8>,
        /// Ephemeral public key for ECDH key derivation (33 bytes)
        eph_pubkey: vector<u8>,
        /// UTF-8 encoded public message (≤121 bytes)
        payload: vector<u8>,
        /// Encrypted private note for recipient only (≤256 bytes)
        note: vector<u8>,
        /// Timestamp of the payment
        timestamp: u64,
    }

    /// Event emitted for every stealth withdrawal.
    #[event]
    struct WithdrawEvent<phantom CoinType> has drop, store {
        /// The stealth address funds are being withdrawn from
        stealth_owner: address,
        /// Amount being withdrawn (in smallest unit)
        amount: u64,
        /// Type of coin being withdrawn
        coin_type: String,
        /// Final destination address for the withdrawn funds
        destination: address,
        /// Timestamp of the withdrawal
        timestamp: u64,
    }

    /// Event emitted for every stealth payment using Fungible Assets.
    #[event]
    struct PaymentEventFA has drop, store {
        /// The stealth address receiving the payment
        stealth_owner: address,
        /// The address that initiated the payment
        payer: address,
        /// Amount of tokens being transferred (in smallest unit)
        amount: u64,
        /// Fungible Asset metadata object address
        fa_metadata: address,
        /// Name of the fungible asset
        fa_name: String,
        /// 32-byte identifier for payment categorization/tracking
        label: vector<u8>,
        /// Ephemeral public key for ECDH key derivation (33 bytes)
        eph_pubkey: vector<u8>,
        /// UTF-8 encoded public message (≤121 bytes)
        payload: vector<u8>,
        /// Encrypted private note for recipient only (≤256 bytes)
        note: vector<u8>,
        /// Timestamp of the payment
        timestamp: u64,
    }

    /// Event emitted for every stealth withdrawal using Fungible Assets.
    #[event]
    struct WithdrawEventFA has drop, store {
        /// The stealth address funds are being withdrawn from
        stealth_owner: address,
        /// Amount being withdrawn (in smallest unit)
        amount: u64,
        /// Fungible Asset metadata object address
        fa_metadata: address,
        /// Name of the fungible asset
        fa_name: String,
        /// Final destination address for the withdrawn funds
        destination: address,
        /// Timestamp of the withdrawal
        timestamp: u64,
    }

    /* ------------------------------------------------------------------ */
    /*                               Core Functions                        */
    /* ------------------------------------------------------------------ */
    
    /// Announce a stealth payment without transferring funds.
    /// 
    /// This function emits a PaymentEvent with the specified parameters,
    /// allowing off-chain indexers to track stealth payments without
    /// requiring the actual coin transfer to happen on-chain.
    /// 
    /// This is useful for external payment processors or when funds
    /// are transferred through other mechanisms.
    public entry fun announce<CoinType>(
        account: &signer,
        stealth_owner: address,
        amount: u64,
        label: vector<u8>,
        eph_pubkey: vector<u8>,
        payload: vector<u8>,
        note: vector<u8>,
    ) {
        // Input validation
        assert!(amount > 0, EInvalidAmount);
        assert!(vector::length(&payload) <= 121, EPayloadTooLong);
        assert!(vector::length(&note) <= 256, EPayloadTooLong);
        
        let payer = signer::address_of(account);
        let current_timestamp = timestamp::now_seconds();

        // Emit payment event
        let payment_event = PaymentEvent<CoinType> {
            stealth_owner,
            payer,
            amount,
            coin_type: type_info::type_name<CoinType>(),
            label,
            eph_pubkey,
            payload,
            note,
            timestamp: current_timestamp, 
        };
        
        event::emit(payment_event);
    }

    /// Make a stealth payment by transferring coins and announcing it.
    /// 
    /// This combines coin transfer with payment announcement in a single transaction.
    /// The coins are transferred from the payer to the stealth address,
    /// and a PaymentEvent is emitted for off-chain discovery.
    public entry fun pay<CoinType>(
        account: &signer,
        stealth_owner: address,
        amount: u64,
        label: vector<u8>,
        eph_pubkey: vector<u8>,
        payload: vector<u8>,
        note: vector<u8>,
    ) {
        // Input validation
        assert!(amount > 0, EInvalidAmount);
        assert!(vector::length(&payload) <= 121, EPayloadTooLong);
        assert!(vector::length(&note) <= 256, EPayloadTooLong);
        
        let payer = signer::address_of(account);
        let current_timestamp = timestamp::now_seconds();

        // Check payer has sufficient balance
        let balance = coin::balance<CoinType>(payer);
        assert!(balance >= amount, EInsufficientFunds);
        
        // Transfer coins to stealth address
        coin::transfer<CoinType>(account, stealth_owner, amount);
        
        // Emit payment event
        let payment_event = PaymentEvent<CoinType> {
            stealth_owner,
            payer,
            amount,
            coin_type: type_info::type_name<CoinType>(),
            label,
            eph_pubkey,
            payload,
            note,
            timestamp: current_timestamp,
        };
        
        event::emit(payment_event);
    }

    /// Announce a withdrawal from a stealth address without transferring funds.
    /// 
    /// This function emits a WithdrawEvent for off-chain tracking
    /// without performing the actual coin transfer.
    public entry fun announce_withdraw<CoinType>(
        account: &signer,
        amount: u64,
        destination: address,
    ) {
        // Validate withdrawal amount
        assert!(amount > 0, EInvalidAmount);
        
        let stealth_owner = signer::address_of(account);
        let current_timestamp = timestamp::now_seconds();

        // Emit withdrawal event
        let withdraw_event = WithdrawEvent<CoinType> {
            stealth_owner,
            amount,
            coin_type: type_info::type_name<CoinType>(),
            destination,
            timestamp: current_timestamp
        };
        
        event::emit(withdraw_event);
    }

    /// Withdraw coins from a stealth address.
    /// 
    /// This function transfers coins from the stealth address to a destination
    /// and emits a WithdrawEvent for off-chain tracking.
    public entry fun withdraw<CoinType>(
        account: &signer,
        amount: u64,
        destination: address,
    ) {
        assert!(amount > 0, EInvalidAmount);
        
        let stealth_owner = signer::address_of(account);
        let current_timestamp = timestamp::now_seconds();
        
        // Check stealth address has sufficient balance
        let balance = coin::balance<CoinType>(stealth_owner);
        assert!(balance >= amount, EInsufficientFunds);
        
        // Transfer coins to destination
        coin::transfer<CoinType>(account, destination, amount);
        
        // Emit withdrawal event
        let withdraw_event = WithdrawEvent<CoinType> {
            stealth_owner,
            amount,
            coin_type: type_info::type_name<CoinType>(),
            destination,
            timestamp: current_timestamp, // Fixed timestamp for testing
        };
        
        event::emit(withdraw_event);
    }

    /* ------------------------------------------------------------------ */
    /*                        Fungible Asset Functions                    */
    /* ------------------------------------------------------------------ */

    /// Announce a stealth payment using Fungible Assets without transferring funds.
    /// 
    /// This function emits a PaymentEventFA with the specified parameters,
    /// allowing off-chain indexers to track stealth payments using Fungible Assets
    /// without requiring the actual asset transfer to happen on-chain.
    /// 
    /// This is useful for CCTP transfers or when funds are transferred 
    /// through other mechanisms outside of direct transfers.
    public entry fun announce_fa(
        account: &signer,
        stealth_owner: address,
        fa_metadata: Object<Metadata>,
        amount: u64,
        label: vector<u8>,
        eph_pubkey: vector<u8>,
        payload: vector<u8>,
        note: vector<u8>,
    ) {
        // Input validation
        assert!(amount > 0, EInvalidAmount);
        assert!(vector::length(&payload) <= 121, EPayloadTooLong);
        assert!(vector::length(&note) <= 256, EPayloadTooLong);
        
        let payer = signer::address_of(account);
        let current_timestamp = timestamp::now_seconds();
        let fa_metadata_addr = object::object_address(&fa_metadata);
        let fa_name = fungible_asset::name(fa_metadata);

        // Emit payment event for Fungible Asset
        let payment_event = PaymentEventFA {
            stealth_owner,
            payer,
            amount,
            fa_metadata: fa_metadata_addr,
            fa_name,
            label,
            eph_pubkey,
            payload,
            note,
            timestamp: current_timestamp,
        };
        
        event::emit(payment_event);
    }

    /// Make a stealth payment using Fungible Assets by transferring assets and announcing it.
    /// 
    /// This combines fungible asset transfer with payment announcement in a single transaction.
    /// The assets are transferred from the payer to the stealth address,
    /// and a PaymentEventFA is emitted for off-chain discovery.
    public entry fun pay_fa(
        account: &signer,
        stealth_owner: address,
        fa_metadata: Object<Metadata>,
        amount: u64,
        label: vector<u8>,
        eph_pubkey: vector<u8>,
        payload: vector<u8>,
        note: vector<u8>,
    ) {
        // Input validation
        assert!(amount > 0, EInvalidAmount);
        assert!(vector::length(&payload) <= 121, EPayloadTooLong);
        assert!(vector::length(&note) <= 256, EPayloadTooLong);
        
        let payer = signer::address_of(account);
        let current_timestamp = timestamp::now_seconds();
        let fa_metadata_addr = object::object_address(&fa_metadata);
        let fa_name = fungible_asset::name(fa_metadata);

        // Check payer has sufficient balance
        let balance = primary_fungible_store::balance(payer, fa_metadata);
        assert!(balance >= amount, EInsufficientFunds);
        
        // Transfer fungible assets to stealth address
        primary_fungible_store::transfer(account, fa_metadata, stealth_owner, amount);
        
        // Emit payment event for Fungible Asset
        let payment_event = PaymentEventFA {
            stealth_owner,
            payer,
            amount,
            fa_metadata: fa_metadata_addr,
            fa_name,
            label,
            eph_pubkey,
            payload,
            note,
            timestamp: current_timestamp,
        };
        
        event::emit(payment_event);
    }

    /// Announce a withdrawal from a stealth address using Fungible Assets without transferring funds.
    /// 
    /// This function emits a WithdrawEventFA for off-chain tracking
    /// without performing the actual asset transfer.
    public entry fun announce_withdraw_fa(
        account: &signer,
        fa_metadata: Object<Metadata>,
        amount: u64,
        destination: address,
    ) {
        // Validate withdrawal amount
        assert!(amount > 0, EInvalidAmount);
        
        let stealth_owner = signer::address_of(account);
        let current_timestamp = timestamp::now_seconds();
        let fa_metadata_addr = object::object_address(&fa_metadata);
        let fa_name = fungible_asset::name(fa_metadata);

        // Emit withdrawal event for Fungible Asset
        let withdraw_event = WithdrawEventFA {
            stealth_owner,
            amount,
            fa_metadata: fa_metadata_addr,
            fa_name,
            destination,
            timestamp: current_timestamp,
        };
        
        event::emit(withdraw_event);
    }

    /// Withdraw Fungible Assets from a stealth address.
    /// 
    /// This function transfers fungible assets from the stealth address to a destination
    /// and emits a WithdrawEventFA for off-chain tracking.
    public entry fun withdraw_fa(
        account: &signer,
        fa_metadata: Object<Metadata>,
        amount: u64,
        destination: address,
    ) {
        assert!(amount > 0, EInvalidAmount);
        
        let stealth_owner = signer::address_of(account);
        let current_timestamp = timestamp::now_seconds();
        let fa_metadata_addr = object::object_address(&fa_metadata);
        let fa_name = fungible_asset::name(fa_metadata);
        
        // Check stealth address has sufficient balance
        let balance = primary_fungible_store::balance(stealth_owner, fa_metadata);
        assert!(balance >= amount, EInsufficientFunds);
        
        // Transfer fungible assets to destination
        primary_fungible_store::transfer(account, fa_metadata, destination, amount);
        
        // Emit withdrawal event for Fungible Asset
        let withdraw_event = WithdrawEventFA {
            stealth_owner,
            amount,
            fa_metadata: fa_metadata_addr,
            fa_name,
            destination,
            timestamp: current_timestamp,
        };
        
        event::emit(withdraw_event);
    }
}