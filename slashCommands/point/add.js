const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType } = require('discord.js');
const db = require("../../connexion.js");
const { error } = require('node:console');
const { updatePoint } = require('../../services/uptadeEmbedPoint.js');
module.exports = {
	name: 'add',
	description: "Permet d'ajouter des points à une maison.",
	type: ApplicationCommandType.ChatInput,
	options: [
        {
            name: 'maison',
            description: 'Choisissez une maison.',
            type: 3,
            required: true,
            autocomplete: true
        },
        {
            name: 'point',
            description: 'Nombre de points à ajouter ou à retirer',
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
                    content: `"Vous devez être 🎓Professeur pour ajouter des points. `,
                    ephemeral: true
                })
        }

        console.log(hasRole);

        console.log(maison)
        console.log(pointAjoutSuppression)


        db.query('Select * from House where name=?', [String(maison) ], (err, row) =>{

            if(err)
            {
                return interaction.reply({
                    content: "Erreur dans la base de données. Merci de la signaler à <@692898154558783508>.",
                    ephemeral: true
                });
                console.log(err)
            }

        console.log(row)
            
            if(!row || row.length === 0)
            {
                return interaction.reply({
                    content: "Cette maison n'existe pas. Merci de le signaler à <@692898154558783508>.",
                    ephemeral: true
                });
            }
            const housseId =row[0].id
            

            db.query('UPDATE HousePoints SET points = points +  ? where house_id = ? ', [pointAjoutSuppression, housseId], (err2) => {

                if (err2) 
                {
                    return interaction.reply({content: "Erreur lors de la modification des points. Aucun point n'a été ajouté ou retiré. Merci de le signaler à <@692898154558783508>.",
                        ephemeral: true
                    });
                }

                db.query('INSERT INTO PointLog ( house_id , points, profs_id )  VALUES (?, ?, ?)', [housseId, pointAjoutSuppression, interaction.user.id ])   
                updatePoint(client, interaction.guild.id)
                
                return interaction.reply({
                    content: `${pointAjoutSuppression} point(s) ajouté(s) à ${maison}.`,
                    ephemeral: true
                })
            })
        })
	}
};