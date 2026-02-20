"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MessageCircle,
  Link2,
  Unlink,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { getTelegramStatus, getTelegramLinkCode, unlinkTelegram, TelegramStatus } from "@/lib/api";

interface TelegramLinkProps {
  token: string;
  onError: (error: string | null) => void;
}

export function TelegramLink({ token, onError }: TelegramLinkProps) {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [botLink, setBotLink] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const s = await getTelegramStatus(token);
        if (!cancelled) setStatus(s);
      } catch (err) {
        if (!cancelled)
          onError(err instanceof Error ? err.message : "Failed to load Telegram status");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, onError]);

  async function handleGenerateLink() {
    setGenerating(true);
    onError(null);
    try {
      const { code, url } = await getTelegramLinkCode(token);
      setLinkCode(code);
      setBotLink(url);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setGenerating(false);
    }
  }

  async function handleUnlink() {
    setUnlinking(true);
    onError(null);
    try {
      await unlinkTelegram(token);
      setStatus({ linked: false, chatId: null });
      setLinkCode(null);
      setBotLink(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to unlink");
    } finally {
      setUnlinking(false);
    }
  }

  async function handleCopy() {
    if (!botLink) return;
    await navigator.clipboard.writeText(botLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading Telegram status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <MessageCircle className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Telegram Integration</CardTitle>
            <CardDescription>Chat with your agent directly in Telegram</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.linked ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">Telegram connected</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your Telegram account is linked. Messages you send to the bot will be forwarded to
              your agent.
            </p>
            <Button
              variant="outline"
              onClick={handleUnlink}
              disabled={unlinking}
              className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              {unlinking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unlinking...
                </>
              ) : (
                <>
                  <Unlink className="mr-2 h-4 w-4" />
                  Disconnect Telegram
                </>
              )}
            </Button>
          </div>
        ) : linkCode && botLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the link below to open Telegram and complete the connection:
            </p>
            <div className="flex gap-2">
              <a
                href={botLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-500/20 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Open in Telegram
              </a>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
                title="Copy link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">Link expires in 10 minutes</p>
            <Button
              variant="ghost"
              onClick={() => {
                setLinkCode(null);
                setBotLink(null);
              }}
              className="w-full text-muted-foreground"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your Telegram account to chat with your agent from anywhere. Your agent will
              respond to messages and send you notifications.
            </p>
            <Button onClick={handleGenerateLink} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating link...
                </>
              ) : (
                <>
                  <Link2 className="mr-2 h-4 w-4" />
                  Connect Telegram
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
