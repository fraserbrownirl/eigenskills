import { searchAgents, isError } from "./paytoll-client.js";
import { readFileSync } from "fs";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node run.js <input-file>");
  process.exit(1);
}

const input = JSON.parse(readFileSync(inputPath, "utf-8"));
const query = input.query || input;
const options = input.options || {};

const result = await searchAgents(query, options);

if (isError(result)) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result.body, null, 2));
