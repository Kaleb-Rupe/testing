// src/components/solana/solana-provider.tsx (UPDATED)
"use client";

import { WalletError } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { ReactNode, useCallback, useMemo } from "react";

require("@solana/wallet-adapter-react-ui/styles.css");

export function SolanaProvider({ children }: { children: ReactNode }) {
  // Using either the provided RPC_URL or falling back to the public Solana mainnet endpoint
  const endpoint =
    process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

  // Initialize wallet adapters - adding more popular wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  const onError = useCallback((error: WalletError) => {
    console.error("Wallet error:", error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} onError={onError} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default SolanaProvider;
