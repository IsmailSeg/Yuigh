require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');

const axios = require('axios');

// Vérifie les variables d'environnement
if (!process.env.TOKEN) {
    console.error("❌ Variable TOKEN manquante !");
    process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
    console.error("❌ Variable OPENAI_API_KEY manquante !");
    process.exit(1);
}

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    console.log(`✅ Bot connecté : ${client.user.tag}`);

    try {
        const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

        await rest.put(
            Routes.applicationCommands(client.user.id),
            {
                body: [
                    new SlashCommandBuilder()
                        .setName('ask')
                        .setDescription('Pose une question à l\'IA')
                        .addStringOption(option =>
                            option
                                .setName('question')
                                .setDescription('Ta question')
                                .setRequired(true)
                        )
                ]
            }
        );

        console.log("✅ Commande /ask enregistrée.");
    } catch (err) {
        console.error("❌ Erreur lors de l'enregistrement des commandes :");
        console.error(err);
    }
});

client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName !== 'ask') return;

    const question = interaction.options.getString('question');

    await interaction.deferReply();

    try {

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
                temperature: 0.8,
                max_tokens: 600
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        let texte = response.data.choices[0].message.content;

        if (texte.length > 1900) {
            texte = texte.substring(0, 1900) + "...";
        }

        await interaction.editReply(
            `## ❓ Question\n${question}\n\n## 🤖 Réponse\n${texte}`
        );

    } catch (e) {

        console.error("====================================");
        console.error("ERREUR OPENAI");
        console.error("Status :", e.response?.status);
        console.error("Data :", JSON.stringify(e.response?.data, null, 2));
        console.error("Message :", e.message);
        console.error("====================================");

        let erreur = "Erreur inconnue";

        if (e.response?.data?.error?.message) {
            erreur = e.response.data.error.message;
        } else if (e.message) {
            erreur = e.message;
        }

        await interaction.editReply(
            `❌ Erreur avec l'IA :\n\`\`\`\n${erreur}\n\`\`\``
        );
    }

});

client.login(process.env.TOKEN);
