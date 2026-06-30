/**
 * Sends a direct message to a Discord user.
 * 
 * @param userId - The Discord user ID to send the message to.
 * @param content - The markdown content of the message.
 */
export async function sendDiscordMessage(userId: string, content: string): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  if (!token) {
    console.warn('DISCORD_TOKEN is missing. Skipping Discord notification.');
    return;
  }
  
  // 1. Create DM channel
  const dmRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ recipient_id: userId }),
  });
  
  if (!dmRes.ok) {
    const errorText = await dmRes.text();
    console.error('Failed to create DM channel:', errorText);
    throw new Error(`Failed to create DM channel: ${errorText}`);
  }
  
  const dmChannel = await dmRes.json();
  
  // 2. Send Message to the created channel
  const msgRes = await fetch(`https://discord.com/api/v10/channels/${dmChannel.id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!msgRes.ok) {
    const errorText = await msgRes.text();
    console.error('Failed to send Discord message:', errorText);
    throw new Error(`Failed to send Discord message: ${errorText}`);
  }
}
