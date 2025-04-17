// src/app/api/drift/placeOrder/route.ts
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
  BN,
  OrderType,
  PositionDirection,
  MarketType,
  PostOnlyParams,
  OrderParams,
  BulkAccountLoader,
  OrderTriggerCondition,
} from "@drift-labs/sdk";

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

    // Initialize connection
    const connection = new Connection(
      process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
      "confirmed"
    );

    // Initialize SDK config
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

    // Handle different order types
    if (
      isScaledOrder &&
      scaledOrderCount &&
      scaledOrderMinPrice &&
      scaledOrderMaxPrice
    ) {
      // Create scaled orders
      const minPrice = new BN(parseFloat(scaledOrderMinPrice) * 1e6);
      const maxPrice = new BN(parseFloat(scaledOrderMaxPrice) * 1e6);
      const priceStep = maxPrice
        .sub(minPrice)
        .div(new BN(scaledOrderCount - 1));

      // Calculate size per order
      const sizePerOrder = sizeWithPrecision.div(new BN(scaledOrderCount));

      // Create limit orders at different price levels
      for (let i = 0; i < scaledOrderCount; i++) {
        const orderPrice = minPrice.add(priceStep.mul(new BN(i)));

        const orderParams = createCompleteOrderParams({
          baseAssetAmount: sizePerOrder,
          price: orderPrice,
          orderType: OrderType.LIMIT,
        });

        const ix = await driftClient.getPlacePerpOrderIx(orderParams);
        instructions.push(ix);
      }
    } else {
      // Create a single order
      let orderParams: OrderParams;

      // Add order type specific parameters
      switch (orderType) {
        case "MARKET":
          orderParams = createCompleteOrderParams({
            orderType: OrderType.MARKET,
          });
          break;
        case "LIMIT":
          orderParams = createCompleteOrderParams({
            price: priceWithPrecision || new BN(0),
            orderType: OrderType.LIMIT,
          });
          break;
        case "TRIGGER_MARKET":
          orderParams = createCompleteOrderParams({
            triggerPrice: new BN(parseFloat(triggerPrice) * 1e6),
            orderType: OrderType.TRIGGER_MARKET,
            triggerCondition:
              direction === "LONG"
                ? OrderTriggerCondition.ABOVE
                : OrderTriggerCondition.BELOW,
          });
          break;
        case "TRIGGER_LIMIT":
          orderParams = createCompleteOrderParams({
            price: priceWithPrecision || new BN(0),
            triggerPrice: new BN(parseFloat(triggerPrice) * 1e6),
            orderType: OrderType.TRIGGER_LIMIT,
            triggerCondition:
              direction === "LONG"
                ? OrderTriggerCondition.ABOVE
                : OrderTriggerCondition.BELOW,
          });
          break;
        default:
          orderParams = createCompleteOrderParams({
            orderType: OrderType.MARKET,
          });
      }

      // Create the order instruction
      const ix = await driftClient.getPlacePerpOrderIx(orderParams);
      instructions.push(ix);

      // Add take profit and stop loss orders if provided
      if (takeProfitPrice) {
        const tpDirection =
          direction === "LONG"
            ? PositionDirection.SHORT
            : PositionDirection.LONG;
        const tpParams = createCompleteOrderParams({
          direction: tpDirection,
          price: new BN(parseFloat(takeProfitPrice) * 1e6),
          orderType: OrderType.LIMIT,
          reduceOnly: true,
        });

        const tpIx = await driftClient.getPlacePerpOrderIx(tpParams);
        instructions.push(tpIx);
      }

      if (stopLossPrice) {
        const slDirection =
          direction === "LONG"
            ? PositionDirection.SHORT
            : PositionDirection.LONG;
        const slParams = createCompleteOrderParams({
          direction: slDirection,
          price: new BN(parseFloat(stopLossPrice) * 1e6),
          orderType: OrderType.TRIGGER_MARKET,
          triggerPrice: new BN(parseFloat(stopLossPrice) * 1e6),
          triggerCondition:
            direction === "LONG"
              ? OrderTriggerCondition.BELOW
              : OrderTriggerCondition.ABOVE,
          reduceOnly: true,
        });

        const slIx = await driftClient.getPlacePerpOrderIx(slParams);
        instructions.push(slIx);
      }
    }

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
