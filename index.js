require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    Events,
    Interaction   // ← Important
} = require("discord.js");

const axios = require("axios");

if (!process.env.TOKEN) {
    console.error("TOKEN manquant.");
    process.exit(1);
}

if (!process.env.GROQ_API_KEY) {
    console.error("GROQ_API_KEY manquante.");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ======================
//      READY + /ask
// ======================
client.once(Events.ClientReady, async (client) => {
    console.log(`✅ Connecté : ${client.user.tag}`);

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

    await rest.put(
        Routes.applicationCommands(client.user.id),
        {
            body: [
                new SlashCommandBuilder()
                    .setName("ask")
                    .setDescription("Pose une question à l'IA")
                    .addStringOption(option =>
                        option.setName("question")
                            .setDescription("Ta question")
                            .setRequired(true)
                    )
            ]
        }
    );

    console.log("✅ Commande /ask enregistrée");
});

// Slash command
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== "ask") return;

    const question = interaction.options.getString("question");
    await interaction.deferReply();
    await handleAIResponse(interaction, question);
});

// Réponse à un message du bot
client.on(Events.MessageCreate, async message => {
    if (message.author.bot || !message.reference) return;

    try {
        const referenced = await message.fetchReference();
        if (referenced.author.id === client.user.id) {
            await message.channel.sendTyping();
            await handleAIResponse(message, message.content);
        }
    } catch (e) {
        console.error("Erreur reply :", e);
    }
});

// Fonction IA commune
async function handleAIResponse(source, userMessage) {
    try {
        const res = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: userMessage }],
                temperature: 0.7,
                max_tokens: 1024
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const reply = res.data.choices[0].message.content;

        if (source instanceof Interaction) {
            await source.editReply(reply);
        } else {
            await source.reply(reply);
        }
    } catch (err) {
        console.error(err.response?.data || err);
        const errMsg = "❌ Erreur avec Groq AI.";

        if (source instanceof Interaction) {
            await source.editReply(errMsg);
        } else {
            await source.reply(errMsg);
        }
    }
}

client.login(process.env.TOKEN);
