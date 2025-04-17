"use client";

import { FC, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useUserStore } from "@/store";
import { Transaction } from "@solana/web3.js";

interface WithdrawFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

// Market options for withdraw (same as deposit)
const MARKETS = [
  { index: 0, symbol: "USDC", name: "USD Coin" },
  { index: 1, symbol: "SOL", name: "Solana" },
  { index: 2, symbol: "mSOL", name: "Marinade Staked SOL" },
  { index: 3, symbol: "BONK", name: "Bonk" },
  { index: 4, symbol: "JitoSOL", name: "Jito SOL" },
];

const WithdrawForm: FC<WithdrawFormProps> = ({ onClose, onSuccess }) => {
  const { publicKey, signTransaction } = useWallet();
  const { activeSubaccountId, balances } = useUserStore();

  const [amount, setAmount] = useState<string>("");
  const [marketIndex, setMarketIndex] = useState<number>(0); // Default to USDC
  const [maxAmount, setMaxAmount] = useState<string>("0");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Update max amount when market changes
  useEffect(() => {
    const balance = balances.find((b) => b.marketIndex === marketIndex);
    if (balance && parseFloat(balance.amount) > 0) {
      setMaxAmount(balance.amount);
    } else {
      setMaxAmount("0");
    }
  }, [marketIndex, balances]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !signTransaction || activeSubaccountId === null) {
      setError("Wallet not connected or no active subaccount selected");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > parseFloat(maxAmount)) {
      setError(
        `You can only withdraw up to ${maxAmount} ${
          MARKETS.find((m) => m.index === marketIndex)?.symbol
        }`
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Call our API endpoint to create the withdraw transaction
      const response = await fetch("/api/drift/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletPublicKey: publicKey.toString(),
          amount,
          marketIndex,
          subAccountId: activeSubaccountId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to create withdraw transaction"
        );
      }

      const { transaction: base64Transaction } = await response.json();

      // Convert base64 transaction to Transaction object
      const transactionBuffer = Buffer.from(base64Transaction, "base64");
      const transaction = Transaction.from(transactionBuffer);

      // Sign the transaction
      const signedTransaction = await signTransaction(transaction);

      // Convert signed transaction to base64
      const signedSerializedTransaction = signedTransaction.serialize();

      // Send the signed transaction
      const sendResponse = await fetch("/api/drift/sendTransaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signedTransaction: Array.from(signedSerializedTransaction),
        }),
      });

      if (!sendResponse.ok) {
        const errorData = await sendResponse.json();
        throw new Error(errorData.error || "Failed to send transaction");
      }

      const { signature } = await sendResponse.json();

      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }

      // Close the form after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error during withdraw:", err);
      setError(
        err instanceof Error ? err.message : "An error occurred during withdraw"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Set the max amount
  const handleSetMaxAmount = () => {
    setAmount(maxAmount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2>Withdraw Funds</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h3 className="text-xl mb-2">Withdraw Successful!</h3>
            <p className="text-gray-400">
              Your funds are on their way to your wallet.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-400 mb-2">Asset</label>
              <select
                className="drift-input w-full"
                value={marketIndex}
                onChange={(e) => setMarketIndex(parseInt(e.target.value))}
              >
                {MARKETS.map((market) => {
                  const balance = balances.find(
                    (b) => b.marketIndex === market.index
                  );
                  const balanceAmount =
                    balance && parseFloat(balance.amount) > 0
                      ? ` (${parseFloat(balance.amount).toFixed(4)})`
                      : "";

                  return (
                    <option key={market.index} value={market.index}>
                      {market.symbol} - {market.name}
                      {balanceAmount}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-gray-400">Amount</label>
                <button
                  type="button"
                  onClick={handleSetMaxAmount}
                  className="text-sm text-[rgb(var(--drift-secondary))]"
                >
                  Max: {parseFloat(maxAmount).toFixed(4)}
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  className="drift-input w-full pr-16"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="any"
                  min="0"
                  max={maxAmount}
                />
                <div className="absolute right-3 top-2 text-gray-400">
                  {MARKETS.find((m) => m.index === marketIndex)?.symbol}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-500 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="drift-button-secondary flex-1"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="drift-button flex-1"
                disabled={isLoading || parseFloat(maxAmount) <= 0}
              >
                {isLoading ? "Processing..." : "Withdraw"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default WithdrawForm;
