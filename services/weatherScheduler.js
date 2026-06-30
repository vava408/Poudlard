const axios = require('axios');
const schedule = require('node-schedule');
const path = require('path');
const fs = require('fs');

let createCanvas;
let loadImage;
let GlobalFonts;

try {
  const canvasLib = require('@napi-rs/canvas');

  createCanvas = canvasLib.createCanvas;
  loadImage = canvasLib.loadImage;
  GlobalFonts = canvasLib.GlobalFonts;

  // Exemple si tu as une police personnalisée :
  // GlobalFonts.registerFromPath(
  //   path.join(__dirname, 'fonts', 'Minecraft.ttf'),
  //   'Minecraft'
  // );

} catch (error) {
  console.error('Erreur chargement @napi-rs/canvas:', error);
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
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
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
          headers: {
            'User-Agent': 'poudlard-weather-bot/1.0'
          }
        }
      );

      return (
        response.data?.address?.city ||
        response.data?.address?.town ||
        response.data?.address?.village ||
        'Nom inconnu'
      );
    } catch {
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  return 'Nom inconnu';
}

async function getCachedCityName() {
  if (cachedCityName) return cachedCityName;

  cachedCityName = await getCityName(LATITUDE, LONGITUDE);

  return cachedCityName;
}

async function getWeather(apiKey) {
  const maxRetries = 3;

  const url =
    `https://api.openweathermap.org/data/2.5/weather?lat=${LATITUDE}` +
    `&lon=${LONGITUDE}` +
    `&units=metric` +
    `&lang=fr` +
    `&appid=${apiKey}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data } = await axios.get(url, {
        timeout: 5000
      });

      return {
        temperature: data.main?.temp ?? 'N/A',
        feelsLike: data.main?.feels_like ?? 'N/A',
        humidity: data.main?.humidity ?? 'N/A',
        windSpeed: data.wind ? data.wind.speed * 3.6 : 0,
        weatherDescription: data.weather?.[0]?.description ?? 'Inconnu',
        weatherIcon: data.weather?.[0]?.icon ?? '01d'
      };
    } catch {
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  return null;
}

async function generateWeatherImage(weather, cityName) {
  if (!createCanvas || !loadImage) return null;

  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  try {
    if (backgroundImagePath) {
      const background = await loadImage(backgroundImagePath);
      ctx.drawImage(background, 0, 0, 800, 600);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 600);
    }
  } catch {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 600);
  }

  try {
    let icon = iconCache.get(weather.weatherIcon);

    if (!icon && iconsDir) {
      const localIcon = path.join(
        iconsDir,
        `${weather.weatherIcon}.png`
      );

      if (fs.existsSync(localIcon)) {
        icon = await loadImage(localIcon);
      }
    }

    if (!icon) {
      const response = await axios.get(
        `https://openweathermap.org/img/wn/${weather.weatherIcon}@2x.png`,
        {
          responseType: 'arraybuffer',
          timeout: 5000
        }
      );

      icon = await loadImage(Buffer.from(response.data));
    }

    iconCache.set(weather.weatherIcon, icon);

    ctx.drawImage(icon, 550, 50, 200, 200);

  } catch {}
  
  ctx.fillStyle = '#000';

  ctx.font = 'bold 36px Arial';
  ctx.fillText('Météo', 50, 60);

  ctx.font = 'bold 28px Arial';
  ctx.fillText('Maintenant', 50, 110);

  ctx.font = 'bold 72px Arial';
  ctx.fillText(`${weather.temperature}°`, 50, 190);

  ctx.font = '28px Arial';
  ctx.fillText(`Ville : ${cityName}`, 50, 250);
  ctx.fillText(`Ressenti : ${weather.feelsLike}°`, 50, 300);
  ctx.fillText(`Humidité : ${weather.humidity}%`, 50, 350);
  ctx.fillText(`Vent : ${weather.windSpeed.toFixed(1)} km/h`, 50, 400);
  ctx.fillText(`État : ${weather.weatherDescription}`, 50, 450);

  // Différence avec canvas
  return await canvas.encode('png');
}

async function sendWeatherUpdate(client) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  const channelId = process.env.CHANNEL_ID;

  if (!apiKey || !channelId) {
    console.warn(
      'Météo auto désactivée : OPENWEATHERMAP_API_KEY ou CHANNEL_ID manquant.'
    );
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.warn('Salon météo introuvable.');
      return;
    }

    const [cityName, weather] = await Promise.all([
      getCachedCityName(),
      getWeather(apiKey)
    ]);

    if (!weather) {
      console.warn('Impossible de récupérer la météo.');
      return;
    }

    const imageBuffer = await generateWeatherImage(weather, cityName);

    if (imageBuffer) {
      await channel.send({
        files: [
          {
            attachment: imageBuffer,
            name: 'weather.png'
          }
        ]
      });

      return;
    }

    await channel.send(
      `Météo pour ${cityName} : ${weather.weatherDescription}, ${weather.temperature}° (ressenti ${weather.feelsLike}°), humidité ${weather.humidity} %, vent ${weather.windSpeed.toFixed(1)} km/h.`
    );

  } catch (error) {
    console.error('Erreur météo :', error);
  }
}

function startWeatherScheduler(client) {
  sendWeatherUpdate(client);

  schedule.scheduleJob('0 12 * * *', () => {
    sendWeatherUpdate(client);
  });

  schedule.scheduleJob('0 18 * * *', () => {
    sendWeatherUpdate(client);
  });
}

module.exports = {
  startWeatherScheduler,
  sendWeatherUpdate
};
