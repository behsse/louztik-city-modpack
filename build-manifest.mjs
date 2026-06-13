#!/usr/bin/env node
// Generateur de manifest.json pour le repo de distribution.
// Usage : depose tes .jar dans ./mods, ajuste modpack.config.json, puis :
//   node build-manifest.mjs
// Aucune dependance externe : utilise uniquement les modules natifs Node.

import { readdirSync, readFileSync, writeFileSync, statSync, createReadStream } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const MODS_DIR = join(ROOT, 'mods')

/**
 * Calcule le SHA-1 d'un fichier.
 * @param {string} filePath Chemin du fichier.
 * @returns {Promise<string>} Empreinte hexadecimale.
 */
function sha1(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha1')
    createReadStream(filePath)
      .on('data', (c) => hash.update(c))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject)
  })
}

/**
 * Lit le champ "environment" du fabric.mod.json contenu dans un .jar.
 * Valeurs possibles : "client", "server", "*" (les deux).
 * Utilise `tar` (bsdtar sur Windows 10+) pour extraire le fichier sans dependance.
 * @param {string} jarPath Chemin du .jar.
 * @returns {"client"|"server"|"*"} L'environment, ou "*" par defaut si indetermine.
 */
function readEnvironment(jarPath) {
  try {
    const out = execFileSync('tar', ['-xOf', jarPath, 'fabric.mod.json'], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    })
    const env = JSON.parse(out).environment
    return env === 'client' || env === 'server' ? env : '*'
  } catch {
    // Pas de fabric.mod.json lisible (ex: librairie) -> suppose les deux cotes.
    return '*'
  }
}

/**
 * Devine nom et version a partir d'un nom de fichier "nom-1.2.3.jar".
 * @param {string} file Nom du fichier .jar.
 * @returns {{ name: string, version: string }}
 */
function parseName(file) {
  const base = file.replace(/\.jar$/i, '')
  const match = base.match(/^(.*?)-(\d[\w.+-]*)$/)
  if (match) return { name: match[1], version: match[2] }
  return { name: base, version: '0.0.0' }
}

async function main() {
  const config = JSON.parse(readFileSync(join(ROOT, 'modpack.config.json'), 'utf-8'))

  let files
  try {
    files = readdirSync(MODS_DIR).filter((f) => f.toLowerCase().endsWith('.jar'))
  } catch {
    console.error(`Dossier introuvable : ${MODS_DIR} — cree-le et depose tes .jar dedans.`)
    process.exit(1)
  }

  if (files.length === 0) {
    console.warn('Aucun .jar trouve dans ./mods — le manifest sera vide.')
  }

  const mods = []
  for (const file of files.sort()) {
    const full = join(MODS_DIR, file)
    const { name, version } = parseName(file)
    mods.push({
      name,
      version,
      file,
      url: `${config.repoBaseUrl}/mods/${encodeURIComponent(file)}`,
      sha1: await sha1(full),
      size: statSync(full).size,
      environment: readEnvironment(full)
    })
  }

  const manifest = {
    modpackVersion: config.modpackVersion,
    minecraft: config.minecraft,
    fabricLoader: config.fabricLoader,
    javaMajor: config.javaMajor,
    server: config.server,
    mods
  }

  writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
  console.log(`manifest.json genere : ${mods.length} mod(s), modpack v${config.modpackVersion}.`)
  for (const m of mods) {
    console.log(`  - ${m.file} (${(m.size / 1024 / 1024).toFixed(1)} Mo) [${m.environment}]`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
