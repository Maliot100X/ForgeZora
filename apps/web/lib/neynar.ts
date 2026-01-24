
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

if (!process.env.NEYNAR_API_KEY) {
  console.warn("NEYNAR_API_KEY is not set");
}

const client = new NeynarAPIClient(process.env.NEYNAR_API_KEY || "NEYNAR_API_DOCS");

export async function fetchProfileByFid(fid: number) {
  try {
    const result = await client.fetchBulkUsers([fid]);
    return result.users[0];
  } catch (error) {
    console.error("Error fetching profile by FID:", error);
    return null;
  }
}

export async function validateFarcasterContext(context: any) {
  // Placeholder for frame/context validation logic
  // In a real app, this would verify the signature from the frame interaction
  console.log("Validating context:", context);
  return true;
}
