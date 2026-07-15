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

// =====================
// Vérifications
// =====================

if (!process.env.TOKEN) {
    console.error("❌ TOKEN manquant dans les variables.");
    process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
    console.error("❌ OPENAI_API_KEY manquante dans les variables.");
    process.exit(1);
}

console.log("🚀 Démarrage du bot...");

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// =====================
// Connexion
// =====================

client.once(Events.ClientReady, async (client) => {

    console.log(`✅ Connecté en tant que ${client.user.tag}`);

    try {

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
                                .setDescription("Votre question")
                                .setRequired(true)
                        )
                ]
            }
        );

        console.log("✅ Commande /ask enregistrée");

    } catch (err) {

        console.error("❌ Impossible d'enregistrer la commande");
        console.error(err);

    }

});

// =====================
// Slash Command
// =====================

client.on(Events.InteractionCreate, async interaction => {

    console.log("📩 Interaction reçue");

    if (!interaction.isChatInputCommand()) return;

    console.log("Commande :", interaction.commandName);

    if (interaction.commandName !== "ask") return;

    const question = interaction.options.getString("question");

    console.log("Question :", question);

    await interaction.deferReply();

    try {

        console.log("📡 Envoi vers OpenAI...");

        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: question
                    }
                ],
                max_tokens: 500
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log("✅ Réponse OpenAI reçue");

        const texte = response.data.choices[0].message.content;

        await interaction.editReply(texte);

    } catch (err) {

        console.error("============== ERREUR OPENAI ==============");

        if (err.response) {
            console.error("Status :", err.response.status);
            console.error(err.response.data);
        } else {
            console.error(err);
        }

        console.error("===========================================");

        await interaction.editReply(
            "❌ Impossible de contacter OpenAI. Vérifie les logs Railway."
        );

    }

});

// =====================
// Login
// =====================

client.login(process.env.TOKEN);

client.on("error", console.error);
process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);
