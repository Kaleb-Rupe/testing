// src/app/api/drift/sendTransaction/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signedTransaction } = body;

    if (!signedTransaction) {
      return NextResponse.json(
        { error: "Signed transaction is required" },
        { status: 400 }
      );
    }

    // Initialize connection
    const connection = new Connection(
      process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
      "confirmed"
    );

    // Convert array back to Buffer
    const transactionBuffer = Buffer.from(signedTransaction);

    // Send the transaction
    const signature = await connection.sendRawTransaction(transactionBuffer);

    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmationStrategy = {
      signature,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      blockhash: latestBlockhash.blockhash,
    };
    const confirmation = await connection.confirmTransaction(
      confirmationStrategy
    );

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed: ${confirmation.value.err.toString()}`
      );
    }

    return NextResponse.json({
      signature,
      message: "Transaction sent successfully",
    });
  } catch (error) {
    console.error("Error sending transaction:", error);
    return NextResponse.json(
      { error: "Failed to send transaction" },
      { status: 500 }
    );
  }
}
