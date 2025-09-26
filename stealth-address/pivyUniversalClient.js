/**
 * PIVY Universal Client - Handles both Coin and Fungible Asset operations
 * 
 * This utility class provides a universal interface that automatically detects
 * whether to use Coin-based functions or Fungible Asset functions based on 
 * the asset type provided.
 */

export class PIVYUniversalClient {
  constructor(aptosClient, config) {
    this.aptosClient = aptosClient;
    this.config = config;
  }

  /**
   * Detects if the asset type is a Fungible Asset or traditional Coin
   * @param {string} assetType - The asset type identifier
   * @returns {boolean} true if Fungible Asset, false if Coin
   */
  isFungibleAsset(assetType) {
    // Fungible Assets are Object addresses (64 hex chars)
    // Coins follow the pattern: 0xaddress::module::CoinType
    return /^0x[0-9a-f]{64}$/i.test(assetType);
  }

  /**
   * Universal announce function - automatically chooses correct implementation
   * @param {Object} params - Announcement parameters
   * @returns {Promise} Transaction result
   */
  async announce(params) {
    const {
      signer,
      stealthOwner,
      assetType,
      amount,
      label,
      ephPubkey,
      payload,
      note
    } = params;

    if (this.isFungibleAsset(assetType)) {
      // Use Fungible Asset announce function
      return this.announceFa({
        signer,
        stealthOwner,
        faMetadata: assetType,
        amount,
        label,
        ephPubkey,
        payload,
        note
      });
    } else {
      // Use traditional Coin announce function
      return this.announceCoin({
        signer,
        stealthOwner,
        coinType: assetType,
        amount,
        label,
        ephPubkey,
        payload,
        note
      });
    }
  }

  /**
   * Announce using Fungible Asset
   */
  async announceFa(params) {
    const {
      signer,
      stealthOwner,
      faMetadata,
      amount,
      label,
      ephPubkey,
      payload,
      note
    } = params;

    const transaction = await this.aptosClient.transaction.build.simple({
      sender: signer.accountAddress || signer,
      data: {
        function: `${this.config.PIVY_STEALTH.packageId}::${this.config.PIVY_STEALTH.moduleName}::${this.config.PIVY_STEALTH.fnAnnounceFa}`,
        functionArguments: [
          stealthOwner,
          faMetadata,
          amount,
          Array.from(label),
          Array.from(ephPubkey),
          Array.from(payload),
          Array.from(note),
        ],
      },
    });

    return await this.aptosClient.signAndSubmitTransaction({
      signer,
      transaction,
    });
  }

  /**
   * Announce using traditional Coin
   */
  async announceCoin(params) {
    const {
      signer,
      stealthOwner,
      coinType,
      amount,
      label,
      ephPubkey,
      payload,
      note
    } = params;

    const transaction = await this.aptosClient.transaction.build.simple({
      sender: signer.accountAddress || signer,
      data: {
        function: `${this.config.PIVY_STEALTH.packageId}::${this.config.PIVY_STEALTH.moduleName}::${this.config.PIVY_STEALTH.fnAnnounce}`,
        typeArguments: [coinType],
        functionArguments: [
          stealthOwner,
          amount,
          Array.from(label),
          Array.from(ephPubkey),
          Array.from(payload),
          Array.from(note),
        ],
      },
    });

    return await this.aptosClient.signAndSubmitTransaction({
      signer,
      transaction,
    });
  }

  /**
   * Universal withdraw function - automatically chooses correct implementation
   */
  async withdraw(params) {
    const {
      signer,
      assetType,
      amount,
      destination
    } = params;

    if (this.isFungibleAsset(assetType)) {
      return this.withdrawFa({
        signer,
        faMetadata: assetType,
        amount,
        destination
      });
    } else {
      return this.withdrawCoin({
        signer,
        coinType: assetType,
        amount,
        destination
      });
    }
  }

  /**
   * Withdraw using Fungible Asset
   */
  async withdrawFa(params) {
    const { signer, faMetadata, amount, destination } = params;

    const transaction = await this.aptosClient.transaction.build.simple({
      sender: signer.accountAddress || signer,
      data: {
        function: `${this.config.PIVY_STEALTH.packageId}::${this.config.PIVY_STEALTH.moduleName}::${this.config.PIVY_STEALTH.fnWithdrawFa}`,
        functionArguments: [
          faMetadata,
          amount,
          destination,
        ],
      },
    });

    return await this.aptosClient.signAndSubmitTransaction({
      signer,
      transaction,
    });
  }

  /**
   * Withdraw using traditional Coin
   */
  async withdrawCoin(params) {
    const { signer, coinType, amount, destination } = params;

    const transaction = await this.aptosClient.transaction.build.simple({
      sender: signer.accountAddress || signer,
      data: {
        function: `${this.config.PIVY_STEALTH.packageId}::${this.config.PIVY_STEALTH.moduleName}::${this.config.PIVY_STEALTH.fnWithdraw}`,
        typeArguments: [coinType],
        functionArguments: [
          amount,
          destination,
        ],
      },
    });

    return await this.aptosClient.signAndSubmitTransaction({
      signer,
      transaction,
    });
  }

  /**
   * Get asset type information for debugging
   */
  getAssetTypeInfo(assetType) {
    return {
      assetType,
      isFungibleAsset: this.isFungibleAsset(assetType),
      detectedAs: this.isFungibleAsset(assetType) ? 'Fungible Asset' : 'Coin',
      functionToUse: this.isFungibleAsset(assetType) ? 'announce_fa/withdraw_fa' : 'announce<T>/withdraw<T>'
    };
  }
}

export default PIVYUniversalClient;