import { NextResponse } from "next/server";
import os from "os";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (netList) {
      for (const net of netList) {
        // Skip over non-IPv4 and internal/loopback addresses
        if (net.family === "IPv4" && !net.internal) {
          addresses.push(net.address);
        }
      }
    }
  }

  // Primary local network IP (preferred Wi-Fi or Ethernet: 192.168.x.x or 10.x.x.x)
  const primaryIp =
    addresses.find((ip) => ip.startsWith("192.168.")) ||
    addresses.find((ip) => ip.startsWith("10.")) ||
    addresses.find((ip) => ip.startsWith("172.")) ||
    addresses[0] ||
    "127.0.0.1";

  const port = process.env.PORT || "3000";

  return NextResponse.json({
    ip: primaryIp,
    port,
    localUrl: `http://localhost:${port}`,
    networkUrl: `http://${primaryIp}:${port}`,
    allIps: addresses,
  });
}
