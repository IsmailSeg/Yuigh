require("dotenv").config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder,
    Events
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
//      /ask COMMAND
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
                        option
                            .setName("question")
                            .setDescription("Ta question")
                            .setRequired(true)
                    )
            ]
        }
    );

    console.log("✅ Commande /ask enregistrée");
});

// ======================
//     SLASH COMMAND
// ======================
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== "ask") return;

    const question = interaction.options.getString("question");
    await interaction.deferReply();

    await handleAIResponse(interaction, question);
});

// ======================
//     REPLY TO BOT
// ======================
client.on(Events.MessageCreate, async message => {
    // Ignorer les messages du bot lui-même
    if (message.author.bot) return;

    // Vérifier si c'est une réponse à un message du bot
    if (!message.reference) return;

    try {
        const referencedMessage = await message.fetchReference();
        
        // Si le message référencé est du bot
        if (referencedMessage.author.id === client.user.id) {
            await message.channel.sendTyping(); // Indicateur "est en train d'écrire"
            await handleAIResponse(message, message.content);
        }
    } catch (err) {
        console.error("Erreur lors de la récupération du message référencé :", err);
    }
});

// Fonction commune pour appeler Groq
async function handleAIResponse(source, userMessage) {
    try {
        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "user",
                        content: userMessage
                    }
                ],
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

        const aiReply = response.data.choices[0].message.content;

        if (source instanceof Interaction) {
            await source.editReply(aiReply);
        } else {
            await source.reply(aiReply);
        }

    } catch (err) {
        console.error(err.response?.data || err.message);
        const errorMsg = "❌ Erreur avec Groq AI.";

        if (source instanceof Interaction) {
            await source.editReply(errorMsg);
        } else {
            await source.reply(errorMsg);
        }
    }
}

client.login(process.env.TOKEN);
