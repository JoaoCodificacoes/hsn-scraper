import { POST } from './route';
import { verifyKey } from 'discord-interactions';
import { Redis } from '@upstash/redis';

// Mock the dependencies
jest.mock('discord-interactions', () => ({
  verifyKey: jest.fn(),
}));

jest.mock('@upstash/redis', () => {
  const mockSadd = jest.fn();
  return {
    Redis: {
      fromEnv: () => ({
        sadd: mockSadd
      })
    }
  };
});

describe('Discord POST Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DISCORD_PUBLIC_KEY = 'test_key';
  });

  it('should return 401 if signatures are missing', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: {
        // missing x-signature headers
      },
      body: JSON.stringify({ type: 1 })
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should return ACK (type 1) if pinged', async () => {
    (verifyKey as jest.Mock).mockResolvedValue(true);
    
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'x-signature-ed25519': 'mock_sig',
        'x-signature-timestamp': 'mock_ts',
      },
      body: JSON.stringify({ type: 1 })
    });
    
    const res = await POST(req);
    const json = await res.json();
    expect(json.type).toBe(1);
  });

  it('should handle /subscribe command and add to KV', async () => {
    (verifyKey as jest.Mock).mockResolvedValue(true);
    
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'x-signature-ed25519': 'mock_sig',
        'x-signature-timestamp': 'mock_ts',
      },
      body: JSON.stringify({
        type: 2,
        data: { name: 'subscribe', options: [{ value: 'evowhey' }] },
        member: { user: { id: 'user123' } }
      })
    });
    
    const res = await POST(req);
    const json = await res.json();
    
    expect(Redis.fromEnv().sadd).toHaveBeenCalledWith('subs:evowhey', 'user123');
    expect(json.type).toBe(4);
    expect(json.data.content).toContain('Successfully subscribed!');
  });
});
