"use client";

import { useState, useEffect } from "react";
import ConnectWallet from "@/components/ConnectWallet";
import AgentSetup from "@/components/AgentSetup";
import Dashboard from "@/components/Dashboard";
import { getAgentInfo } from "@/lib/api";

type View = "landing" | "setup" | "dashboard" | "loading";

const SESSION_KEY = "eigenskills-session";

export default function Home() {
  const [view, setView] = useState<View>("loading");
  const [address, setAddress] = useState("");
  const [token, setToken] = useState("");

  // Restore session from localStorage on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const saved = localStorage.getItem(SESSION_KEY);
        if (!saved) {
          setView("landing");
          return;
        }

        const { token: savedToken, address: savedAddress } = JSON.parse(saved);

        // Validate token by checking agent info
        const agentInfo = await getAgentInfo(savedToken);

        setToken(savedToken);
        setAddress(savedAddress);

        if (agentInfo && agentInfo.status !== "terminated") {
          setView("dashboard");
        } else {
          setView("setup");
        }
      } catch {
        // Token invalid or expired — clear and show landing
        localStorage.removeItem(SESSION_KEY);
        setView("landing");
      }
    }

    restoreSession();
  }, []);

  function handleConnected(addr: string, tok: string, hasAgent: boolean) {
    // Save session to localStorage
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token: tok, address: addr }));

    setAddress(addr);
    setToken(tok);
    setView(hasAgent ? "dashboard" : "setup");
  }

  function handleDeployed() {
    setView("dashboard");
  }

  function handleTerminated() {
    setView("setup");
  }

  function handleDisconnect() {
    localStorage.removeItem(SESSION_KEY);
    setAddress("");
    setToken("");
    setView("landing");
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
              <span className="text-sm font-bold text-zinc-900">E</span>
            </div>
            <span className="text-lg font-bold">EigenSkills</span>
          </div>

          {address && (
            <div className="flex items-center gap-3">
              <span className="hidden font-mono text-sm text-zinc-500 sm:block">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <button
                onClick={handleDisconnect}
                className="ml-2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="px-6 py-12">
        {/* Loading */}
        {view === "loading" && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
          </div>
        )}

        {/* Landing */}
        {view === "landing" && (
          <div className="mx-auto max-w-2xl pt-20 text-center">
            <h1 className="text-5xl font-bold tracking-tight text-white">
              Deploy your verifiable
              <br />
              AI agent
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg text-zinc-400">
              Run a sovereign AI agent inside a Trusted Execution Environment. Your keys, your
              wallet, your skills — cryptographically verified.
            </p>

            <div className="mt-12">
              <ConnectWallet onConnected={handleConnected} />
            </div>

            <div className="mt-20 grid grid-cols-3 gap-8 text-left">
              <Feature
                title="Sovereign Wallet"
                description="Every agent gets a unique wallet generated inside the TEE. Only your agent can access its keys."
              />
              <Feature
                title="Verifiable Execution"
                description="Every response is signed by your agent and verified by EigenAI. Full audit trail on-chain."
              />
              <Feature
                title="Encrypted Config"
                description="API keys are encrypted with KMS and only decrypted inside the TEE. Not even the platform can read them."
              />
            </div>
          </div>
        )}

        {/* Setup */}
        {view === "setup" && <AgentSetup token={token} onDeployed={handleDeployed} />}

        {/* Dashboard */}
        {view === "dashboard" && (
          <Dashboard token={token} address={address} onAgentTerminated={handleTerminated} />
        )}
      </main>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>
    </div>
  );
}
