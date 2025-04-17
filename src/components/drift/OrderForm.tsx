"use client";

import { FC, useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useUserStore, useOrderFormStore } from "@/store";
import { Transaction } from "@solana/web3.js";
import { OrderType, PositionDirection } from "@/store";

interface OrderFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

// Market options for perp trading
const PERP_MARKETS = [
  { index: 0, symbol: "SOL-PERP", name: "Solana Perpetual" },
  { index: 1, symbol: "BTC-PERP", name: "Bitcoin Perpetual" },
  { index: 2, symbol: "ETH-PERP", name: "Ethereum Perpetual" },
  { index: 18, symbol: "JTO-PERP", name: "Jito Perpetual" },
  { index: 6, symbol: "BONK-PERP", name: "Bonk Perpetual" },
];

const OrderForm: FC<OrderFormProps> = ({ onClose, onSuccess }) => {
  const { publicKey, signTransaction } = useWallet();
  const { activeSubaccountId } = useUserStore();
  const orderForm = useOrderFormStore();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Switch between different order tabs
  const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic");

  // Effect to reset form when closed
  useEffect(() => {
    return () => {
      if (!success) {
        orderForm.resetForm();
      }
    };
  }, [success, orderForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publicKey || !signTransaction || activeSubaccountId === null) {
      setError("Wallet not connected or no active subaccount selected");
      return;
    }

    if (!orderForm.size || parseFloat(orderForm.size) <= 0) {
      setError("Please enter a valid size");
      return;
    }

    // Validate limit price if needed
    if (
      orderForm.orderType === OrderType.LIMIT &&
      (!orderForm.price || parseFloat(orderForm.price) <= 0)
    ) {
      setError("Please enter a valid limit price");
      return;
    }

    // Validate trigger price if needed
    if (
      (orderForm.orderType === OrderType.TRIGGER_MARKET ||
        orderForm.orderType === OrderType.TRIGGER_LIMIT) &&
      (!orderForm.triggerPrice || parseFloat(orderForm.triggerPrice) <= 0)
    ) {
      setError("Please enter a valid trigger price");
      return;
    }

    // Validate scaled order prices if needed
    if (
      orderForm.isScaledOrder &&
      (!orderForm.scaledOrderMinPrice ||
        !orderForm.scaledOrderMaxPrice ||
        parseFloat(orderForm.scaledOrderMinPrice) <= 0 ||
        parseFloat(orderForm.scaledOrderMaxPrice) <= 0 ||
        parseFloat(orderForm.scaledOrderMinPrice) >=
          parseFloat(orderForm.scaledOrderMaxPrice))
    ) {
      setError("Please enter valid min and max prices for scaled orders");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Format the direction to a string
      const directionStr =
        orderForm.direction === PositionDirection.LONG ? "LONG" : "SHORT";

      // Format the order type to a string
      let orderTypeStr;
      switch (orderForm.orderType) {
        case OrderType.MARKET:
          orderTypeStr = "MARKET";
          break;
        case OrderType.LIMIT:
          orderTypeStr = "LIMIT";
          break;
        case OrderType.TRIGGER_MARKET:
          orderTypeStr = "TRIGGER_MARKET";
          break;
        case OrderType.TRIGGER_LIMIT:
          orderTypeStr = "TRIGGER_LIMIT";
          break;
        default:
          orderTypeStr = "MARKET";
      }

      // Call our API endpoint to create the order transaction
      const response = await fetch("/api/drift/placeOrder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletPublicKey: publicKey.toString(),
          marketIndex: orderForm.marketIndex,
          size: orderForm.size,
          price: orderForm.price,
          direction: directionStr,
          orderType: orderTypeStr,
          subAccountId: activeSubaccountId,
          isScaledOrder: orderForm.isScaledOrder,
          scaledOrderCount: orderForm.scaledOrderCount,
          scaledOrderMinPrice: orderForm.scaledOrderMinPrice,
          scaledOrderMaxPrice: orderForm.scaledOrderMaxPrice,
          takeProfitPrice: orderForm.takeProfitPrice,
          stopLossPrice: orderForm.stopLossPrice,
          triggerPrice: orderForm.triggerPrice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to create order transaction"
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

      // Reset form after successful submission
      orderForm.resetForm();

      // Close the form after a short delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Error placing order:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while placing the order"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2>Place Order</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <h3 className="text-xl mb-2">Order Placed Successfully!</h3>
            <p className="text-gray-400">
              Your order has been sent to the market.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-800">
              <button
                type="button"
                className={`${
                  activeTab === "basic" ? "drift-tab-active" : "drift-tab"
                }`}
                onClick={() => setActiveTab("basic")}
              >
                Basic
              </button>
              <button
                type="button"
                className={`${
                  activeTab === "advanced" ? "drift-tab-active" : "drift-tab"
                }`}
                onClick={() => setActiveTab("advanced")}
              >
                Advanced
              </button>
            </div>

            <div>
              <label className="block text-gray-400 mb-2">Market</label>
              <select
                className="drift-input w-full"
                value={orderForm.marketIndex}
                onChange={(e) => {
                  const index = parseInt(e.target.value);
                  orderForm.setMarketIndex(index);
                  orderForm.setSymbol(
                    PERP_MARKETS.find((m) => m.index === index)?.symbol || ""
                  );
                }}
              >
                {PERP_MARKETS.map((market) => (
                  <option key={market.index} value={market.index}>
                    {market.symbol} - {market.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Direction Buttons */}
            <div>
              <label className="block text-gray-400 mb-2">Direction</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className={`py-2 px-4 rounded-md font-semibold ${
                    orderForm.direction === PositionDirection.LONG
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                  onClick={() => orderForm.setDirection(PositionDirection.LONG)}
                >
                  LONG
                </button>
                <button
                  type="button"
                  className={`py-2 px-4 rounded-md font-semibold ${
                    orderForm.direction === PositionDirection.SHORT
                      ? "bg-red-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                  onClick={() =>
                    orderForm.setDirection(PositionDirection.SHORT)
                  }
                >
                  SHORT
                </button>
              </div>
            </div>

            {/* Order Type */}
            <div>
              <label className="block text-gray-400 mb-2">Order Type</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  className={`py-2 px-4 rounded-md font-semibold ${
                    orderForm.orderType === OrderType.MARKET
                      ? "bg-[rgb(var(--drift-primary))] text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                  onClick={() => orderForm.setOrderType(OrderType.MARKET)}
                >
                  MARKET
                </button>
                <button
                  type="button"
                  className={`py-2 px-4 rounded-md font-semibold ${
                    orderForm.orderType === OrderType.LIMIT
                      ? "bg-[rgb(var(--drift-primary))] text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                  onClick={() => orderForm.setOrderType(OrderType.LIMIT)}
                >
                  LIMIT
                </button>
                {activeTab === "advanced" && (
                  <>
                    <button
                      type="button"
                      className={`py-2 px-4 rounded-md font-semibold ${
                        orderForm.orderType === OrderType.TRIGGER_MARKET
                          ? "bg-[rgb(var(--drift-primary))] text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                      onClick={() =>
                        orderForm.setOrderType(OrderType.TRIGGER_MARKET)
                      }
                    >
                      TRIGGER MARKET
                    </button>
                    <button
                      type="button"
                      className={`py-2 px-4 rounded-md font-semibold ${
                        orderForm.orderType === OrderType.TRIGGER_LIMIT
                          ? "bg-[rgb(var(--drift-primary))] text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                      onClick={() =>
                        orderForm.setOrderType(OrderType.TRIGGER_LIMIT)
                      }
                    >
                      TRIGGER LIMIT
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="block text-gray-400 mb-2">Size</label>
              <div className="relative">
                <input
                  type="number"
                  className="drift-input w-full"
                  placeholder="0.00"
                  value={orderForm.size}
                  onChange={(e) => orderForm.setSize(e.target.value)}
                  step="any"
                  min="0"
                />
              </div>
            </div>

            {/* Price (for limit orders) */}
            {(orderForm.orderType === OrderType.LIMIT ||
              orderForm.orderType === OrderType.TRIGGER_LIMIT) && (
              <div>
                <label className="block text-gray-400 mb-2">Price</label>
                <div className="relative">
                  <input
                    type="number"
                    className="drift-input w-full"
                    placeholder="0.00"
                    value={orderForm.price}
                    onChange={(e) => orderForm.setPrice(e.target.value)}
                    step="any"
                    min="0"
                  />
                </div>
              </div>
            )}

            {/* Trigger Price (for trigger orders) */}
            {(orderForm.orderType === OrderType.TRIGGER_MARKET ||
              orderForm.orderType === OrderType.TRIGGER_LIMIT) && (
              <div>
                <label className="block text-gray-400 mb-2">
                  Trigger Price
                </label>
                <div className="relative">
                  <input
                    type="number"
                    className="drift-input w-full"
                    placeholder="0.00"
                    value={orderForm.triggerPrice}
                    onChange={(e) => orderForm.setTriggerPrice(e.target.value)}
                    step="any"
                    min="0"
                  />
                </div>
              </div>
            )}

            {/* Advanced Options */}
            {activeTab === "advanced" && (
              <>
                {/* Take Profit / Stop Loss */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-400 border-b border-gray-800 pb-2">
                    Take Profit / Stop Loss
                  </h3>

                  <div>
                    <label className="block text-gray-400 mb-2">
                      Take Profit Price
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        className="drift-input w-full"
                        placeholder="0.00"
                        value={orderForm.takeProfitPrice}
                        onChange={(e) =>
                          orderForm.setTakeProfitPrice(e.target.value)
                        }
                        step="any"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-2">
                      Stop Loss Price
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        className="drift-input w-full"
                        placeholder="0.00"
                        value={orderForm.stopLossPrice}
                        onChange={(e) =>
                          orderForm.setStopLossPrice(e.target.value)
                        }
                        step="any"
                        min="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Scaled Orders */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <h3 className="text-sm font-medium text-gray-400">
                      Scaled Orders
                    </h3>
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={orderForm.isScaledOrder}
                        onChange={(e) =>
                          orderForm.setIsScaledOrder(e.target.checked)
                        }
                      />
                      <div className="relative w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[rgb(var(--drift-primary))]"></div>
                    </label>
                  </div>

                  {orderForm.isScaledOrder && (
                    <>
                      <div>
                        <label className="block text-gray-400 mb-2">
                          Number of Orders
                        </label>
                        <input
                          type="number"
                          className="drift-input w-full"
                          value={orderForm.scaledOrderCount}
                          onChange={(e) =>
                            orderForm.setScaledOrderCount(
                              parseInt(e.target.value)
                            )
                          }
                          min="2"
                          max="10"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-2">
                          Min Price
                        </label>
                        <input
                          type="number"
                          className="drift-input w-full"
                          placeholder="0.00"
                          value={orderForm.scaledOrderMinPrice}
                          onChange={(e) =>
                            orderForm.setScaledOrderMinPrice(e.target.value)
                          }
                          step="any"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-2">
                          Max Price
                        </label>
                        <input
                          type="number"
                          className="drift-input w-full"
                          placeholder="0.00"
                          value={orderForm.scaledOrderMaxPrice}
                          onChange={(e) =>
                            orderForm.setScaledOrderMaxPrice(e.target.value)
                          }
                          step="any"
                          min="0"
                        />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

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
                className={`drift-button flex-1 ${
                  orderForm.direction === PositionDirection.LONG
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
                disabled={isLoading}
              >
                {isLoading
                  ? "Processing..."
                  : `${
                      orderForm.direction === PositionDirection.LONG
                        ? "Long"
                        : "Short"
                    } ${orderForm.symbol}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default OrderForm;
