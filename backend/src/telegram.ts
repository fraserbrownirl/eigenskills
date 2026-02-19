import TelegramBot from "node-telegram-bot-api";
import { completeTelegramLink, getTelegramLink, getAgentByUser } from "./db.js";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

let bot: TelegramBot | null = null;

/**
 * Initialize the Telegram bot if TELEGRAM_BOT_TOKEN is set.
 * Called once during backend startup. No-ops if token is absent.
 */
export function initTelegramBot(): void {
  if (!BOT_TOKEN) {
    console.log("TELEGRAM_BOT_TOKEN not set — Telegram bot disabled");
    return;
  }

  bot = new TelegramBot(BOT_TOKEN, { polling: true });
  console.log("Telegram bot started (polling)");

  bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const linkCode = match?.[1]?.trim();

    if (!linkCode) {
      bot!.sendMessage(
        chatId,
        "Welcome to EigenSkills! Use a link code from the web app to connect your agent.\n\nUsage: /start <link-code>"
      );
      return;
    }

    const userAddress = completeTelegramLink(linkCode, chatId);
    if (!userAddress) {
      bot!.sendMessage(
        chatId,
        "Invalid or expired link code. Generate a new one from the web dashboard."
      );
      return;
    }

    bot!.sendMessage(
      chatId,
      `Linked to wallet ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}. You can now chat with your agent here.\n\nType any message to start.`
    );
  });

  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return;

    const chatId = msg.chat.id.toString();
    const link = getTelegramLink(chatId);

    if (!link) {
      bot!.sendMessage(
        chatId,
        "Your Telegram account is not linked. Use /start <link-code> first."
      );
      return;
    }

    const agent = getAgentByUser(link.user_address);
    if (!agent?.instance_ip) {
      bot!.sendMessage(chatId, "Your agent is not running. Start it from the web dashboard first.");
      return;
    }

    const sessionId = `tg-${chatId}`;

    try {
      const res = await fetch(`http://${agent.instance_ip}:3000/task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: msg.text, sessionId }),
      });

      if (!res.ok) {
        bot!.sendMessage(chatId, `Agent error: ${res.status}`);
        return;
      }

      const data = (await res.json()) as { result: string; skillsUsed?: string[] };
      let reply = data.result;

      if (data.skillsUsed && data.skillsUsed.length > 0) {
        reply += `\n\n_Skills: ${data.skillsUsed.join(", ")}_`;
      }

      // Telegram has a 4096 char limit
      if (reply.length > 4000) {
        reply = reply.slice(0, 3997) + "...";
      }

      bot!.sendMessage(chatId, reply, { parse_mode: "Markdown" });
    } catch (err) {
      console.error("Telegram → Agent error:", err);
      bot!.sendMessage(chatId, "Failed to reach your agent. Is it running?");
    }
  });
}

/** Send a proactive message to a user's linked Telegram chat. */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  if (!bot) return false;
  try {
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    return true;
  } catch (err) {
    console.warn("Failed to send Telegram message:", err);
    return false;
  }
}

export function getTelegramBot(): TelegramBot | null {
  return bot;
}
