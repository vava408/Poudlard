const db = require("../connexion");
const { EmbedBuilder } = require("discord.js");

async function updatePoint(client, guildId) {

    console.log("========== UPDATE POINT ==========");
    console.log("Guild :", guildId);

    db.query(
        "SELECT * FROM showPoint WHERE guildID = ?",
        [guildId],
        async (err, configRows) => {

            if (err) {
                console.error("Erreur showPoint :", err);
                return;
            }

            if (!configRows.length) {
                console.log(
                    `Aucune configuration trouvée pour ${guildId}`
                );
                return;
            }

            const config = configRows[0];

            console.log("Configuration :", config);

            try {

                const channel = await client.channels
                    .fetch(String(config.channel))
                    .catch(error => {
                        console.error(
                            "Erreur récupération salon :",
                            error
                        );
                        return null;
                    });

                if (!channel) {
                    console.log(
                        `Salon introuvable : ${config.channel}`
                    );
                    return;
                }

                console.log(
                    "Salon trouvé :",
                    channel.name
                );

                db.query(
                    "SELECT * FROM HousePoints",
                    async (err, rows) => {

                        if (err) {
                            console.error(
                                "Erreur HousePoints :",
                                err
                            );
                            return;
                        }

                        if (!rows.length) {
                            console.log(
                                "Aucun point trouvé"
                            );
                            return;
                        }

                        const houses = {
                            1: "🦁 Gryffondor",
                            2: "🐍 Serpentard",
                            3: "🦅 Serdaigle",
                            4: "🦡 Poufsouffle"
                        };

                        const sorted = rows.sort(
                            (a, b) =>
                                b.points - a.points
                        );

                        const leaderboard = sorted
                            .map((house, index) => {

                                let medal = "";

                                if (index === 0)
                                    medal = "🥇 ";
                                else if (index === 1)
                                    medal = "🥈 ";
                                else if (index === 2)
                                    medal = "🥉 ";

                                return `${medal}${houses[house.house_id] || "Inconnu"} — **${house.points} points**`;
                            })
                            .join("\n");

                        const embed =
                            new EmbedBuilder()
                                .setTitle(
                                    "🏆 Classement des maisons"
                                )
                                .setColor("#9B59B6")
                                .setDescription(
                                    leaderboard
                                )
                                .setTimestamp();

                        let messageUpdated =
                            false;

                        // Mise à jour d'un message existant
                        if (
                            config.messageId &&
                            String(
                                config.messageId
                            ).trim() !== ""
                        ) {

                            try {

                                console.log(
                                    "Recherche du message :",
                                    config.messageId
                                );

                                const existingMessage =
                                    await channel.messages.fetch(
                                        String(
                                            config.messageId
                                        )
                                    );

                                await existingMessage.edit(
                                    {
                                        embeds: [
                                            embed
                                        ]
                                    }
                                );

                                console.log(
                                    "Message mis à jour"
                                );

                                messageUpdated =
                                    true;

                            } catch (error) {

                                console.log(
                                    "Impossible de modifier le message, création d'un nouveau."
                                );

                                console.error(
                                    error
                                );
                            }
                        }

                        // Création d'un nouveau message
                        if (!messageUpdated) {

                            try {

                                console.log(
                                    "Création du message..."
                                );

                                const sentMessage =
                                    await channel.send(
                                        {
                                            embeds: [
                                                embed
                                            ]
                                        }
                                    );

                                console.log(
                                    "Message envoyé :",
                                    sentMessage.id
                                );

                                db.query(
                                    "UPDATE showPoint SET messageId = ? WHERE guildID = ?",
                                    [
                                        String(
                                            sentMessage.id
                                        ),
                                        String(
                                            guildId
                                        )
                                    ],
                                    (
                                        err,
                                        result
                                    ) => {

                                        if (
                                            err
                                        ) {
                                            console.error(
                                                "Erreur UPDATE :",
                                                err
                                            );
                                            return;
                                        }

                                        console.log(
                                            "messageId sauvegardé"
                                        );

                                        console.log(
                                            result
                                        );
                                    }
                                );

                            } catch (error) {

                                console.error(
                                    "Erreur création message :",
                                    error
                                );
                            }
                        }
                    }
                );

            } catch (error) {

                console.error(
                    "Erreur générale :",
                    error
                );
            }
        }
    );
}

module.exports = {
    updatePoint
};