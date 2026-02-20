import 'dotenv/config';
import { createECloudClient } from '@layr-labs/ecloud-sdk';
import { writeFileSync, unlinkSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const pk = process.env.EIGENCOMPUTE_PRIVATE_KEY;
const env = process.env.EIGENCOMPUTE_ENVIRONMENT || 'sepolia';
const imageRef = process.env.AGENT_IMAGE_REF || 'frsrventure/eigenskills-agent:latest';
const appId = '0x28c1dFfabEE0696dE98Ba563BA1DDc1Db80F6fD3';

const formattedKey = pk.startsWith('0x') ? pk : `0x${pk}`;

const client = createECloudClient({
  verbose: false,
  privateKey: formattedKey,
  environment: env,
});

// Get image digest from Docker Hub
async function getDigest() {
  const parts = imageRef.split(':');
  const tag = parts.pop();
  const repo = parts.join(':');
  const url = `https://hub.docker.com/v2/repositories/${repo}/tags/${tag}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Docker Hub: ${res.status}`);
  const data = await res.json();
  const amd64 = data.images?.find(i => i.architecture === 'amd64');
  return amd64?.digest ?? data.digest;
}

// Build minimal env file
function buildEnvFile() {
  const lines = [
    'PORT=3000',
    'NETWORK_PUBLIC=sepolia',
  ];
  const dir = mkdtempSync(join(tmpdir(), 'esk-'));
  const fp = join(dir, '.env');
  writeFileSync(fp, lines.join('\n') + '\n', { mode: 0o600 });
  return fp;
}

async function main() {
  console.log('Fetching image digest...');
  const digest = await getDigest();
  console.log('Digest:', digest);

  const envFile = buildEnvFile();
  console.log('Env file:', envFile);

  try {
    console.log('Preparing upgrade...');
    const { prepared, gasEstimate } = await client.compute.app.prepareUpgradeFromVerifiableBuild(
      appId,
      {
        imageRef,
        imageDigest: digest,
        envFile,
        instanceType: 'g1-standard-4t',
        logVisibility: 'private',
        resourceUsageMonitoring: 'enable',
      }
    );

    console.log('Executing upgrade tx...');
    await client.compute.app.executeUpgrade(prepared, gasEstimate);

    console.log('Watching upgrade...');
    await client.compute.app.watchUpgrade(appId);

    console.log('Upgrade complete!');
  } finally {
    try { unlinkSync(envFile); } catch {}
  }
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
