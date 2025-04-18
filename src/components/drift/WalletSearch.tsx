"use client";

import { FC, useState } from "react";
import { useUserStore } from "@/store";
import { PublicKey } from "@solana/web3.js";

interface WalletSearchProps {
  onSearchComplete?: () => void;
}

const WalletSearch: FC<WalletSearchProps> = ({ onSearchComplete }) => {
  const { setSearchAddress, searchAddress, setError } = useUserStore();
  const [inputAddress, setInputAddress] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Trim input to remove any whitespace
      const trimmedAddress = inputAddress.trim();

      if (!trimmedAddress) {
        throw new Error("Please enter a wallet address");
      }

      // Validate Solana address
      try {
        new PublicKey(trimmedAddress);
      } catch (error) {
        throw new Error(
          "Invalid Solana address format. Please enter a valid address."
        );
      }

      // Set the search address in the store
      setSearchAddress(trimmedAddress);
      setError(null);

      // Notify parent component
      if (onSearchComplete) {
        onSearchComplete();
      }
    } catch (error) {
      console.error("Invalid address format:", error);
      setError(
        error instanceof Error ? error.message : "Invalid address format"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchAddress("");
    setInputAddress("");
    setError(null);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex space-x-2">
        <input
          type="text"
          className="drift-input flex-1"
          placeholder="Enter Solana Wallet Address"
          value={inputAddress}
          onChange={(e) => setInputAddress(e.target.value)}
        />
        <button
          type="submit"
          className="drift-button whitespace-nowrap"
          disabled={isLoading || !inputAddress.trim()}
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>

      {searchAddress && (
        <div className="mt-2 flex justify-between text-sm text-gray-400">
          <div>
            Viewing:{" "}
            <span className="text-white font-mono">
              {searchAddress.slice(0, 8)}...{searchAddress.slice(-8)}
            </span>
          </div>
          <button
            onClick={clearSearch}
            className="text-[rgb(var(--drift-secondary))] hover:underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletSearch;
