"use client";

import { useState, useEffect } from "react";
import { hasMetaMask, connectWallet, signSiweMessage } from "@/lib/wallet";
import { verifyAuth } from "@/lib/api";
import { getAddress } from "ethers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, ArrowRight, Loader2, ShieldCheck } from "lucide-react";

interface ConnectWalletProps {
  onConnected: (address: string, token: string, hasAgent: boolean) => void;
}

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum Mainnet",
  11155111: "Sepolia",
  8453: "Base",
  84532: "Base Sepolia",
  137: "Polygon",
  42161: "Arbitrum",
};

export default function ConnectWallet({ onConnected }: ConnectWalletProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  // Listen for account/chain changes AFTER user has connected
  useEffect(() => {
    if (!window.ethereum || !account) return;

    const refreshState = async () => {
      try {
        const accounts = (await window.ethereum!.request({
          method: "eth_accounts",
        })) as string[];

        const chain = (await window.ethereum!.request({
          method: "eth_chainId",
        })) as string;

        setAccount(accounts.length > 0 ? getAddress(accounts[0]) : null);
        setChainId(parseInt(chain, 16));
      } catch (e) {
        console.error("Failed to refresh state:", e);
      }
    };

    window.ethereum.on("accountsChanged", refreshState);
    window.ethereum.on("chainChanged", refreshState);

    return () => {
      window.ethereum?.removeListener("accountsChanged", refreshState);
      window.ethereum?.removeListener("chainChanged", refreshState);
    };
  }, [account]);

  async function handleConnect() {
    setLoading(true);
    setError(null);

    try {
      if (!hasMetaMask()) {
        setError("Please install MetaMask to continue");
        return;
      }

      const address = await connectWallet();
      setAccount(address);

      const chain = (await window.ethereum!.request({
        method: "eth_chainId",
      })) as string;
      setChainId(parseInt(chain, 16));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    if (!window.ethereum) return;

    setLoading(true);
    setError(null);

    try {
      // Get current account from MetaMask right before signing
      const accounts = (await window.ethereum.request({
        method: "eth_accounts",
      })) as string[];

      if (accounts.length === 0) {
        setError("No wallet connected");
        return;
      }

      const currentAddress = getAddress(accounts[0]);
      const { message, signature } = await signSiweMessage(currentAddress);
      const auth = await verifyAuth(message, signature);
      onConnected(auth.address, auth.token, auth.hasAgent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  const chainName = chainId ? CHAIN_NAMES[chainId] || `Chain ${chainId}` : null;
  const shortAddress = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : null;

  return (
    <Card className="w-full border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle>Connect Wallet</CardTitle>
        <CardDescription>
          Connect your wallet to manage your AI agent
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {account ? (
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-center animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center gap-2 text-primary mb-2">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-medium">Wallet Connected</span>
            </div>
            <p className="font-mono text-lg text-white">{shortAddress}</p>
            {chainName && <p className="mt-1 text-xs text-muted-foreground">{chainName}</p>}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-700 p-8 text-center text-muted-foreground">
            <Wallet className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p>No wallet connected</p>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive text-center flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4" />
            {error}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {!account ? (
          <Button 
            size="lg" 
            className="w-full gap-2 text-base" 
            onClick={handleConnect} 
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            Connect MetaMask
          </Button>
        ) : (
          <Button 
            size="lg" 
            className="w-full gap-2 text-base" 
            onClick={handleSignIn} 
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Sign In
          </Button>
        )}
        {account && (
          <p className="text-center text-xs text-muted-foreground">
            Please sign the message to authenticate
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
