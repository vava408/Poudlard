const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const db = require("../../connexion.js");
const { error } = require('node:console');
const { updatePoint } = require('../../services/uptadeEmbedPoint.js');

module.exports = {
    name: 'showpoint',
    description: "Permet de définir le salon d'affichage des points.",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: 'salon',
            description: 'Choisissez un salon',
            type: ApplicationCommandOptionType.Channel,
            required: true
        },
    ],

    run: async (client, interaction) => {
        const salon = interaction.options.get('salon').value
        const guildId = interaction.guildId

        
        console.log(salon)

        db.query(
            `INSERT INTO showPoint (guildID, channel)
             VALUES (?, ?)
             ON DUPLICATE KEY UPDATE
             channel = ?`,
            [guildId, salon, salon]
        );

        interaction.reply({
            content: "Les points se mettent maintenant à jour dans ce salon.",
            ephemeral: true
    });

        updatePoint(client)

    }
};