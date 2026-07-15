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
    intents: [GatewayIntentBits.Guilds]
});

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

client.on(Events.InteractionCreate, async interaction => {

    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== "ask") return;

    const question = interaction.options.getString("question");

    await interaction.deferReply();

    try {

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "user",
                        content: question
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

        await interaction.editReply(
            response.data.choices[0].message.content
        );

    } catch (err) {

        console.error(err.response?.data || err.message);

        await interaction.editReply(
            "❌ Erreur avec Groq."
        );

    }

});

client.login(process.env.TOKEN);
