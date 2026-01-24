
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import * as CoinsSDK from "@zoralabs/coins-sdk";
import 'dotenv/config';

async function testZoraIntegration() {
  console.log("--- Testing Zora SDK Integration ---");

  // 1. Configure Base
  const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
  console.log(`Using RPC URL: ${rpcUrl}`);
  
  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  const blockNumber = await publicClient.getBlockNumber();
  console.log(`Connected to Base. Current Block: ${blockNumber}`);

  // 2. Initialize Zora SDK
  const apiKey = process.env.ZORA_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: ZORA_API_KEY not set.");
  } else {
    try {
      CoinsSDK.setApiKey(apiKey);
      console.log("Zora SDK API Key set successfully.");
    } catch (e) {
      console.error("Failed to set Zora API Key:", e);
    }
  }

  console.log("Zora SDK initialized.");
}

testZoraIntegration().catch(console.error);
