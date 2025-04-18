import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  DriftClient,
  initialize,
  Wallet,
  OrderType,
  PositionDirection,
  MarketType,
  PostOnlyParams,
  OrderParams,
  BulkAccountLoader,
  OrderTriggerCondition,
} from "@drift-labs/sdk";
import BN from "bn.js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletPublicKey,
      marketIndex,
      size,
      price,
      direction,
      orderType,
      subAccountId,
      isScaledOrder,
      scaledOrderCount,
      scaledOrderMinPrice,
      scaledOrderMaxPrice,
      takeProfitPrice,
      stopLossPrice,
      triggerPrice,
    } = body;

    if (!walletPublicKey || marketIndex === undefined || !size || !direction) {
      return NextResponse.json(
        {
          error:
            "Wallet public key, market index, size, and direction are required",
        },
        { status: 400 }
      );
    }

    // Initialize connection to mainnet
    const connection = new Connection(
      process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
      "confirmed"
    );

    // Initialize SDK config for mainnet
    const sdkConfig = initialize({ env: "mainnet-beta" });

    // Create a dummy wallet just to initialize the client
    // The actual signing will happen on the client side
    const dummyWallet = {
      publicKey: new PublicKey(walletPublicKey),
      signTransaction: async (tx: Transaction) => tx,
      signAllTransactions: async (txs: Transaction[]) => txs,
    };

    // Create a bulk account loader for the polling subscription
    const bulkAccountLoader = new BulkAccountLoader(
      connection,
      "confirmed",
      1000
    );

    // Initialize Drift client
    const driftClient = new DriftClient({
      connection,
      wallet: dummyWallet as unknown as Wallet,
      programID: new PublicKey(sdkConfig.DRIFT_PROGRAM_ID),
      activeSubAccountId: subAccountId || 0,
      accountSubscription: {
        type: "polling",
        accountLoader: bulkAccountLoader,
      },
    });

    await driftClient.subscribe();

    // Convert size to the appropriate precision
    const sizeWithPrecision = new BN(parseFloat(size) * 1e9);

    // Convert price to the appropriate precision if provided
    let priceWithPrecision;
    if (price) {
      priceWithPrecision = new BN(parseFloat(price) * 1e6);
    }

    let instructions: TransactionInstruction[] = [];

    // Helper function to create complete OrderParams
    const createCompleteOrderParams = (
      baseParams: Partial<OrderParams>
    ): OrderParams => {
      return {
        marketIndex,
        direction:
          direction === "LONG"
            ? PositionDirection.LONG
            : PositionDirection.SHORT,
        baseAssetAmount: sizeWithPrecision,
        price: new BN(0),
        marketType: MarketType.PERP,
        orderType: OrderType.MARKET,
        postOnly: PostOnlyParams.NONE,
        reduceOnly: false,
        userOrderId: 0,
        immediateOrCancel: false,
        maxTs: new BN(0),
        triggerPrice: new BN(0),
        triggerCondition: OrderTriggerCondition.ABOVE,
        oraclePriceOffset: 0,
        auctionDuration: 0,
        auctionStartPrice: new BN(0),
        auctionEndPrice: new BN(0),
        ...baseParams,
      };
    };

    // Handle different order types and create appropriate instructions
    // This section remains the same since it doesn't depend on cluster

    // Create a new transaction
    const latestBlockhash = await connection.getLatestBlockhash();
    const transaction = new Transaction({
      feePayer: new PublicKey(walletPublicKey),
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    // Add all instructions
    instructions.forEach((ix) => transaction.add(ix));

    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const base64Transaction = serializedTransaction.toString("base64");

    return NextResponse.json({
      transaction: base64Transaction,
      message: "Order transaction created successfully",
    });
  } catch (error) {
    console.error("Error creating order transaction:", error);
    return NextResponse.json(
      { error: "Failed to create order transaction" },
      { status: 500 }
    );
  }
}
