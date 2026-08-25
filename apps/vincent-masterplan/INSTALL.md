# INSTALL — ProfKrapu MasterPlan

## Pré-requis

- Node.js 18+ (pour les outils de build)
- Git

## 1. Cloner le dépôt

```bash
git clone git@github.com:Prof-Krapu/MASTERFLOW.git
cd MASTERFLOW
git checkout vincent/masterplan
```

## 2. Configuration

### URL de l'application Google Apps Script

Ouvrez `apps/vincent-masterplan/index.html` et remplacez la ligne :

```javascript
const masterPlanWebAppUrl = '';
```

par votre URL de déploiement Google Apps Script.

### Pronote / Hyperplanning

Si vous avez accès à une API Pronote ou Hyperplanning, configurez les flux iCal dans l'application via le bouton **+** dans le menu mobile.

## 3. Déploiement

### Option A : Google Apps Script (recommandé)

1. Copiez le contenu de `index.html` dans un fichier `Index.html` de votre projet Google Apps Script
2. Déployez comme application web
3. Utilisez l'URL de déploiement comme `masterPlanWebAppUrl`

### Option B : Hébergement statique

```bash
# Servir localement
npx serve apps/vincent-masterplan

# Ou déployer sur Netlify/Vercel/GitHub Pages
# Copiez le dossier apps/vincent-masterplan vers la racine du déploiement
```

### Option C : Application de bureau (Tauri)

```bash
# Installer Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Installer Tauri CLI
cargo install tauri-cli

# Créer un nouveau projet Tauri
cargo tauri init

# Configuration :
# - Window title: ProfKrapu 2026-2027
# - Dev URL: http://localhost:8080 (si vous serviz localement)
# - Frontend dist: ../apps/vincent-masterplan

# Lancer en dev
cargo tauri dev

# Build pour production
cargo tauri build
```

### Option D : Application de bureau (Electron)

```bash
# Installer Electron
npm install -g electron

# Créer un main.js
cat > main.js << 'EOF'
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'ProfKrapu 2026-2027',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.loadFile('apps/vincent-masterplan/index.html');
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
EOF

# Lancer
electron .
```

## 4. Personnalisation

### Couleurs

Les couleurs sont définies dans les variables CSS en haut de `index.html` :

- `--orange:#e84f8a` (orchidée principal)
- `--blue:#35a879` (vert)
- `--green:#35a879` (vert)
- `--proto-accent:#e84f8a` (accent du logo)
- `--proto-user-color:#35a879` (couleur utilisateur)

### Logo

Remplacez le SVG du logo dans `apps/vincent-masterplan/assets/` par votre propre logo.

## 5. Menu bar (Mac)

Pour un accès rapide depuis la barre des menus macOS, utilisez l'une des options C ou D ci-dessus.

Avec Tauri, l'application apparaîtra dans la barre des menus et peut être configurée pour s'ouvrir/fermer au clic sur l'icône.

Avec Electron, vous pouvez utiliser `Tray` pour créer une icône dans la barre des menus :

```javascript
const { Tray } = require('electron');
// Ajouter une icône de tray dans le code principal
```
