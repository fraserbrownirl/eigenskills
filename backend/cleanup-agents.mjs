import 'dotenv/config';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = process.env.DB_DIR ?? join(__dirname, 'data');
const db = new Database(join(DB_DIR, 'eigenskills.db'));

// List all agents
const agents = db.prepare('SELECT id, user_address, app_id, name, status, instance_ip, created_at FROM agents ORDER BY id DESC').all();
console.log(`Found ${agents.length} agent(s):\n`);
for (const a of agents) {
  console.log(`  #${a.id} | ${a.name} | status=${a.status} | app=${a.app_id || 'none'} | ip=${a.instance_ip || 'none'} | ${a.created_at}`);
}
