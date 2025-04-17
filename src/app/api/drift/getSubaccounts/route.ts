// src/app/api/drift/getSubaccounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserAccountsForAuthority } from "@/app/api/drift/utils/driftClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const userAccounts = await getUserAccountsForAuthority(walletAddress);

    const subaccounts = userAccounts.map((acc) => ({
      id: acc.subAccountId,
      name: acc.name || `Subaccount ${acc.subAccountId}`,
      authority: acc.authority.toString(),
      publicKey: acc.delegate.toString(),
    }));

    return NextResponse.json({ subaccounts });
  } catch (error) {
    console.error("Error fetching subaccounts:", error);
    return NextResponse.json(
      { error: "Failed to fetch subaccounts" },
      { status: 500 }
    );
  }
}
