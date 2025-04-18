import {
  DriftClient,
  initialize,
  Wallet,
  User,
  BulkAccountLoader,
  SpotMarkets,
  PerpMarkets,
  SpotMarketConfig,
  PerpMarketConfig,
  isVariant,
} from "@drift-labs/sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// Initialize a dummy keypair for read-only operations
const dummyKeypair = Keypair.generate();
const dummyWallet = new Wallet(dummyKeypair);

// Initialize the Drift Client with the mainnet environment
const initializeDriftClient = async (pubkey?: string) => {
  // Always use mainnet-beta endpoint
  const endpoint = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";

  console.log(`Using endpoint: ${endpoint}`);

  // Create connection with the appropriate endpoint
  const connection = new Connection(endpoint, "confirmed");

  // Initialize the Drift SDK with mainnet environment
  const sdkConfig = initialize({ env: "mainnet-beta" });

  // Create BulkAccountLoader which is required for polling subscription
  const bulkAccountLoader = new BulkAccountLoader(
    connection,
    "confirmed",
    1000
  );

  // Create a custom authority if pubkey is provided
  let authority = undefined;
  if (pubkey) {
    authority = new PublicKey(pubkey);
  }

  // Set up the Drift Client for read-only operations
  const driftClient = new DriftClient({
    connection,
    wallet: dummyWallet,
    programID: new PublicKey(sdkConfig.DRIFT_PROGRAM_ID),
    authority,
    accountSubscription: {
      type: "polling",
      accountLoader: bulkAccountLoader,
    },
  });

  await driftClient.subscribe();
  return driftClient;
};

// Rest of the file remains the same - getUserAccountsForAuthority and getUserData functions

// Get all user accounts for a wallet authority
export const getUserAccountsForAuthority = async (authority: string) => {
  try {
    const driftClient = await initializeDriftClient(authority);
    const userAccounts = await driftClient.getUserAccountsForAuthority(
      new PublicKey(authority)
    );
    return userAccounts;
  } catch (error) {
    console.error("Error getting user accounts:", error);
    throw error;
  }
};

// Get user data for a specific user account
export const getUserData = async (userAccountPublicKey: string) => {
  try {
    const driftClient = await initializeDriftClient();

    // Create BulkAccountLoader for the User
    const bulkAccountLoader = new BulkAccountLoader(
      driftClient.connection,
      "confirmed",
      1000
    );

    // Create a User instance for the given user account
    const user = new User({
      driftClient,
      userAccountPublicKey: new PublicKey(userAccountPublicKey),
      accountSubscription: {
        type: "polling",
        accountLoader: bulkAccountLoader,
      },
    });

    await user.subscribe();

    // Get spot market details from SDK
    const spotMarkets = SpotMarkets["mainnet-beta"];
    const perpMarkets = PerpMarkets["mainnet-beta"];

    // Get balances
    const spotPositions = user.getUserAccount().spotPositions;
    const balances = spotPositions
      .filter((position) => !position.scaledBalance.eq(new BN(0)))
      .map((position) => {
        const marketIndex = position.marketIndex;
        const spotMarket = driftClient.getSpotMarketAccount(marketIndex);

        if (!spotMarket) {
          return null;
        }

        const isDeposit = position.balanceType === 0; // 0 = Deposit, 1 = Borrow

        // Get token amount from the user instance
        let tokenAmount = user.getTokenAmount(marketIndex);

        // Handle sign based on deposit/borrow
        const tokenValue = Math.abs(tokenAmount.toNumber());

        // Find market info from config
        const marketInfo = spotMarkets.find(
          (m: SpotMarketConfig) => m.marketIndex === marketIndex
        );
        const symbol = marketInfo?.symbol || `SPOT-${marketIndex}`;

        // Convert to human-readable form
        return {
          marketIndex,
          symbol,
          amount: (isDeposit ? tokenValue : -tokenValue).toString(),
          usdValue: (
            (tokenValue *
              spotMarket.historicalOracleData.lastOraclePrice.toNumber()) /
            1e6
          ).toString(),
          isDeposit,
        };
      })
      .filter(Boolean); // Remove null values

    // Get perp positions
    const perpPositions = user
      .getUserAccount()
      .perpPositions.filter(
        (position) => !position.baseAssetAmount.eq(new BN(0))
      )
      .map((position) => {
        const marketIndex = position.marketIndex;
        const perpMarket = driftClient.getPerpMarketAccount(marketIndex);

        if (!perpMarket) {
          return null;
        }

        const baseAssetAmount = position.baseAssetAmount;
        const isLong = baseAssetAmount.gte(new BN(0));

        // Get entry price and current mark price
        const entryPrice = position.quoteEntryAmount
          ? position.quoteEntryAmount.toNumber() / 1e6
          : 0;

        const markPrice =
          perpMarket.amm.historicalOracleData.lastOraclePrice.toNumber() / 1e6;

        // Calculate PnL (simplified calculation)
        const quoteAssetAmount = position.quoteAssetAmount.toNumber() / 1e6;
        const baseAssetAmountValue = baseAssetAmount.abs().toNumber() / 1e9;
        const currentValue = baseAssetAmountValue * markPrice;
        let pnl = 0;

        if (isLong) {
          pnl = currentValue + quoteAssetAmount;
        } else {
          pnl = -currentValue + quoteAssetAmount;
        }

        // Find market info from config
        const marketInfo = perpMarkets.find(
          (m: PerpMarketConfig) => m.marketIndex === marketIndex
        );
        const symbol = marketInfo?.symbol || `PERP-${marketIndex}`;

        return {
          marketIndex,
          symbol,
          baseAssetAmount: (
            baseAssetAmountValue * (isLong ? 1 : -1)
          ).toString(),
          quoteAssetAmount: quoteAssetAmount.toString(),
          entryPrice: entryPrice.toString(),
          markPrice: markPrice.toString(),
          pnl: pnl.toString(),
          isLong,
        };
      })
      .filter(Boolean); // Remove null values

    // Get open orders
    const orders = user.getOpenOrders().map((order) => {
      const isSpot = order.marketType === 0; // 0 = SPOT, 1 = PERP
      const marketIndex = order.marketIndex;
      let symbol = `UNKNOWN-${marketIndex}`;

      // Find the symbol from the market configs
      if (isSpot) {
        const marketInfo = spotMarkets.find(
          (m: SpotMarketConfig) => m.marketIndex === marketIndex
        );
        symbol = marketInfo?.symbol || `SPOT-${marketIndex}`;
      } else {
        const marketInfo = perpMarkets.find(
          (m: PerpMarketConfig) => m.marketIndex === marketIndex
        );
        symbol = marketInfo?.symbol || `PERP-${marketIndex}`;
      }

      const direction = order.direction === 0 ? "LONG" : "SHORT"; // 0 = LONG, 1 = SHORT

      // Determine order type using isVariant function
      let orderType = "UNKNOWN";
      if (isVariant(order.orderType, "market")) {
        orderType = "MARKET";
      } else if (isVariant(order.orderType, "limit")) {
        orderType = "LIMIT";
      } else if (isVariant(order.orderType, "triggerMarket")) {
        orderType = "TRIGGER_MARKET";
      } else if (isVariant(order.orderType, "triggerLimit")) {
        orderType = "TRIGGER_LIMIT";
      } else if (isVariant(order.orderType, "oracle")) {
        orderType = "ORACLE";
      }

      return {
        orderId: order.orderId,
        marketIndex,
        symbol,
        direction,
        type: orderType,
        price: order.price.toString(),
        size: order.baseAssetAmount.toString(),
        status: "OPEN",
      };
    });

    const userData = {
      subAccountId: user.getUserAccount().subAccountId,
      authority: user.getUserAccount().authority.toString(),
      balances,
      positions: perpPositions,
      orders,
    };

    return userData;
  } catch (error) {
    console.error("Error getting user data:", error);
    throw error;
  }
};
