"use client";

import { FC, useEffect, useState } from "react";
import { useUserStore } from "@/store";
import { useWallet } from "@solana/wallet-adapter-react";

interface SubaccountsListProps {
  walletAddress?: string;
}

const SubaccountsList: FC<SubaccountsListProps> = ({ walletAddress }) => {
  const {
    subaccounts,
    setSubaccounts,
    activeSubaccountId,
    setActiveSubaccountId,
    setLoadingSubaccounts,
    loadingSubaccounts,
    setError,
  } = useUserStore();
  const { publicKey } = useWallet();
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress && !publicKey) return;
    const addressToUse = walletAddress || publicKey?.toString();
    setAddress(addressToUse || null);
  }, [walletAddress, publicKey]);

  useEffect(() => {
    if (!address) return;

    const fetchSubaccounts = async () => {
      try {
        setLoadingSubaccounts(true);
        const response = await fetch("/api/drift/getSubaccounts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ walletAddress: address }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch subaccounts");
        }

        const data = await response.json();

        if (data.subaccounts && Array.isArray(data.subaccounts)) {
          setSubaccounts(data.subaccounts);

          // Set the first subaccount as active if there is no active subaccount
          if (data.subaccounts.length > 0 && activeSubaccountId === null) {
            setActiveSubaccountId(data.subaccounts[0].id);
          }
        } else {
          console.error("Invalid subaccounts data format", data);
          setError("Invalid data format received from the server");
        }
      } catch (error) {
        console.error("Error fetching subaccounts:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch subaccounts"
        );
      } finally {
        setLoadingSubaccounts(false);
      }
    };

    fetchSubaccounts();
  }, [
    address,
    setSubaccounts,
    setActiveSubaccountId,
    setLoadingSubaccounts,
    setError,
    activeSubaccountId,
  ]);

  if (loadingSubaccounts) {
    return (
      <div className="drift-card animate-pulse">Loading subaccounts...</div>
    );
  }

  if (subaccounts.length === 0) {
    return (
      <div className="drift-card">
        <p>No subaccounts found.</p>
      </div>
    );
  }

  return (
    <div className="drift-card">
      <h3 className="mb-4">Subaccounts</h3>
      <div className="space-y-2">
        {subaccounts.map((subaccount) => (
          <div
            key={subaccount.id}
            className={`p-3 rounded-md cursor-pointer transition-colors ${
              activeSubaccountId === subaccount.id
                ? "bg-[rgba(var(--drift-primary),0.3)] border border-[rgb(var(--drift-primary))]"
                : "bg-gray-800 hover:bg-gray-700"
            }`}
            onClick={() => setActiveSubaccountId(subaccount.id)}
          >
            <p className="font-medium">{subaccount.name}</p>
            <p className="text-sm text-gray-400">ID: {subaccount.id}</p>
            <p className="text-xs text-gray-500 truncate">
              {subaccount.authority.slice(0, 8)}...
              {subaccount.authority.slice(-8)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubaccountsList;
