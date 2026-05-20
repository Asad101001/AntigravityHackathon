/**
 * app.config.js — Dynamic Expo config for Asaaniyat
 *
 * Why this file exists alongside app.json:
 *   - EAS environment variables (set via `eas env:create` or in eas.json `env`) 
 *     are available as process.env at build time.
 *   - This allows overriding the Maps API key from an EAS secret for production,
 *     while the hardcoded key in app.json serves as a fallback for local dev.
 *   - The static config in app.json is spread via `...config` so both sources merge.
 *
 * To set the production Maps API key securely:
 *   eas secret:create --name EXPO_PUBLIC_MAPS_API_KEY --value YOUR_KEY
 */

module.exports = ({ config }) => {
  // Prefer EAS secret/env var; fall back to the hardcoded key in app.json's plugin config
  const mapsApiKey =
    process.env.EXPO_PUBLIC_MAPS_API_KEY ||
    'AIzaSyDUlHky64mXWWcSqtGoVv4lJjjubJuIlFE';

  return {
    ...config,
    ios: {
      ...config.ios,
      config: {
        ...(config.ios?.config || {}),
        googleMapsApiKey: mapsApiKey,
      },
    },
    android: {
      ...config.android,
      config: {
        ...(config.android?.config || {}),
        googleMaps: {
          apiKey: mapsApiKey,
        },
      },
    },
  };
};
