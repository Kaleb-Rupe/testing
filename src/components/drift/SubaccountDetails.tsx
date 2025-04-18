"use client";

import { FC, useEffect, useState } from "react";
import { useUserStore } from "@/store";
import BalancesList from "./BalancesList";
import PositionsList from "./PositionsList";
import OrdersList from "./OrdersList";
import DepositForm from "./DepositForm";
import WithdrawForm from "./WithdrawForm";
import OrderForm from "./OrderForm";

interface SubaccountDetailsProps {
  walletAddress?: string;
}

const SubaccountDetails: FC<SubaccountDetailsProps> = ({ walletAddress }) => {
  const {
    subaccounts,
    activeSubaccountId,
    setBalances,
    setPositions,
    setOrders,
    setLoadingData,
    loadingData,
    setError,
  } = useUserStore();

  const [showDepositForm, setShowDepositForm] = useState<boolean>(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState<boolean>(false);
  const [showOrderForm, setShowOrderForm] = useState<boolean>(false);

  // Find the active subaccount
  const activeSubaccount = subaccounts.find(
    (sub) => sub.id === activeSubaccountId
  );

  useEffect(() => {
    if (!activeSubaccount) return;

    const fetchSubaccountData = async () => {
      try {
        setLoadingData(true);
        const response = await fetch("/api/drift/getUser", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userAccountPublicKey: activeSubaccount.authority,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch user data");
        }

        const data = await response.json();

        // Verify data structure before setting state
        if (data) {
          setBalances(Array.isArray(data.balances) ? data.balances : []);
          setPositions(Array.isArray(data.positions) ? data.positions : []);
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        } else {
          console.error("Invalid data format received:", data);
          setError("Invalid data format received from server");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch user data"
        );
      } finally {
        setLoadingData(false);
      }
    };

    fetchSubaccountData();
  }, [
    activeSubaccount,
    setBalances,
    setPositions,
    setOrders,
    setLoadingData,
    setError,
  ]);

  if (!activeSubaccount) {
    return (
      <div className="drift-card">
        <h3 className="mb-4">No Subaccount Selected</h3>
        <p>Please select a subaccount to view details.</p>
      </div>
    );
  }

  const handleRefreshData = () => {
    // Find the active subaccount again
    const currentSubaccount = subaccounts.find(
      (sub) => sub.id === activeSubaccountId
    );
    if (currentSubaccount) {
      // Fetch data again
      setLoadingData(true);
      fetch("/api/drift/getUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAccountPublicKey: currentSubaccount.authority,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to fetch user data");
          }
          const data = await response.json();
          if (data) {
            setBalances(Array.isArray(data.balances) ? data.balances : []);
            setPositions(Array.isArray(data.positions) ? data.positions : []);
            setOrders(Array.isArray(data.orders) ? data.orders : []);
          } else {
            throw new Error("Invalid data format received from server");
          }
        })
        .catch((error) => {
          console.error("Error refreshing data:", error);
          setError(
            error instanceof Error ? error.message : "Failed to refresh data"
          );
        })
        .finally(() => {
          setLoadingData(false);
        });
    }
  };

  return (
    <div className="space-y-6">
      <div className="drift-card">
        <div className="flex justify-between items-center">
          <div>
            <h2>
              {activeSubaccount.name || `Subaccount ${activeSubaccount.id}`}
            </h2>
            <p className="text-sm text-gray-400">ID: {activeSubaccount.id}</p>
          </div>
          <button
            onClick={handleRefreshData}
            className="drift-button-secondary flex items-center space-x-1"
            disabled={loadingData}
          >
            <span>{loadingData ? "Loading..." : "Refresh"}</span>
            {!loadingData && <span className="text-lg">↻</span>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BalancesList
          onClickDeposit={() => setShowDepositForm(true)}
          onClickWithdraw={() => setShowWithdrawForm(true)}
        />
        <PositionsList onClickNewPosition={() => setShowOrderForm(true)} />
      </div>

      <OrdersList onClickNewOrder={() => setShowOrderForm(true)} />

      {showDepositForm && (
        <DepositForm
          onClose={() => setShowDepositForm(false)}
          onSuccess={handleRefreshData}
        />
      )}

      {showWithdrawForm && (
        <WithdrawForm
          onClose={() => setShowWithdrawForm(false)}
          onSuccess={handleRefreshData}
        />
      )}

      {showOrderForm && (
        <OrderForm
          onClose={() => setShowOrderForm(false)}
          onSuccess={handleRefreshData}
        />
      )}
    </div>
  );
};

export default SubaccountDetails;
