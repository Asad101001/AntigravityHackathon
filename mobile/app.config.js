/**
 * app.config.js — Dynamic Expo config
 *
 * Why this file exists instead of app.json only:
 *   - EAS `eas env:create` variables are available as process.env at build time
 *   - The $(VAR_NAME) syntax in app.json only works with the OLD eas secret:create format
 *   - Using process.env here ensures the Maps API key is correctly injected at build time
 */

module.exports = ({ config }) => {
  const mapsApiKey = process.env.EXPO_PUBLIC_MAPS_API_KEY || '';

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
