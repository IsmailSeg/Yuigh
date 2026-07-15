require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log(`✅ Bot connecté : ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: [new SlashCommandBuilder()
            .setName('ask')
            .setDescription('Pose une question à l\'IA')
            .addStringOption(opt => opt.setName('question').setDescription('Ta question').setRequired(true))
        ] }
    );
    console.log('✅ Commande /ask créée');
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'ask') return;

    const question = interaction.options.getString('question');
    await interaction.deferReply();

    try {
        const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: question }],
            temperature: 0.8,
            max_tokens: 600
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        await interaction.editReply(`**❓ Question :** ${question}\n\n**🤖 Réponse :**\n${data.choices[0].message.content}`);
    } catch (e) {
        await interaction.editReply("❌ Erreur avec l'IA.");
    }
});

client.login(process.env.TOKEN);
