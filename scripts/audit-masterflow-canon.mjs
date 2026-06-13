import {readFileSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {basename, join, relative} from 'node:path';

const defaultRoot =
  '/Users/malex/Library/CloudStorage/GoogleDrive-oursdoriscomlille@gmail.com/Mon Drive/MASTERFLOW';
const root = process.env.MASTERFLOW_CANON_ROOT ?? defaultRoot;
const output = process.argv[2] ?? 'AUDIT_MASTERFLOW_CANON_INVENTORY.json';

const primaryLayers = [
  '01_CORE',
  '02_CONTRACTS',
  '03_APPS',
  '04_ENGINES',
  '05_PERSONAS',
  '06_WIDGETS',
  '07_UI',
  '08_DATASETS',
  '09_EVENTS',
  '12_REFACTOR',
  'COMMON',
];

const secondaryLayers = ['10_AUDITS', '11_DEPLOYMENT', 'FACTORIES'];

const familyRules = [
  ['security_sentinel_moderation', /sentinel|security|safety|moderation|incident|quarantine|integrity|protection|firewall/i],
  ['auth_identity_accounts', /auth|account|identity|user_profile|user_schema|avatar_authority|onboarding.*account/i],
  ['permissions_privacy_access', /permission|scope|privacy|access|role_|authorization|confidential|consent|lock/i],
  ['organizations_collaboration', /organization|multi_user|tenant|team|collaborat|peer|classroom|class_instance|collective/i],
  ['projects_tasks_workflows', /project|task|workflow|milestone|dependency|phase_transition|assignment_work/i],
  ['rooms_ui_navigation', /room|ui_|interface|layout|workspace|surface|zoom|laterality|focus|attention|dashboard/i],
  ['widgets_overlays', /widget|overlay|card_|inbox_system/i],
  ['sessions_chat_conversation', /session|chat|conversation_surface|dialogue|subtext|speaker_routing/i],
  ['personas_behavior_lore_voice', /persona|behavior|voice|copycat|method_signature|relational|character_relationship/i],
  ['guidance_onboarding_discovery', /guidance|onboarding|intro_tunnel|discovery|suggestion|akinator|help_console|boot_ritual/i],
  ['actions_preflight_validation', /action|preflight|validation|human_override|decision_log|review_engine|review_app/i],
  ['jobs_queues_automation', /job|queue|automation|trigger|mass_processing|worker|background|contention|backpressure/i],
  ['events_signals_realtime', /event|signal|alert|realtime|live_overlay|wooclap/i],
  ['memory_context_knowledge', /memory|context|knowledge|recall|retention|contextual_reasoning/i],
  ['resources_search_rag', /resource|search|link|retrieval|indexing|rag|source_truth|timecode/i],
  ['pedagogy_courses_learning', /pedagog|course|learning|teacher|student_monitoring|mentorship|bloom|weather/i],
  ['subjects_assignments_exercises', /subject|assignment|exercise|gamma_compiler/i],
  ['correction_feedback_evaluation', /correct|feedback|score|evaluation|precorr|submission|rubric/i],
  ['competency_analytics_profiles', /competenc|analytics|diagnostic|creator_profile|soft_skill|reputation|match_engine/i],
  ['story_narrative_lore', /story|narrative|lore|scene|beat|world_building|foreshadow|reader|dialogue/i],
  ['da_visual_creative_direction', /(^|_)da_|visual_style|graphic|masterlab|reference_intent|canon_proportion|creative_language/i],
  ['image_generation_comfy_motion', /image|comfy|render|motion|casting|photo|prompt_stack|prompt_generation/i],
  ['assets_inventory_collections', /asset|inventory|collection|wishlist|pictogram|imagier|sticker|badge/i],
  ['events_contests_oursdor', /contest|competition|event_app|ours_dor|incubator|challenger|jury/i],
  ['gamification_progression_rpg', /gamif|rpg|reward|league|rivalry|monster|progression/i],
  ['quotes_pricing_billing', /quote|price|budget|billing|subscription|payment|monetization|invoice|pack_pricing/i],
  ['outputs_export_publication', /export|publication|delivery|output|external_message|print_production|platform_asset/i],
  ['notifications_reminders', /notification|reminder/i],
  ['observability_debug_health', /observability|debug|health|telemetry|audit_engine|runtime_anomaly|runtime_stability/i],
  ['connectors_external_ai_tools', /connector|external_ai|llm|tool_call|api_gateway|bridge_engine|drive_bridge/i],
  ['marketplace_community_creator', /marketplace|community|creator_economy|license/i],
  ['helplab_accessibility_support', /helplab|masterhelp|caregiver|accessibility|support_mode|personal_learning_profile/i],
  ['versioning_archive_migration', /version|archive|backup|rollback|migration|snapshot|restore|deprecat/i],
  ['factories_backflow_portability', /factory|backflow|portable_behavior|portable_visual|bundle/i],
  ['policy_governance_ethics', /policy|governance|ethic|boundary|canon_lock|creator_rules/i],
  ['runtime_architecture_orchestration', /runtime|architecture|orchestration|engine_contract|registry|ontology|state_|cache|circuit_breaker|resilience|scaling/i],
  ['testing_deployment_operations', /test|deployment|environment|handoff|implementation|refactor|cleanup|readiness/i],
];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (entry === '.DS_Store') continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function titleOf(text, path) {
  return (
    firstMatch(text, [
      /^#\s+(?!FILE METADATA)(.+)$/im,
      /^Nom\s*:\s*(.+)$/im,
      /^Name\s*:\s*(.+)$/im,
    ]) ?? basename(path)
  );
}

function metadataOf(path, corpus) {
  const relativePath = relative(root, path);
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  let text = '';
  if (['md', 'json', 'txt', 'yaml', 'yml'].includes(ext)) {
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      text = '';
    }
  }
  const title = titleOf(text, path);
  const classificationText = `${relativePath}\n${title}`;
  const family = familyRules.find(([, regex]) => regex.test(classificationText))?.[0] ?? 'other';
  const status = firstMatch(text, [
    /^Statut\s*:\s*(.+)$/im,
    /^Status\s*:\s*(.+)$/im,
    /^status\s*:\s*(.+)$/im,
  ]);
  const owner = firstMatch(text, [
    /^Owner principal\s*:\s*(.+)$/im,
    /^Owner\s*:\s*(.+)$/im,
    /^Owners?\s*:\s*(.+)$/im,
  ]);
  const canonicalRaw = firstMatch(text, [/^Canonical\s*:\s*(.+)$/im]);
  const canonical =
    canonicalRaw === null ? null : ['true', 'yes', 'oui'].includes(canonicalRaw.toLowerCase());
  return {
    path: relativePath,
    layer: relativePath.split('/')[0],
    corpus,
    extension: ext,
    title,
    status,
    owner,
    canonical,
    family,
    bytes: statSync(path).size,
  };
}

function collect(layers, corpus) {
  return layers.flatMap((layer) => {
    const dir = join(root, layer);
    return walk(dir).map((path) => metadataOf(path, corpus));
  });
}

const rootDocs = readdirSync(root)
  .map((entry) => join(root, entry))
  .filter((path) => statSync(path).isFile() && !path.endsWith('.DS_Store'))
  .map((path) => metadataOf(path, 'root'));
const files = [...rootDocs, ...collect(primaryLayers, 'primary'), ...collect(secondaryLayers, 'secondary')];

function countsBy(key, filter = () => true) {
  return files.filter(filter).reduce((counts, file) => {
    const value = file[key] ?? 'unknown';
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

const report = {
  generated_at: new Date().toISOString(),
  canon_root: root,
  methodology: {
    primary_layers: primaryLayers,
    secondary_layers: secondaryLayers,
    note: 'Classification heuristique par nom et debut de contenu. Les familles servent a garantir la couverture, pas a remplacer la lecture humaine.',
  },
  totals: {
    files: files.length,
    primary_files: files.filter((file) => file.corpus === 'primary').length,
    secondary_files: files.filter((file) => file.corpus === 'secondary').length,
    root_files: rootDocs.length,
  },
  counts: {
    by_corpus: countsBy('corpus'),
    primary_by_layer: countsBy('layer', (file) => file.corpus === 'primary'),
    primary_by_family: countsBy('family', (file) => file.corpus === 'primary'),
    secondary_by_family: countsBy('family', (file) => file.corpus === 'secondary'),
    canonical_flags: countsBy('canonical', (file) => file.corpus === 'primary'),
  },
  files,
};

writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      output,
      totals: report.totals,
      primary_by_layer: report.counts.primary_by_layer,
      primary_by_family: report.counts.primary_by_family,
    },
    null,
    2,
  ),
);
