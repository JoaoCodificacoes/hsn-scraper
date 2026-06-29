const { REST, Routes } = require('discord.js');

const commands = [
  {
    name: 'subscribe',
    description: 'Subscribe to price drops for a specific product',
    options: [
      {
        name: 'product',
        description: 'The product you want to track',
        type: 3, // STRING
        required: true,
        choices: [
          { name: 'Evowhey 2Kg', value: 'evowhey' },
          { name: 'Creatine', value: 'creatine' }
        ]
      }
    ]
  }
];

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_APP_ID;

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
