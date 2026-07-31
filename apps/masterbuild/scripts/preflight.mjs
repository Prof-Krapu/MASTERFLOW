import { buildDesignPreflight } from "../service/lib.mjs";

const [surface = "global", audience = "all", contributor = "malex"] = process.argv.slice(2);
const preflight = await buildDesignPreflight({ surface, audience, contributor });
console.log(JSON.stringify(preflight, null, 2));
