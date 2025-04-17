// src/app/api/drift/getUser/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserData } from "@/app/api/drift/utils/driftClient";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userAccountPublicKey } = body;

    if (!userAccountPublicKey) {
      return NextResponse.json(
        { error: "User account public key is required" },
        { status: 400 }
      );
    }

    const userData = await getUserData(userAccountPublicKey);

    return NextResponse.json(userData);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}
