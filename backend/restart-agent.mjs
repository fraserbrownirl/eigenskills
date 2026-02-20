import 'dotenv/config';
import { createECloudClient } from '@layr-labs/ecloud-sdk';

const pk = process.env.EIGENCOMPUTE_PRIVATE_KEY;
const formattedKey = pk.startsWith('0x') ? pk : `0x${pk}`;
const env = process.env.EIGENCOMPUTE_ENVIRONMENT || 'sepolia';
const appId = '0x28c1dFfabEE0696dE98Ba563BA1DDc1Db80F6fD3';

const client = createECloudClient({ verbose: false, privateKey: formattedKey, environment: env });

async function main() {
  console.log('Stopping agent...');
  try {
    await client.compute.app.stop(appId);
    console.log('Stopped. Waiting 5s...');
  } catch(e) {
    console.log('Stop error (may already be stopped):', e.message?.slice(0, 200));
  }
  
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('Starting agent...');
  try {
    await client.compute.app.start(appId);
    console.log('Started! Waiting for it to come up...');
  } catch(e) {
    console.error('Start error:', e.message?.slice(0, 200));
  }
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
