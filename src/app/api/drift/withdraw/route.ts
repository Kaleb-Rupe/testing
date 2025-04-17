// src/app/api/drift/withdraw/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { DriftClient, initialize, Wallet } from "@drift-labs/sdk";
import BN from "bn.js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletPublicKey, amount, marketIndex, subAccountId } = body;

    if (!walletPublicKey || !amount || marketIndex === undefined) {
      return NextResponse.json(
        {
          error: "Wallet public key, amount, and market index are required",
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

    // Initialize Drift client
    const driftClient = new DriftClient({
      connection,
      wallet: dummyWallet as unknown as Wallet,
      programID: new PublicKey(sdkConfig.DRIFT_PROGRAM_ID),
      activeSubAccountId: subAccountId || 0,
    });

    await driftClient.subscribe();

    // Convert amount to the appropriate precision
    const spotMarket = driftClient.getSpotMarketAccount(marketIndex);
    if (!spotMarket) {
      return NextResponse.json(
        {
          error: "Failed to find spot market",
        },
        { status: 400 }
      );
    }

    const decimalPlaces = spotMarket.decimals;
    const multiplier = Math.pow(10, decimalPlaces);
    const amountBN = new BN(Math.floor(parseFloat(amount) * multiplier));

    // Get the associated token account for withdrawal
    const associatedTokenAddress = await driftClient.getAssociatedTokenAccount(
      marketIndex
    );

    // Create the withdraw instruction
    const withdrawIx = await driftClient.getWithdrawIx(
      amountBN,
      marketIndex,
      associatedTokenAddress,
      false // reduceOnly
    );

    // Create a new transaction
    const latestBlockhash = await connection.getLatestBlockhash();
    const transaction = new Transaction({
      feePayer: new PublicKey(walletPublicKey),
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    // Add the withdraw instruction
    transaction.add(withdrawIx);

    // Serialize the transaction
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const base64Transaction = serializedTransaction.toString("base64");

    return NextResponse.json({
      transaction: base64Transaction,
      message: "Withdraw transaction created successfully",
    });
  } catch (error) {
    console.error("Error creating withdraw transaction:", error);
    return NextResponse.json(
      { error: "Failed to create withdraw transaction" },
      { status: 500 }
    );
  }
}
