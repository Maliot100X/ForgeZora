#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import * as CoinsSDK from "@zoralabs/coins-sdk";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  parseUnits,
} from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { fileURLToPath } from 'url';

const SERVER_NAME = "zora-coins-mcp";
const SERVER_VERSION = "0.1.0";
const HTTP_PORT = 3001;

// ---- Env and clients ----
const apiKey = process.env.ZORA_API_KEY;
if (apiKey) {
  try {
    CoinsSDK.setApiKey(apiKey);
  } catch (err) {
    console.error("Failed to set Zora API key:", err);
  }
}

const DEFAULT_CHAIN = base;
const chainId = Number(process.env.CHAIN_ID || DEFAULT_CHAIN.id);
const baseRpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";

const publicClient = createPublicClient({
  chain: DEFAULT_CHAIN,
  transport: http(baseRpcUrl),
});

const privateKeyRaw = (process.env.PRIVATE_KEY || "").trim();
const hasWallet = !!privateKeyRaw;
const normalizedPk = hasWallet
  ? (privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`)
  : "";
const account = hasWallet ? privateKeyToAccount(normalizedPk as `0x${string}`) : undefined;
const walletClient = hasWallet
  ? createWalletClient({
      account,
      chain: DEFAULT_CHAIN,
      transport: http(baseRpcUrl),
    })
  : undefined;

function ensureWallet() {
  if (!walletClient || !account) {
    throw new Error(
      "Write operation requires PRIVATE_KEY and BASE_RPC_URL. Set them in your environment and restart the server."
    );
  }
}

function json(data: unknown): string {
  return JSON.stringify(
    data,
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
    2
  );
}

// ---- Database & Neynar ----
const prisma = new PrismaClient();
const neynar = new NeynarAPIClient({ apiKey: process.env.NEYNAR_API_KEY || "" });

// ---- MCP server ----
const server = new McpServer({
  name: SERVER_NAME,
  version: SERVER_VERSION,
});

// Diagnostics
server.registerTool(
  "zora_health",
  {
    title: "Zora Coins server health",
    description: "Returns server and environment diagnostics.",
    inputSchema: {},
  },
  async () => {
    const res = {
      server: { name: SERVER_NAME, version: SERVER_VERSION },
      apiKeyConfigured: !!apiKey,
      rpcUrl: baseRpcUrl,
      chainId,
      walletAddress: account?.address || null,
    };
    return { content: [{ type: "text", text: json(res) }] };
  }
);

// ---- Read tools (Queries) ----
server.registerTool(
  "zora_get_coin",
  {
    title: "Get coin details",
    description: "Fetch metadata, market data & creator info for a coin.",
    inputSchema: {
      address: z.string().min(1, "address is required"),
      chainId: z.number().optional(),
    },
  },
  async ({ address, chainId }) => {
    // @ts-expect-error
    const resp = await CoinsSDK.getCoin({ address, chain: chainId ?? DEFAULT_CHAIN.id });
    return { content: [{ type: "text", text: json(resp) }] };
  }
);

server.registerTool(
  "zora_get_coins",
  {
    title: "Get multiple coins",
    description: "Batch fetch coins by address and chainId.",
    inputSchema: {
      coins: z.array(z.object({ collectionAddress: z.string(), chainId: z.number().default(DEFAULT_CHAIN.id) })).min(1),
    },
  },
  async ({ coins }) => {
    // @ts-expect-error
    const resp = await CoinsSDK.getCoins({ coins });
    return { content: [{ type: "text", text: json(resp) }] };
  }
);

server.registerTool(
  "zora_get_coin_holders",
  {
    title: "Get coin holders",
    description: "List holders of a coin with balances and profile data.",
    inputSchema: {
      address: z.string(),
      chainId: z.number().default(DEFAULT_CHAIN.id),
      after: z.string().optional(),
      count: z.number().int().min(1).max(100).optional(),
    },
  },
  async ({ address, chainId, after, count }) => {
    // @ts-expect-error
    const resp = await CoinsSDK.getCoinHolders({ address, chainId, after, count });
    return { content: [{ type: "text", text: json(resp) }] };
  }
);

server.registerTool(
  "zora_get_coin_swaps",
  {
    title: "Get coin swaps",
    description: "Fetch recent buy/sell swap activity for a coin.",
    inputSchema: {
      address: z.string(),
      chainId: z.number().default(DEFAULT_CHAIN.id),
      after: z.string().optional(),
      first: z.number().int().min(1).max(100).optional(),
    },
  },
  async ({ address, chainId, after, first }) => {
    // @ts-expect-error
    const resp = await CoinsSDK.getCoinSwaps({ address, chain: chainId, after, first });
    return { content: [{ type: "text", text: json(resp) }] };
  }
);

server.registerTool(
  "zora_get_coin_comments",
  {
    title: "Get coin comments",
    description: "Fetch comments associated with a coin (paginated).",
    inputSchema: {
      address: z.string(),
      chainId: z.number().default(DEFAULT_CHAIN.id),
      after: z.string().optional(),
      count: z.number().int().min(1).max(100).optional(),
    },
  },
  async ({ address, chainId, after, count }) => {
    // @ts-expect-error
    const resp = await CoinsSDK.getCoinComments({ address, chain: chainId, after, count });
    return { content: [{ type: "text", text: json(resp) }] };
  }
);

server.registerTool(
  "zora_get_profile",
  {
    title: "Get profile",
    description: "Fetch profile for a wallet or @handle.",
    inputSchema: { identifier: z.string().min(1) },
  },
  async ({ identifier }) => {
    // @ts-expect-error
    const resp = await CoinsSDK.getProfile({ identifier });
    return { content: [{ type: "text", text: json(resp) }] };
  }
);

server.registerTool(
  "zora_get_profile_coins",
  {
    title: "Get profile-created coins",
    description: "List coins created by a profile.",
    inputSchema: {
      identifier: z.string(),
      count: z.number().int().min(1).max(100).optional(),
      after: z.string().optional(),
      chainIds: z.array(z.number()).optional(),
      platformReferrerAddress: z.array(z.string()).optional(),
    },
  },
  async (args) => {
    // @ts-expect-error
    const resp = await CoinsSDK.getProfileCoins(args);
    return { content: [{ type: "text", text: json(resp) }] };
  }
);

server.registerTool(
  "zora_get_profile_balances",
  {
    title: "Get profile balances",
    description: "List coin balances for a wallet or handle.",
    inputSchema: {
      identifier: z.string(),
      count: z.number().int().min(1).max(100).optional(),
      after: z.string().optional(),
    },
  },
  async ({ identifier, after, count }) => {
    // @ts-expect-error
    const resp = await CoinsSDK.getProfileBalances({ identifier, after, count });
    return { content: [{ type: "text", text: json(resp) }] };
  }
);

// Explore queries
function exploreTool(name: string, fn: any, title: string, description: string) {
  server.registerTool(
    name,
    { title, description, inputSchema: { count: z.number().optional(), after: z.string().optional() } },
    async ({ after, count }) => {
      const resp = await fn({ after, count });
      return { content: [{ type: "text", text: json(resp) }] };
    }
  );
}

// @ts-expect-error
exploreTool("zora_explore_top_gainers", CoinsSDK.getCoinsTopGainers, "Top gainers", "Coins with highest market cap delta.");
// @ts-expect-error
exploreTool("zora_explore_top_volume_24h", CoinsSDK.getCoinsTopVolume24h, "Top 24h volume", "Coins with highest volume.");
// @ts-expect-error
exploreTool("zora_explore_most_valuable", CoinsSDK.getCoinsMostValuable, "Most valuable", "Coins with highest market cap.");
// @ts-expect-error
exploreTool("zora_explore_new", CoinsSDK.getCoinsNew, "New coins", "Most recently created coins.");
// @ts-expect-error
exploreTool("zora_explore_last_traded", CoinsSDK.getCoinsLastTraded, "Last traded", "Coins most recently traded.");
// @ts-expect-error
exploreTool("zora_explore_last_traded_unique", CoinsSDK.getCoinsLastTradedUnique, "Last traded (unique)", "Unique traders.");

// ---- Write tools ----
server.registerTool(
  "zora_create_coin",
  {
    title: "Create a new coin",
    description: "Deploy a new Zora coin.",
    inputSchema: {
      name: z.string().min(1),
      symbol: z.string().min(1),
      uri: z.string().min(1),
      payoutRecipient: z.string().min(1),
      platformReferrer: z.string().optional(),
      chainId: z.number().optional(),
      currency: z.enum(["ZORA", "ETH"]).optional(),
      gasMultiplier: z.number().optional(),
    },
  },
  async (args) => {
    ensureWallet();
    const { name, symbol, uri, payoutRecipient, platformReferrer, chainId, currency } = args;
    const deployCurrency = currency === "ETH" ? CoinsSDK.CreateConstants.ContentCoinCurrencies.ETH : CoinsSDK.CreateConstants.ContentCoinCurrencies.ZORA;
    const result = await CoinsSDK.createCoin({
      call: {
        creator: account!.address,
        name,
        symbol,
        metadata: { type: "RAW_URI", uri },
        payoutRecipientOverride: payoutRecipient as `0x${string}`,
        platformReferrer: platformReferrer as `0x${string}`,
        chainId: chainId ?? DEFAULT_CHAIN.id,
        currency: deployCurrency,
        startingMarketCap: CoinsSDK.CreateConstants.StartingMarketCaps.LOW,
      },
      walletClient: walletClient!,
      publicClient,
      options: {}
    });
    return { content: [{ type: "text", text: json(result) }] };
  }
);

server.registerTool(
  "zora_update_coin_uri",
  {
    title: "Update coin metadata URI",
    description: "Update the token metadata URI.",
    inputSchema: { coin: z.string().min(1), newURI: z.string().min(1) },
  },
  async ({ coin, newURI }) => {
    ensureWallet();
    const result = await CoinsSDK.updateCoinURI({ coin: coin as any, newURI }, walletClient!, publicClient);
    return { content: [{ type: "text", text: json(result) }] };
  }
);

server.registerTool(
  "zora_update_payout_recipient",
  {
    title: "Update payout recipient",
    description: "Change the payout recipient address.",
    inputSchema: { coin: z.string().min(1), newPayoutRecipient: z.string().min(1) },
  },
  async ({ coin, newPayoutRecipient }) => {
    ensureWallet();
    const result = await CoinsSDK.updatePayoutRecipient({ coin: coin as any, newPayoutRecipient: newPayoutRecipient as any }, walletClient!, publicClient);
    return { content: [{ type: "text", text: json(result) }] };
  }
);

server.registerTool(
  "zora_trade_coin",
  {
    title: "Trade coin",
    description: "Swap ETH or ERC20 for a coin.",
    inputSchema: {
      sellType: z.enum(["eth", "erc20"]),
      sellAddress: z.string().optional(),
      sellDecimals: z.number().optional(),
      buyType: z.enum(["eth", "erc20"]),
      buyAddress: z.string().optional(),
      amount: z.string().min(1),
      slippage: z.number().optional(),
      recipient: z.string().optional(),
      sender: z.string().optional(),
    },
  },
  async (args) => {
    ensureWallet();
    const { sellType, sellAddress, sellDecimals, buyType, buyAddress, amount, slippage, recipient, sender } = args;
    const amountIn = sellType === "eth" ? parseEther(amount) : parseUnits(amount, sellDecimals ?? 18);
    const tradeParameters: any = {
      sell: sellType === "eth" ? { type: "eth" } : { type: "erc20", address: sellAddress },
      buy: buyType === "eth" ? { type: "eth" } : { type: "erc20", address: buyAddress },
      amountIn,
      slippage: slippage ?? 0.05,
      sender: sender || account!.address,
      recipient: recipient || account!.address,
    };
    const receipt = await CoinsSDK.tradeCoin({ tradeParameters, walletClient: walletClient!, account: account!, publicClient });
    return { content: [{ type: "text", text: json(receipt) }] };
  }
);

// ---- HTTP App ----
const app = express();
app.use(cors());
app.use(express.json());

// GET /wallets/:fid
app.get("/wallets/:fid", async (req, res) => {
  try {
    const fid = parseInt(req.params.fid);
    if (isNaN(fid)) { res.status(400).json({ error: "Invalid FID" }); return; }
    const user = await prisma.user.findUnique({ where: { fid }, include: { profile: true, wallets: true } });
    res.json({ user: user || null });
  } catch (err: any) {
    console.error("GET /wallets/:fid error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /sync/:fid
app.post("/sync/:fid", async (req, res) => {
  try {
    const fid = parseInt(req.params.fid);
    if (isNaN(fid)) { res.status(400).json({ error: "Invalid FID" }); return; }
    const { users } = await neynar.fetchBulkUsers({ fids: [fid] });
    if (!users || users.length === 0) { res.status(404).json({ error: "User not found on Neynar" }); return; }
    const neynarUser = users[0];
    const user = await prisma.user.upsert({ where: { fid }, update: {}, create: { fid } });
    await prisma.farcasterProfile.upsert({
      where: { fid },
      update: { username: neynarUser.username, bio: neynarUser.profile.bio.text, avatar_url: neynarUser.pfp_url },
      create: { fid, username: neynarUser.username, bio: neynarUser.profile.bio.text, avatar_url: neynarUser.pfp_url },
    });
    const verifications = neynarUser.verifications || [];
    const verifiedAddresses = neynarUser.verified_addresses?.eth_addresses || [];
    const allAddresses = Array.from(new Set([...verifications, ...verifiedAddresses]));
    await Promise.all(allAddresses.map((addr) =>
      prisma.wallet.upsert({
        where: { user_id_address: { user_id: user.id, address: addr } },
        update: { synced_at: new Date() },
        create: { user_id: user.id, wallet_type: "farcaster", address: addr },
      })
    ));
    const updatedUser = await prisma.user.findUnique({ where: { fid }, include: { profile: true, wallets: true } });
    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    console.error("POST /sync/:fid error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Zora Read Endpoints
app.get("/zora_health", async (req, res) => {
  try {
    const resp = { server: { name: SERVER_NAME, version: SERVER_VERSION }, apiKeyConfigured: !!apiKey, rpcUrl: baseRpcUrl, chainId, walletAddress: account?.address || null };
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_explore_new", async (req, res) => {
  try {
    // @ts-expect-error
    const resp = await CoinsSDK.getCoinsNew(req.query);
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_explore_top_gainers", async (req, res) => {
  try {
    // @ts-expect-error
    const resp = await CoinsSDK.getCoinsTopGainers(req.query);
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_explore_top_volume_24h", async (req, res) => {
  try {
    // @ts-expect-error
    const resp = await CoinsSDK.getCoinsTopVolume24h(req.query);
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_explore_most_valuable", async (req, res) => {
  try {
    // @ts-expect-error
    const resp = await CoinsSDK.getCoinsMostValuable(req.query);
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_explore_last_traded", async (req, res) => {
  try {
    // @ts-expect-error
    const resp = await CoinsSDK.getCoinsLastTraded(req.query);
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_get_coins", async (req, res) => {
  try {
    let coinsArg = req.query.coins;
    if (typeof coinsArg === 'string') { try { coinsArg = JSON.parse(coinsArg); } catch (e) {} }
    // @ts-expect-error
    const resp = await CoinsSDK.getCoins({ coins: coinsArg });
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_get_coin/:id", async (req, res) => {
  try {
    const address = req.params.id;
    const chainIdParam = req.query.chainId ? Number(req.query.chainId) : undefined;
    // @ts-expect-error
    const resp = await CoinsSDK.getCoin({ address, chain: chainIdParam ?? DEFAULT_CHAIN.id });
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_get_coin_holders/:id", async (req, res) => {
  try {
    const address = req.params.id;
    // @ts-expect-error
    const resp = await CoinsSDK.getCoinHolders({ address, ...req.query });
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_get_coin_swaps/:id", async (req, res) => {
  try {
    const address = req.params.id;
    // @ts-expect-error
    const resp = await CoinsSDK.getCoinSwaps({ address, ...req.query });
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_get_coin_comments/:id", async (req, res) => {
  try {
    const address = req.params.id;
    // @ts-expect-error
    const resp = await CoinsSDK.getCoinComments({ address, ...req.query });
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_get_profile", async (req, res) => {
  try {
    const identifier = req.query.identifier as string;
    if (!identifier) { res.status(400).json({ error: "identifier is required" }); return; }
    // @ts-expect-error
    const resp = await CoinsSDK.getProfile({ identifier });
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_get_profile_coins", async (req, res) => {
  try {
    // @ts-expect-error
    const resp = await CoinsSDK.getProfileCoins(req.query);
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

app.get("/zora_get_profile_balances", async (req, res) => {
  try {
    // @ts-expect-error
    const resp = await CoinsSDK.getProfileBalances(req.query);
    res.json(resp);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Export app for Vercel
export default app;

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(HTTP_PORT, () => {
    console.error(`HTTP Server listening on port ${HTTP_PORT}`);
  });
  
  const transport = new StdioServerTransport();
  server.connect(transport);
}
