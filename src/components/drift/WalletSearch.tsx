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
      // Validate Solana address
      new PublicKey(inputAddress);

      // Set the search address in the store
      setSearchAddress(inputAddress);
      setError(null);

      // Notify parent component
      if (onSearchComplete) {
        onSearchComplete();
      }
    } catch (error) {
      console.error("Invalid address format:", error);
      setError("Invalid Solana address format. Please enter a valid address.");
    } finally {
      setIsLoading(false);
    }
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
          disabled={isLoading || !inputAddress}
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>

      {searchAddress && (
        <div className="mt-2 text-sm text-gray-400">
          Currently viewing:{" "}
          <span className="text-white font-mono">
            {searchAddress.slice(0, 4)}...{searchAddress.slice(-4)}
          </span>
        </div>
      )}
    </div>
  );
};

export default WalletSearch;
