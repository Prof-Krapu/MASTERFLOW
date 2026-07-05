import { writePortableExport } from "../service/lib.mjs";

const result = await writePortableExport();
console.log("Export MASTERBUILD prêt :");
console.log(result.markdown_path);
console.log(result.json_path);
