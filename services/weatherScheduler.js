const axios = require('axios');
const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs');

let createCanvas;
let loadImage;

try {
  const canvasLib = require('canvas');
  createCanvas = canvasLib.createCanvas;
  loadImage = canvasLib.loadImage;
} catch (error) {
  createCanvas = null;
  loadImage = null;
}

const LATITUDE = 51.509821;
const LONGITUDE = -0.084926;
const backgroundCandidates = [
  path.join(__dirname, 'background.png'),
  path.join(__dirname, '..', 'background.png')
];

const iconsCandidates = [
  path.join(__dirname, 'icons'),
  path.join(__dirname, '..', 'icons')
];

function resolveFirstExistingPath(candidates) {
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

const backgroundImagePath = resolveFirstExistingPath(backgroundCandidates);
const iconsDir = resolveFirstExistingPath(iconsCandidates);
const iconCache = new Map();
let cachedCityName = null;

async function getCityName(latitude, longitude) {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          timeout: 5000,
          headers: { 'User-Agent': 'poudlard-weather-bot/1.0' }
        }
      );

      const cityName =
        response.data?.address?.city ||
        response.data?.address?.town ||
        response.data?.address?.village ||
        'Nom inconnu';

      return cityName;
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return 'Nom inconnu';
}

async function getCachedCityName() {
  if (cachedCityName) {
    return cachedCityName;
  }

  cachedCityName = await getCityName(LATITUDE, LONGITUDE);
  return cachedCityName;
}

async function getWeather(apiKey) {
  const maxRetries = 3;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LATITUDE}&lon=${LONGITUDE}&units=metric&appid=${apiKey}&lang=fr`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.get(url, { timeout: 5000 });
      const weatherData = response.data || {};

      return {
        temperature: weatherData.main?.temp ?? 'N/A',
        feelsLike: weatherData.main?.feels_like ?? 'N/A',
        humidity: weatherData.main?.humidity ?? 'N/A',
        windSpeed: weatherData.wind ? weatherData.wind.speed * 3.6 : 0,
        weatherDescription: weatherData.weather?.[0]?.description || 'Inconnu',
        weatherIcon: weatherData.weather?.[0]?.icon || '01d'
      };
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  return null;
}

async function generateWeatherImage(weather, cityName) {
  if (!createCanvas || !loadImage) {
    return null;
  }

  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  try {
    if (backgroundImagePath) {
      const backgroundImage = await loadImage(backgroundImagePath);
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  } catch (error) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const iconCacheKey = weather.weatherIcon;
  const iconPath = iconsDir ? path.join(iconsDir, `${weather.weatherIcon}.png`) : null;

  try {
    let weatherIcon = iconCache.get(iconCacheKey);

    if (!weatherIcon && iconPath && fs.existsSync(iconPath)) {
      weatherIcon = await loadImage(iconPath);
      iconCache.set(iconCacheKey, weatherIcon);
    }

    if (!weatherIcon) {
      const iconUrl = `https://openweathermap.org/img/wn/${weather.weatherIcon}@2x.png`;
      const response = await axios.get(iconUrl, { responseType: 'arraybuffer', timeout: 5000 });
      weatherIcon = await loadImage(Buffer.from(response.data));
      iconCache.set(iconCacheKey, weatherIcon);
    }

    if (weatherIcon) {
      ctx.drawImage(weatherIcon, 550, 50, 200, 200);
    }
  } catch (error) {
    // Keep rendering without icon.
  }

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 36px Arial';
  ctx.fillText('Meteo', 50, 50);

  ctx.font = 'bold 28px Arial';
  ctx.fillText('Maintenant', 50, 100);

  ctx.font = 'bold 72px Arial';
  ctx.fillText(`${weather.temperature}°`, 50, 180);

  ctx.font = '28px Arial';
  ctx.fillText(`Ville : ${cityName}`, 50, 240);
  ctx.fillText(`Ressenti : ${weather.feelsLike}°`, 50, 290);
  ctx.fillText(`Humidite : ${weather.humidity}%`, 50, 340);
  ctx.fillText(`Vent : ${weather.windSpeed.toFixed(1)} km/h`, 50, 390);
  ctx.fillText(`Etat : ${weather.weatherDescription}`, 50, 440);

  return canvas.toBuffer();
}

async function sendWeatherUpdate(client) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  const channelId = process.env.CHANNEL_ID;

  if (!apiKey || !channelId) {
    console.warn('Meteo auto desactivee: OPENWEATHERMAP_API_KEY ou CHANNEL_ID manquant.');
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.warn('Meteo auto: salon introuvable.');
      return;
    }

    const [cityName, weather] = await Promise.all([
      getCachedCityName(),
      getWeather(apiKey)
    ]);

    if (!weather) {
      console.warn('Meteo auto: impossible de recuperer la meteo.');
      return;
    }

    const imageBuffer = await generateWeatherImage(weather, cityName);

    if (imageBuffer) {
      await channel.send({ files: [{ attachment: imageBuffer, name: 'weather.png' }] });
      return;
    }

    await channel.send(
      `Meteo pour ${cityName} : ${weather.weatherDescription}, ${weather.temperature} degres (ressenti ${weather.feelsLike} degres), humidite ${weather.humidity}%, vent ${weather.windSpeed.toFixed(1)} km/h.`
    );
  } catch (error) {
    console.error('Erreur meteo auto:', error.message || error);
  }
}

function startWeatherScheduler(client) {
  // Envoi immediat au demarrage puis envoi quotidien a minuit.
  sendWeatherUpdate(client);

schedule.scheduleJob('0 12 * * *', async () => {
  await sendWeatherUpdate(client);
});

schedule.scheduleJob('0 18 * * *', async () => {
  await sendWeatherUpdate(client);
});
}

module.exports = {
  startWeatherScheduler,
  sendWeatherUpdate
};
