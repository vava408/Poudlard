const { ActivityType } = require('discord.js');
const client = require('..');
const chalk = require('chalk');
const { startWeatherScheduler } = require('../services/weatherScheduler');

client.on('clientReady', () => {
	const activities = [
		{ name: `Créer par vava4859`, type: ActivityType.Listening },
		{ name: `${client.channels.cache.size} Channels`, type: ActivityType.Playing },
		{ name: `${client.users.cache.size} Users`, type: ActivityType.Watching },
	];
	const status = [
		'online',
		'dnd',
		'idle'
	];
	let i = 0;
	setInterval(() => {
		if(i >= activities.length) i = 0
		client.user.setActivity(activities[i])
		i++;
	}, 50000);

	let s = 0;
	setInterval(() => {
		if(s >= activities.length) s = 0
		client.user.setStatus(status[s])
		s++;
	}, 30000);
	startWeatherScheduler(client);
	console.log(chalk.red(`Logged in as ${client.user.tag}!`))
});