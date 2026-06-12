# Repo de distribution du modpack

Repo **public** lu par le launcher pour installer et mettre a jour le modpack.
Il ne contient **que** les `.jar` compiles et le `manifest.json` genere — **pas** de code source.

## Structure

```
.
├── modpack.config.json   # versions, IP serveur, URL de base du repo
├── build-manifest.mjs    # genere manifest.json (aucune dependance)
├── manifest.json         # genere — lu par le launcher
└── mods/                 # tes .jar (mods + Fabric API si besoin)
```

## Publier une mise a jour

1. Compile tes mods et copie les `.jar` dans `mods/` (remplace les anciens).
2. Si besoin, ajuste `modpack.config.json` (incremente `modpackVersion`, change `server`, etc.).
3. Genere le manifest :
   ```bash
   node build-manifest.mjs
   ```
4. Commit + push :
   ```bash
   git add -A && git commit -m "modpack v1.1.0" && git push
   ```

Au prochain clic sur **Jouer**, les joueurs telechargent automatiquement les mods
ajoutes/modifies et perdent ceux que tu as retires. Aucun nouveau .exe a redistribuer.

## ⚠️ Points importants

- `repoBaseUrl` doit pointer vers **ce** repo (raw), branche incluse.
  Exemple : `https://raw.githubusercontent.com/<user>/<repo>/main`
- Le `manifestUrl` dans le launcher (`src/shared/config.ts`) doit pointer vers
  `<repoBaseUrl>/manifest.json`.
- Les noms de fichiers `nom-version.jar` sont recommandes (parsing auto du nom/version).
