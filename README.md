# sustain.brussels - Presentation Background

Animation Three.js pour la présentation du 20/01 - Fond visuel en boucle de 25 secondes.

## Démarrage rapide

### Option 1: Serveur local simple

```bash
cd ~/sustain-brussels-threejs

# Avec Python 3
python3 -m http.server 8080

# Ou avec Node.js
npx serve
```

Ouvrir http://localhost:8080 dans le navigateur.

### Option 2: VS Code Live Server

1. Installer l'extension "Live Server" dans VS Code
2. Clic droit sur `index.html` → "Open with Live Server"

## Structure des séquences

| Séquence | Durée | Contenu |
|----------|-------|---------|
| 1 - Enjeux | 0-4s | Digital Transformation, Sustainability, Innovation |
| 2 - Écosystème | 4-10s | Réseau connecté + "Connecting research, technology & industry" |
| 3 - Leviers | 10-20s | AI & Data, Test Before Invest, Proof of Concept, Access to Expertise |
| 4 - Impact | 20-25s | "From idea to impact" + transition vers boucle |

## Enregistrement vidéo

### Option 1: OBS Studio (recommandé)

1. Télécharger OBS Studio: https://obsproject.com
2. Ajouter une source "Capture de fenêtre" → sélectionner le navigateur
3. Paramètres d'enregistrement:
   - Résolution: 1920x1080 ou 4K
   - Format: MP4
   - Bitrate: 15000-20000 kbps
4. Enregistrer ~30 secondes pour avoir une boucle complète

### Option 2: Screen recording macOS

```bash
# Raccourci clavier
Cmd + Shift + 5 → Enregistrer l'écran
```

### Option 3: FFmpeg (pour boucle parfaite)

```bash
# Enregistrer 25 secondes avec ffmpeg
ffmpeg -f avfoundation -framerate 60 -i "1" -t 25 -c:v libx264 -preset slow -crf 18 output.mp4

# Créer une boucle parfaite (optionnel)
ffmpeg -stream_loop 3 -i output.mp4 -c copy looped_output.mp4
```

## Personnalisation

### Modifier la durée

Dans `main.js`, ajuster `CONFIG.duration`:

```javascript
const CONFIG = {
    duration: {
        total: 25,  // Durée totale en secondes
        seq1: { start: 0, end: 4 },
        seq2: { start: 4, end: 10 },
        seq3: { start: 10, end: 20 },
        seq4: { start: 20, end: 25 }
    }
};
```

### Modifier les couleurs

```javascript
colors: {
    background: 0x0a1628,  // Bleu nuit
    primary: 0x00d4aa,     // Vert/teal
    secondary: 0x4a9eff,   // Bleu clair
    accent: 0x7c5cff       // Violet
}
```

### Modifier les textes

Dans `index.html`, modifier les éléments `.keyword`, `.tagline`, etc.

## Variante ultra-sobre

Pour une version encore plus minimaliste:

1. Réduire le nombre de particules: `particles.count: 400`
2. Masquer les formes géométriques (commentez la ligne `createGeometricShapes()`)
3. Réduire l'opacité des éléments dans le CSS

## Fichiers

```
sustain-brussels-threejs/
├── index.html      # Structure HTML + overlays textuels
├── style.css       # Styles et animations CSS
├── main.js         # Animation Three.js
└── README.md       # Ce fichier
```

## Notes techniques

- **Compatibilité**: Chrome, Firefox, Safari, Edge (WebGL requis)
- **Performance**: Optimisé pour 60fps sur machines modernes
- **Résolution**: Adaptatif, testé jusqu'en 4K

---

*sustain.brussels - ULB*
