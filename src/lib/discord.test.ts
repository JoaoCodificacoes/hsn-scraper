import { sendDiscordMessage } from './discord';

// Mock global fetch
global.fetch = jest.fn();

describe('discord service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (global.fetch as jest.Mock).mockClear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should skip if DISCORD_TOKEN is missing', async () => {
    delete process.env.DISCORD_TOKEN;
    await sendDiscordMessage('123', 'Hello');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should create DM channel and send message', async () => {
    process.env.DISCORD_TOKEN = 'fake-token';
    
    // Mock the DM channel creation response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'channel-456' })
    });

    // Mock the send message response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({})
    });

    await sendDiscordMessage('user-123', 'Test message');

    expect(global.fetch).toHaveBeenCalledTimes(2);
    
    // Check channel creation call
    expect(global.fetch).toHaveBeenNthCalledWith(1, 'https://discord.com/api/v10/users/@me/channels', expect.objectContaining({
      method: 'POST',
      headers: {
        Authorization: 'Bot fake-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient_id: 'user-123' })
    }));

    // Check message sending call
    expect(global.fetch).toHaveBeenNthCalledWith(2, 'https://discord.com/api/v10/channels/channel-456/messages', expect.objectContaining({
      method: 'POST',
      headers: {
        Authorization: 'Bot fake-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: 'Test message' })
    }));
  });
});
