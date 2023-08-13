import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage } from "langchain/schema";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPEN_AI_KEY = process.env.OPEN_AI_API_KEY;

const chat = new ChatOpenAI({
  openAIApiKey: OPEN_AI_KEY,
  temperature: 0,
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

client.on("messageCreate", async (message) => {
  const content = message.content;
  const channel = message.channel;
  if (content.startsWith("!llm")) {
    await channel.sendTyping();
    const result = await chat.predictMessages([
      new HumanMessage(content.slice(4)),
    ]);

    if (result.content.length < 1500) {
      await message.reply(result.content);
    } else {
      // If we have a long message, split on '\n\n' (discord has a 2000 character limit)
      const chunks = result.content.split("\n\n");
      for (const chunk of chunks) {
        await channel.send(chunk);
      }
    }
  }
});

client.login(DISCORD_TOKEN);
