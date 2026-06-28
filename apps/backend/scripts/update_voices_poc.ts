import Database from 'better-sqlite3';
import { join } from 'node:path';

const dbPath = join(process.cwd(), 'data/masterflow.db');
const db = new Database(dbPath);

console.log('Mise à jour des voix dans la base de données...');

const updatePersona = db.prepare(`
  UPDATE personas 
  SET voice_config_json = ? 
  WHERE id = ?
`);

const getPersona = db.prepare(`SELECT voice_config_json FROM personas WHERE id = ?`);

function updateVoiceConfig(id: string, newConfig: any) {
  const row = getPersona.get(id) as { voice_config_json: string } | undefined;
  if (!row) {
    console.log(`Persona ${id} non trouvé.`);
    return;
  }
  
  let currentConfig = {};
  try {
    currentConfig = JSON.parse(row.voice_config_json || '{}');
  } catch (e) {}

  const merged = { ...currentConfig, ...newConfig };
  updatePersona.run(JSON.stringify(merged), id);
  console.log(`✅ ${id} mis à jour :`, merged);
}

// 1. MasterFlex (énergique, direct, rapide)
updateVoiceConfig('masterflex-001', {
  voice: 'fr-FR-HenriNeural',
  rate: '+15%',
  pitch: '+5%',
  volume: '+0%'
});

// 2. ProfKrapu (prof, posé, grave)
updateVoiceConfig('profkrapu-001', {
  voice: 'fr-FR-HenriNeural',
  rate: '-10%',
  pitch: '-15%',
  volume: '+0%'
});

// 3. MasterFlow System (neutre, féminin, très calme)
updateVoiceConfig('masterflow-system-001', {
  voice: 'fr-FR-DeniseNeural',
  rate: '-5%',
  pitch: '+0%',
  volume: '+0%'
});

console.log('Terminé !');
