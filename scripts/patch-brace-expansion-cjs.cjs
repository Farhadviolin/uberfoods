const fs = require('node:fs')
const path = require('node:path')

const packageDirectory = path.join(
  process.cwd(),
  'node_modules',
  'brace-expansion',
)
const packageJsonPath = path.join(packageDirectory, 'package.json')
const commonJsPath = path.join(
  packageDirectory,
  'dist',
  'commonjs',
  'index.js',
)
const compatibilityExport =
  '\n// Preserve the callable CommonJS API required by minimatch 3/5/9.\n' +
  'module.exports = Object.assign(expand, exports)\n'

if (!fs.existsSync(packageJsonPath) || !fs.existsSync(commonJsPath)) {
  console.log(
    'brace-expansion is not installed in this production-only locktree',
  )
  process.exit(0)
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
if (packageJson.version !== '5.0.8') {
  throw new Error(
    `Expected brace-expansion 5.0.8, found ${packageJson.version ?? 'unknown'}`,
  )
}

const commonJs = fs.readFileSync(commonJsPath, 'utf8')
if (!commonJs.includes('function expand(')) {
  throw new Error('Unexpected brace-expansion CommonJS module shape')
}

if (!commonJs.includes(compatibilityExport.trim())) {
  fs.appendFileSync(commonJsPath, compatibilityExport)
}

const exported = require(commonJsPath)
if (
  typeof exported !== 'function' ||
  exported.expand !== exported ||
  typeof exported.EXPANSION_MAX_LENGTH !== 'number'
) {
  throw new Error('brace-expansion CommonJS compatibility export is invalid')
}

console.log(
  'brace-expansion 5.0.8 CommonJS compatibility export verified',
)
