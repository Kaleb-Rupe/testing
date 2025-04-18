// src/app/api/drift/sendTransaction/route.ts (UPDATED)
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

    // Initialize connection to mainnet
    const connection = new Connection(
      process.env.RPC_URL || "https://api.mainnet-beta.solana.com",
      "confirmed"
    );

    // Convert array back to Buffer
    const transactionBuffer = Buffer.from(signedTransaction);

    // Send the transaction
    const signature = await connection.sendRawTransaction(transactionBuffer);

    // Wait for confirmation with a timeout
    const confirmationTimeout = 60000; // 60 seconds timeout
    const startTime = Date.now();

    try {
      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmationStrategy = {
        signature,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        blockhash: latestBlockhash.blockhash,
      };

      const confirmation = await Promise.race([
        connection.confirmTransaction(confirmationStrategy),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Transaction confirmation timeout")),
            confirmationTimeout
          )
        ),
      ]);

      if (
        confirmation &&
        typeof confirmation === "object" &&
        "value" in confirmation &&
        typeof confirmation.value === "object" &&
        confirmation.value !== null &&
        "err" in confirmation.value &&
        typeof confirmation.value.err === "object" &&
        confirmation.value.err !== null &&
        "message" in confirmation.value.err
      ) {
        throw new Error(
          `Transaction failed: ${confirmation.value.err.message}`
        );
      }
    } catch (confirmError) {
      console.warn(
        "Confirmation error, but transaction may still succeed:",
        confirmError
      );
      // Still return the signature since the transaction was sent
    }

    return NextResponse.json({
      signature,
      message: "Transaction sent successfully",
    });
  } catch (error) {
    console.error("Error sending transaction:", error);
    let errorMessage = "Failed to send transaction";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
