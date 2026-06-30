import * as fs from 'fs';
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').filter(line => line && !line.startsWith('#')).forEach(line => {
  const parts = line.split('=');
  const key = parts[0];
  let val = parts.slice(1).join('=');
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  process.env[key] = val;
});

import { redis } from './src/lib/redis';

async function run() {
  const history = await redis.lrange('history:creatine', 0, -1);
  console.log('Current Creatine History:', history);
}

run();
