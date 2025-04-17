"use client";

import { FC } from "react";
import { useUserStore } from "@/store";

interface PositionsListProps {
  onClickNewPosition?: () => void;
}

const PositionsList: FC<PositionsListProps> = ({ onClickNewPosition }) => {
  const { positions, loadingData } = useUserStore();

  if (loadingData) {
    return (
      <div className="drift-card animate-pulse">
        <h3 className="mb-4">Perpetual Positions</h3>
        <div className="h-40 bg-gray-800 rounded-md"></div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="drift-card">
        <h3 className="mb-4">Perpetual Positions</h3>
        <p>No positions found.</p>
        {onClickNewPosition && (
          <button onClick={onClickNewPosition} className="drift-button mt-4">
            Open a Position
          </button>
        )}
      </div>
    );
  }

  // Calculate total PnL
  const totalPnL = positions.reduce((total, position) => {
    return total + parseFloat(position.pnl);
  }, 0);

  return (
    <div className="drift-card">
      <div className="flex justify-between items-center mb-4">
        <h3>Perpetual Positions</h3>
        <div className="text-right">
          <p className="text-gray-400 text-sm">Total PnL</p>
          <p
            className={`text-xl font-bold ${
              totalPnL >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            ${totalPnL.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 text-left">
              <th className="pb-2">Market</th>
              <th className="pb-2">Side</th>
              <th className="pb-2">Size</th>
              <th className="pb-2">Entry Price</th>
              <th className="pb-2">Mark Price</th>
              <th className="pb-2 text-right">PnL</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr
                key={position.marketIndex}
                className="border-t border-gray-800"
              >
                <td className="py-3">{position.symbol}</td>
                <td
                  className={`py-3 ${
                    position.isLong ? "long-position" : "short-position"
                  }`}
                >
                  {position.isLong ? "LONG" : "SHORT"}
                </td>
                <td className="py-3">
                  {Math.abs(parseFloat(position.baseAssetAmount)).toFixed(4)}
                </td>
                <td className="py-3">
                  ${parseFloat(position.entryPrice).toFixed(2)}
                </td>
                <td className="py-3">
                  ${parseFloat(position.markPrice).toFixed(2)}
                </td>
                <td
                  className={`py-3 text-right ${
                    parseFloat(position.pnl) >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  ${parseFloat(position.pnl).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onClickNewPosition && (
        <button onClick={onClickNewPosition} className="drift-button mt-4">
          New Position
        </button>
      )}
    </div>
  );
};

export default PositionsList;
