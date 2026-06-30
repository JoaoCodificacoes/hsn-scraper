import { getDiscordCommandChoices } from '../src/lib/config';

const choices = getDiscordCommandChoices();

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
        choices: choices
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
        choices: choices
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

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_APP_ID;

if (!token || !clientId) {
  console.error("Missing DISCORD_TOKEN or DISCORD_APP_ID environment variables.");
  console.error("Make sure to run this script using: node --env-file=.env.local --experimental-strip-types scripts/register-commands.ts");
  process.exit(1);
}

async function register() {
  console.log('Started refreshing application (/) commands.');
  
  const url = `https://discord.com/api/v10/applications/${clientId}/commands`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${token}`
    },
    body: JSON.stringify(commands)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Error: ${response.status} - ${errorText}`);
    process.exit(1);
  }
  
  console.log('Successfully reloaded application (/) commands.');
}

register();
