"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { useUserStore } from "@/store";
import SubaccountsList from "@/components/drift/SubaccountsList";
import SubaccountDetails from "@/components/drift/SubaccountDetails";
import WalletSearch from "@/components/drift/WalletSearch";

// Dynamically import the WalletMultiButton to prevent SSR issues
const WalletMultiButton = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function DriftPage() {
  const { connected, publicKey } = useWallet();
  const { setConnected, error, setError, searchAddress, setSearchAddress } =
    useUserStore();

  const [showWalletSearch, setShowWalletSearch] = useState<boolean>(false);

  // Set connected status in store when wallet connection changes
  useEffect(() => {
    setConnected(connected);
    if (connected && publicKey) {
      setSearchAddress("");
    }
  }, [connected, publicKey, setConnected, setSearchAddress]);

  // Toggle wallet search
  const toggleWalletSearch = () => {
    setShowWalletSearch(!showWalletSearch);
    if (!showWalletSearch) {
      setSearchAddress("");
    }
  };

  // Helper to determine if we can show account data
  const canShowAccountData =
    connected || (!!searchAddress && searchAddress.length > 0);

  return (
    <main className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
            <h1 className="text-4xl font-bold text-white">
              Drift Protocol Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              {!connected && (
                <WalletMultiButton className="!bg-[rgb(var(--drift-primary))] !hover:bg-[rgb(var(--drift-secondary))] !text-white !font-bold !py-2 !px-4 !rounded !transition-colors" />
              )}
              <button
                onClick={toggleWalletSearch}
                className="drift-button-secondary"
              >
                {showWalletSearch ? "Hide Search" : "Search Wallet"}
              </button>
            </div>
          </div>

          {showWalletSearch && (
            <div className="mb-6">
              <WalletSearch
                onSearchComplete={() => setShowWalletSearch(false)}
              />
            </div>
          )}

          {error && (
            <div className="bg-red-900 bg-opacity-20 border border-red-500 text-red-500 p-4 rounded-md mb-6 flex justify-between items-center">
              <p>{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            {canShowAccountData ? (
              <SubaccountsList walletAddress={searchAddress || undefined} />
            ) : (
              <div className="drift-card">
                <h2 className="mb-4">Welcome to Drift Protocol Dashboard</h2>
                <p className="mb-4">
                  Connect your wallet to view your subaccounts, balances, and
                  positions, or search for another wallet.
                </p>
              </div>
            )}
          </div>

          <div className="md:col-span-3">
            {canShowAccountData ? (
              <SubaccountDetails walletAddress={searchAddress || undefined} />
            ) : (
              <div className="drift-card">
                <div className="text-center py-8">
                  <h3 className="text-2xl mb-4">Get Started</h3>
                  <p className="text-gray-400 mb-6">
                    Connect your wallet or search for a wallet to view its data
                    on the Drift Protocol.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-4">
                    <WalletMultiButton className="!bg-[rgb(var(--drift-primary))] !hover:bg-[rgb(var(--drift-secondary))] !text-white !font-bold !py-2 !px-4 !rounded !transition-colors" />
                    <button
                      onClick={() => setShowWalletSearch(true)}
                      className="drift-button-secondary"
                    >
                      Search Wallet
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
