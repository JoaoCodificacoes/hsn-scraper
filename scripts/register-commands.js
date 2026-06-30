const { REST, Routes } = require('discord.js');

const commands = [
  {
    name: 'subscribe',
    description: 'Subscribe to price drops for a specific product',
    integration_types: [0, 1], // 0 = GUILD_INSTALL, 1 = USER_INSTALL
    contexts: [0, 1, 2], // 0 = GUILD, 1 = BOT_DM, 2 = PRIVATE_CHANNEL
    options: [
      {
        name: 'product',
        description: 'The product you want to track',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Evowhey', value: 'evowhey' },
          { name: 'Creatine', value: 'creatine' }
        ]
      }
    ]
  },
  {
    name: 'unsubscribe',
    description: 'Unsubscribe from price drops',
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      {
        name: 'product',
        description: 'The product to stop tracking',
        type: 3,
        required: true,
        choices: [
          { name: 'Evowhey', value: 'evowhey' },
          { name: 'Creatine', value: 'creatine' }
        ]
      }
    ]
  },
  {
    name: 'test',
    description: 'Test if the bot is working',
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  }
];

const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(
  envFile.split('\n').filter(line => line && !line.startsWith('#')).map(line => {
    const parts = line.split('=');
    const key = parts[0];
    let val = parts.slice(1).join('=');
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    return [key, val];
  })
);

const token = env.DISCORD_TOKEN;
const clientId = env.DISCORD_APP_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or DISCORD_APP_ID environment variables.");
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
