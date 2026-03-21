# Android Local Credentials Setup

EAS is configured to use **local credentials** for Android builds. This avoids the "Entity not authorized: AndroidKeystoreEntity" permission error when your Expo account cannot create keystores on EAS servers.

## One-time setup

### 1. Generate an Android keystore

From the `mobile` directory:

**Option A — npm script (if Java is installed):**
```powershell
cd mobile
npm run setup:keystore
```

**Option B — Manual (requires Java JDK):**
```powershell
# Install Java first: winget install EclipseAdoptium.Temurin.17.JDK
cd mobile
keytool -genkeypair -v -storetype PKCS12 -keystore keystores/release.keystore -alias stay-admin -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Stay Admin, OU=, O=, L=, S=, C=US"
```

You'll be prompted for a keystore password and key password — remember these for step 2.

### 2. Create credentials.json

Copy the example and fill in your values:

```powershell
copy credentials.json.example credentials.json
```

Edit `credentials.json` and set:
- `keystorePath`: `./keystores/release.keystore`
- `keystorePassword`: keystore password from step 1
- `keyAlias`: `stay-admin`
- `keyPassword`: key password (same as keystore password)

**Important:** `credentials.json` is gitignored. Never commit it.

### 3. Build

```powershell
cd mobile
npm run build:android
```
