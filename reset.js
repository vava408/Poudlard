require('dotenv').config();

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.log("❌ TOKEN ou CLIENT_ID manquant dans le .env");
    process.exit();
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log("🗑️ Suppression des slash commands globales...");

        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: [] }
        );

        console.log("✅ Toutes les slash commands globales ont été supprimées !");
        console.log("⌛ Discord peut prendre quelques minutes pour retirer les commandes.");
        
        process.exit();
    } catch (err) {
        console.error("❌ Erreur :", err);
    }
})();