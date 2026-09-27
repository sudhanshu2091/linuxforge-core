# LinuxForge Core — V50.2 Complete Runtime Fix

This package is built from the uploaded `lf-5` source tree and contains the final source/config fixes applied during the integrity audit.

## Required local configuration

Copy `.env.local` from the previous working LinuxForge project into this project. Do not commit or upload it.

Run:

```bash
npm install
npm run verify:config
npm run typecheck
npm run lint
npm test
npm run runtime:test
```

The development runtime expects:

- `FORGE_SANDBOX_PROVIDER=real-linux-isolated-v1`
- `FORGE_SANDBOX_ENDPOINT=http://127.0.0.1:18080`
- `FORGE_SANDBOX_RUNTIME_MODE=development`
- `FORGE_SANDBOX_RUNTIME_CLASS=vm`
- `FORGE_SANDBOX_CREDENTIAL` to contain the runtime service credential
- `FORGE_RUNTIME_SERVICE_TOKEN` to authenticate the QEMU service

Vite explicitly loads the complete local `.env.local` environment into the server process because LinuxForge server modules intentionally read non-`VITE_*` configuration from `process.env`.

## Start order

Terminal 1:

```bash
set -a; source .env.local; set +a
npm run runtime:qemu
```

Terminal 2:

```bash
set -a; source .env.local; set +a
npm run runtime:gateway
```

Terminal 3:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Security

The package intentionally excludes `.env.local`, `node_modules`, `.git`, and runtime state. `SOURCE-INTEGRITY.sha256` hashes all packaged source/config/document files except those intentionally excluded artifacts.
