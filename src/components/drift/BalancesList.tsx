"use client";

import { FC } from "react";
import { useUserStore } from "@/store";

interface BalancesListProps {
  onClickDeposit?: () => void;
  onClickWithdraw?: () => void;
}

const BalancesList: FC<BalancesListProps> = ({
  onClickDeposit,
  onClickWithdraw,
}) => {
  const { balances, loadingData } = useUserStore();

  if (loadingData) {
    return (
      <div className="drift-card animate-pulse">
        <h3 className="mb-4">Balances</h3>
        <div className="h-40 bg-gray-800 rounded-md"></div>
      </div>
    );
  }

  if (!balances || balances.length === 0) {
    return (
      <div className="drift-card">
        <h3 className="mb-4">Balances</h3>
        <p>No balances found.</p>
        {onClickDeposit && (
          <button onClick={onClickDeposit} className="drift-button mt-4">
            Make a Deposit
          </button>
        )}
      </div>
    );
  }

  // Calculate total balance in USD
  const totalBalanceUSD = balances.reduce((total, balance) => {
    return total + parseFloat(balance.usdValue || "0");
  }, 0);

  return (
    <div className="drift-card">
      <div className="flex justify-between items-center mb-4">
        <h3>Balances</h3>
        <div className="text-right">
          <p className="text-gray-400 text-sm">Total Balance</p>
          <p className="text-xl font-bold">${totalBalanceUSD.toFixed(2)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 text-left">
              <th className="pb-2">Asset</th>
              <th className="pb-2">Amount</th>
              <th className="pb-2 text-right">USD Value</th>
            </tr>
          </thead>
          <tbody>
            {balances.map((balance) => (
              <tr
                key={balance.marketIndex}
                className="border-t border-gray-800"
              >
                <td className="py-3">{balance.symbol}</td>
                <td
                  className={`py-3 ${
                    balance.isDeposit ? "deposit-balance" : "borrow-balance"
                  }`}
                >
                  {parseFloat(balance.amount || "0").toFixed(4)}
                </td>
                <td className="py-3 text-right">
                  ${parseFloat(balance.usdValue || "0").toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex space-x-4 mt-4">
        {onClickDeposit && (
          <button onClick={onClickDeposit} className="drift-button flex-1">
            Deposit
          </button>
        )}
        {onClickWithdraw && (
          <button
            onClick={onClickWithdraw}
            className="drift-button-secondary flex-1"
          >
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
};

export default BalancesList;
