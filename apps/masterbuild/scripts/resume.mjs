import { buildResumeBrief } from "../service/lib.mjs";

const { brief } = await buildResumeBrief();
console.log(brief);
