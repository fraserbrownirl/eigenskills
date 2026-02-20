import { createTask, isError } from "./paytoll-client.js";
import { readFileSync } from "fs";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node run.js <input-file>");
  process.exit(1);
}

const input = JSON.parse(readFileSync(inputPath, "utf-8"));
const { agentId, description, budget, options = {} } = input;

if (!agentId || !description || !budget) {
  console.error(JSON.stringify({
    error: "INVALID_INPUT",
    message: "Required fields: agentId, description, budget"
  }));
  process.exit(1);
}

const result = await createTask(agentId, description, budget, options);

if (isError(result)) {
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result.body, null, 2));
