import fs from 'fs'
import { compareVersions } from '../src/utils/version'

const MANIFEST_PATH = 'aseprite.json'

function parseArgs() {
  const [, , newTag, windowsHash] = process.argv
  if (!newTag || !windowsHash) {
    console.error('Usage: bun scripts/update-scoop-manifest.js <tag> <windows-hash>')
    process.exit(1)
  }
  return { newTag, windowsHash }
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`Manifest file not found: ${MANIFEST_PATH}`)
    process.exit(1)
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'))
}

function writeManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
}

function setGitHubOutput(version) {
  const outputFile = process.env.GITHUB_OUTPUT
  if (outputFile) {
    fs.appendFileSync(outputFile, `updated=true\nversion=${version}\n`)
  }
}

function main() {
  const { newTag, windowsHash } = parseArgs()
  const manifest = readManifest()
  const newVersion = newTag.replace(/^v/i, '')

  console.log(`Current: ${manifest.version} -> New: ${newVersion}`)

  if (compareVersions(newTag, manifest.version) <= 0) {
    console.log(`Skipping: ${newTag} <= ${manifest.version}`)
    process.exit(0)
  }

  manifest.version = newVersion

  const architectures = Object.keys(manifest.autoupdate.architecture)
  for (const arch of architectures) {
    if (manifest.architecture[arch]) {
      const urlTemplate = manifest.autoupdate.architecture[arch].url
      manifest.architecture[arch].url = urlTemplate.replace('$version', newVersion)
      manifest.architecture[arch].hash = windowsHash
    }
  }

  writeManifest(manifest)
  setGitHubOutput(newVersion)

  console.log(`Updated to ${newVersion}`)
}

main()
