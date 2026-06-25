const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const db = require("../../connexion.js");
const { error } = require('node:console');
module.exports = {
	name: 'add',
	description: "Permet d'ajouter des points à une maison.",
	type: ApplicationCommandType.ChatInput,
	options: [
        {
            name: 'maison',
            description: 'Choisi une maison',
            type: 3,
            required: true,
            autocomplete: true
        },
        {
            name: 'point',
            description: 'Nombres de point à ajouté ou à enlever',
            type: ApplicationCommandOptionType.Integer,
            required: true,
            autocomplete: false
        }
    ],
    autocomplete: (interaction, choices) => {
        choices.push({
            name: `Griffondor`,
            value: `Griffondor`
        });
        choices.push({
            name: `Serpentard`,
            value: `Serpentard`
        });
        choices.push({
            name: `Serdaigle`,
            value: `Serdaigle`
        });
        choices.push({
            name: `Poufsouffle`,
            value: `Poufsouffle`
        });

        interaction.respond(choices).catch(console.error);
    },
	run: async (client, interaction) => {
        const maison = interaction.options.get('maison').value;
        const pointAjoutSuppression = interaction.options.get('point').value;

        const hasRole = interaction.member.roles.cache.some(
             role => role.name === "🎓Professeur"
        );

        if(!hasRole)
        {
            return interaction.reply({
                    content: `Vous devez êtres 🎓Professeur pour ajouter des points `,
                    ephemeral: true
                })
        }

        console.log(hasRole);

        console.log(maison)
        console.log(pointAjoutSuppression)


        db.query('Select * from House where name=?', [String(maison) ], (err, row) =>{

            if(err)
            {
                interaction.reply({
                    content: "Erreur dans la base de donnée. Merci de le signaler à <@692898154558783508>",
                    ephemeral: true
                });
                console.log(err)
            }

        console.log(row)
            
            if(!row || row.length === 0)
            {
                interaction.reply({
                    content: "La maison n'existe pas. Merci de le signaler à <@692898154558783508>",
                    ephemeral: true
                });
            }
            const housseId =row[0].id
            

            db.query('UPDATE HousePoints SET points = points +  ? where house_id = ? ', [pointAjoutSuppression, housseId], (err2) => {

                if (err2) 
                {
                    return interaction.reply({content: "Erreur dans les points aucun point supprimé.",
                        ephemeral: true
                    });
                }

                db.query('INSERT INTO PointLog ( house_id , points, profs_id )  VALUES (?, ?, ?)', [housseId, pointAjoutSuppression, interaction.user.id ])   
                
                return interaction.reply({
                    content: `✅ ${pointAjoutSuppression} points ajoutés à ${maison}`,
                    ephemeral: true
                })
            })
        })
	}
};