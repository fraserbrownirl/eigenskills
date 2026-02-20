import 'dotenv/config';
import { createECloudClient } from '@layr-labs/ecloud-sdk';

const pk = process.env.EIGENCOMPUTE_PRIVATE_KEY;
const formattedKey = pk.startsWith('0x') ? pk : `0x${pk}`;
const env = process.env.EIGENCOMPUTE_ENVIRONMENT || 'sepolia';
const appId = '0x28c1dFfabEE0696dE98Ba563BA1DDc1Db80F6fD3';

const client = createECloudClient({ verbose: false, privateKey: formattedKey, environment: env });

async function main() {
  console.log('Terminating agent', appId);
  try {
    await client.compute.app.terminate(appId);
    console.log('Terminated successfully');
  } catch(e) {
    console.log('Terminate result:', e.message?.slice(0, 300));
  }
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
