"use client";

import { FC } from "react";
import { useUserStore } from "@/store";

interface OrdersListProps {
  onClickNewOrder?: () => void;
}

const OrdersList: FC<OrdersListProps> = ({ onClickNewOrder }) => {
  const { orders, loadingData } = useUserStore();

  if (loadingData) {
    return (
      <div className="drift-card animate-pulse">
        <h3 className="mb-4">Open Orders</h3>
        <div className="h-40 bg-gray-800 rounded-md"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="drift-card">
        <h3 className="mb-4">Open Orders</h3>
        <p>No open orders found.</p>
        {onClickNewOrder && (
          <button onClick={onClickNewOrder} className="drift-button mt-4">
            Place an Order
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="drift-card">
      <div className="flex justify-between items-center mb-4">
        <h3>Open Orders</h3>
        <span className="text-sm bg-gray-800 px-3 py-1 rounded-full">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 text-left">
              <th className="pb-2">Market</th>
              <th className="pb-2">Side</th>
              <th className="pb-2">Type</th>
              <th className="pb-2">Size</th>
              <th className="pb-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.orderId} className="border-t border-gray-800">
                <td className="py-3">{order.symbol}</td>
                <td
                  className={`py-3 ${
                    order.direction === "LONG"
                      ? "long-position"
                      : "short-position"
                  }`}
                >
                  {order.direction}
                </td>
                <td className="py-3">{order.type}</td>
                <td className="py-3">{parseFloat(order.size).toFixed(4)}</td>
                <td className="py-3 text-right">
                  ${parseFloat(order.price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {onClickNewOrder && (
        <button onClick={onClickNewOrder} className="drift-button mt-4">
          New Order
        </button>
      )}
    </div>
  );
};

export default OrdersList;
