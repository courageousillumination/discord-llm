import "dotenv/config";
import { Client, GatewayIntentBits, Message } from "discord.js";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { AIMessage, HumanMessage } from "langchain/schema";

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

const stripTriggers = (x: string) => x.replace("!llm", "");

const getBotMessages = async (message: Message) => {
  const content = message.content;
  if (message.reference?.messageId) {
    let original = await message.channel.messages.fetch(
      message.reference?.messageId
    );
    if (original) {
      return [
        new AIMessage(stripTriggers(original.content)),
        new HumanMessage(stripTriggers(content)),
      ];
    }
  }
  return [new HumanMessage(stripTriggers(content))];
};

client.on("ready", () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) {
    // No bots talking to themselves.
    return;
  }

  const content = message.content;
  const channel = message.channel;

  // Fire either on the !llm or a direct reply.
  const isDirectReply = message.mentions?.repliedUser?.username === "llm-bot";
  if (content.startsWith("!llm") || isDirectReply) {
    await channel.sendTyping();

    const messages = await getBotMessages(message);
    const result = await chat.predictMessages(messages);

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
