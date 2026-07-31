import { prepareHandoff } from "../service/lib.mjs";

const handoff = await prepareHandoff();
console.log("Handoff MASTERBUILD préparé localement :");
console.log(handoff.path);
console.log("\nPrompt de reprise :");
console.log(handoff.prompt);
