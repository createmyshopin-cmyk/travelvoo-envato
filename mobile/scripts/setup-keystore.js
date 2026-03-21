#!/usr/bin/env node
/**
 * Generates an Android release keystore for EAS local credentials.
 * Requires Java JDK (keytool) to be installed.
 *
 * Install Java: winget install EclipseAdoptium.Temurin.17.JDK
 * Then: npm run setup:keystore
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const KEYSTORE_DIR = path.join(__dirname, '..', 'keystores');
const KEYSTORE_PATH = path.join(KEYSTORE_DIR, 'release.keystore');
const ALIAS = 'stay-admin';

function findKeytool() {
  try {
    execSync('keytool -help', { stdio: 'ignore' });
    return 'keytool';
  } catch {
    const javaHome = process.env.JAVA_HOME;
    if (javaHome) {
      const candidates = [
        path.join(javaHome, 'bin', 'keytool.exe'),
        path.join(javaHome, 'bin', 'keytool'),
        path.join(javaHome, 'Commands', 'keytool'),
      ];
      for (const k of candidates) {
        if (fs.existsSync(k)) return `"${k}"`;
      }
    }
    const basePaths = [
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Eclipse Adoptium',
    ];
    for (const base of basePaths) {
      if (!fs.existsSync(base)) continue;
      const dirs = fs.readdirSync(base).filter((d) => d.startsWith('jdk'));
      for (const dir of dirs) {
        const k = path.join(base, dir, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool');
        if (fs.existsSync(k)) return `"${k}"`;
      }
    }
  }
  return null;
}

function main() {
  console.log('Android keystore setup\n');

  const keytool = findKeytool();
  if (!keytool) {
    console.error('keytool not found. Java JDK is required.');
    console.error('\nInstall Java on Windows:');
    console.error('  winget install EclipseAdoptium.Temurin.17.JDK');
    console.error('\nAfter installing, close and reopen the terminal, then run:');
    console.error('  npm run setup:keystore');
    process.exit(1);
  }

  if (fs.existsSync(KEYSTORE_PATH)) {
    console.log('Keystore already exists at:', KEYSTORE_PATH);
    console.log('Delete it first if you want to create a new one.');
    process.exit(0);
  }

  if (!fs.existsSync(KEYSTORE_DIR)) {
    fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
  }

  const dname = 'CN=Stay Admin, OU=, O=, L=, S=, C=US';
  const cmd = `${keytool} -genkeypair -v -storetype PKCS12 -keystore "${KEYSTORE_PATH}" -alias ${ALIAS} -keyalg RSA -keysize 2048 -validity 10000 -dname "${dname}"`;

  console.log('Generating keystore (you will be prompted for passwords)...\n');

  const proc = spawn(cmd, [], {
    shell: true,
    stdio: 'inherit',
  });

  proc.on('close', (code) => {
    if (code === 0) {
      console.log('\nKeystore created successfully.');
      console.log('Update credentials.json with:');
      console.log('  keystorePath: "./keystores/release.keystore"');
      console.log('  keyAlias: "stay-admin"');
      console.log('  keystorePassword & keyPassword: (the password you just set)');
    } else {
      process.exit(code || 1);
    }
  });
}

main();
