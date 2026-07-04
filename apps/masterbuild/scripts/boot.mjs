import { ensureLocalProfile } from "../service/lib.mjs";

const { created, profile } = await ensureLocalProfile();
if (created) {
  console.log("MASTERBUILD est prêt. L’enquête d’alignement s’ouvrira dans le cockpit.");
} else if (profile.onboarding_complete) {
  console.log(`MASTERBUILD reconnaît le profil local ${profile.profile_id}.`);
} else {
  console.log("Le profil local existe. Terminez l’enquête dans le cockpit.");
}
console.log("Prochaine action : npm run dev:masterbuild");
