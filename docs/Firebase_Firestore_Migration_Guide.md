# Migrating providers.json to Firebase Firestore

This guide moves `backend/data/providers.json` into Firestore while preserving the current provider shape.

## Target Collection

Use one collection:

```text
providers/{providerId}
```

Each document should use the provider `id` as the document id and store the rest of the JSON object as fields. Keep `lat` and `lng` as numbers. If you later add GeoFirestore, also add a `geohash` field.

## One-Time Import

1. Create a Firebase project and enable Firestore in Native mode.
2. Create a service account key for local import only.
3. Install the Admin SDK in a temporary import workspace:

```bash
npm install firebase-admin
```

4. Run an import script that reads `providers.json`, batches writes in groups of 500, and writes to `providers/{id}`.

```js
const admin = require('firebase-admin');
const providers = require('./backend/data/providers.json');

admin.initializeApp({
  credential: admin.credential.cert(require('./service-account.json')),
});

const db = admin.firestore();

async function run() {
  let batch = db.batch();
  let count = 0;

  for (const provider of providers) {
    const ref = db.collection('providers').doc(provider.id);
    batch.set(ref, provider, { merge: true });
    count += 1;
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  await batch.commit();
  console.log(`Imported ${count} providers`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
```

## Backend Changes

Replace the static `require('../data/providers.json')` in `ProviderDiscovererAgent.js` with a repository function such as `findProvidersByService(serviceType)`. Keep the in-memory JSON path as a fallback for local demos:

```js
const useFirestore = process.env.PROVIDERS_SOURCE === 'firestore';
```

Recommended Firestore indexes:

- `service ASC, city ASC, area ASC`
- `city ASC, service ASC, rating DESC`
- `verified ASC, service ASC, cancellation_risk ASC`

## Safety Notes

Do not ship service account JSON in the repo. For Cloud Run, use the runtime service account and Application Default Credentials.
