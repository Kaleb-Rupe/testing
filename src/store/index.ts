// src/store/index.ts
import { create } from "zustand";
import { OrderType, PositionDirection } from "@drift-labs/sdk";

export interface SubaccountData {
  id: number;
  name: string;
  authority: string;
}

export interface BalanceData {
  marketIndex: number;
  symbol: string;
  amount: string;
  usdValue: string;
  isDeposit: boolean;
}

export interface PositionData {
  marketIndex: number;
  symbol: string;
  baseAssetAmount: string;
  quoteAssetAmount: string;
  entryPrice: string;
  markPrice: string;
  pnl: string;
  isLong: boolean;
}

export interface OrderData {
  orderId: number;
  marketIndex: number;
  symbol: string;
  direction: string;
  type: string;
  price: string;
  size: string;
  status: string;
}

export interface UserState {
  connected: boolean;
  loadingSubaccounts: boolean;
  loadingData: boolean;
  searchAddress: string;
  subaccounts: SubaccountData[];
  activeSubaccountId: number | null;
  balances: BalanceData[];
  positions: PositionData[];
  orders: OrderData[];
  error: string | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setSearchAddress: (address: string) => void;
  setSubaccounts: (subaccounts: SubaccountData[]) => void;
  setActiveSubaccountId: (id: number | null) => void;
  setBalances: (balances: BalanceData[]) => void;
  setPositions: (positions: PositionData[]) => void;
  setOrders: (orders: OrderData[]) => void;
  setLoadingSubaccounts: (loading: boolean) => void;
  setLoadingData: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearData: () => void;
}

export interface OrderFormState {
  marketIndex: number;
  symbol: string;
  price: string;
  size: string;
  direction: PositionDirection;
  orderType: OrderType;
  triggerPrice: string;
  takeProfitPrice: string;
  stopLossPrice: string;
  isScaledOrder: boolean;
  scaledOrderCount: number;
  scaledOrderMinPrice: string;
  scaledOrderMaxPrice: string;

  // Actions
  setMarketIndex: (marketIndex: number) => void;
  setSymbol: (symbol: string) => void;
  setPrice: (price: string) => void;
  setSize: (size: string) => void;
  setDirection: (direction: PositionDirection) => void;
  setOrderType: (type: OrderType) => void;
  setTriggerPrice: (price: string) => void;
  setTakeProfitPrice: (price: string) => void;
  setStopLossPrice: (price: string) => void;
  setIsScaledOrder: (isScaled: boolean) => void;
  setScaledOrderCount: (count: number) => void;
  setScaledOrderMinPrice: (price: string) => void;
  setScaledOrderMaxPrice: (price: string) => void;
  resetForm: () => void;
}

// User Store
export const useUserStore = create<UserState>((set) => ({
  connected: false,
  loadingSubaccounts: false,
  loadingData: false,
  searchAddress: "",
  subaccounts: [],
  activeSubaccountId: null,
  balances: [],
  positions: [],
  orders: [],
  error: null,

  setConnected: (connected) => set({ connected }),
  setSearchAddress: (address) => set({ searchAddress: address }),
  setSubaccounts: (subaccounts) => set({ subaccounts }),
  setActiveSubaccountId: (id) => set({ activeSubaccountId: id }),
  setBalances: (balances) => set({ balances }),
  setPositions: (positions) => set({ positions }),
  setOrders: (orders) => set({ orders }),
  setLoadingSubaccounts: (loading) => set({ loadingSubaccounts: loading }),
  setLoadingData: (loading) => set({ loadingData: loading }),
  setError: (error) => set({ error }),
  clearData: () =>
    set({
      balances: [],
      positions: [],
      orders: [],
      error: null,
    }),
}));

// Order Form Store
export const useOrderFormStore = create<OrderFormState>((set) => ({
  marketIndex: 0, // Default to SOL-PERP
  symbol: "SOL-PERP",
  price: "",
  size: "",
  direction: PositionDirection.LONG,
  orderType: OrderType.MARKET,
  triggerPrice: "",
  takeProfitPrice: "",
  stopLossPrice: "",
  isScaledOrder: false,
  scaledOrderCount: 3,
  scaledOrderMinPrice: "",
  scaledOrderMaxPrice: "",

  setMarketIndex: (marketIndex) => set({ marketIndex }),
  setSymbol: (symbol) => set({ symbol }),
  setPrice: (price) => set({ price }),
  setSize: (size) => set({ size }),
  setDirection: (direction) => set({ direction }),
  setOrderType: (type) => set({ orderType: type }),
  setTriggerPrice: (price) => set({ triggerPrice: price }),
  setTakeProfitPrice: (price) => set({ takeProfitPrice: price }),
  setStopLossPrice: (price) => set({ stopLossPrice: price }),
  setIsScaledOrder: (isScaled) => set({ isScaledOrder: isScaled }),
  setScaledOrderCount: (count) => set({ scaledOrderCount: count }),
  setScaledOrderMinPrice: (price) => set({ scaledOrderMinPrice: price }),
  setScaledOrderMaxPrice: (price) => set({ scaledOrderMaxPrice: price }),
  resetForm: () =>
    set({
      price: "",
      size: "",
      direction: PositionDirection.LONG,
      orderType: OrderType.MARKET,
      triggerPrice: "",
      takeProfitPrice: "",
      stopLossPrice: "",
      isScaledOrder: false,
      scaledOrderCount: 3,
      scaledOrderMinPrice: "",
      scaledOrderMaxPrice: "",
    }),
}));