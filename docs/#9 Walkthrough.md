# Walkthrough — Fixing the Blank Web Page and Backend URL Confusion

## What happened

Expo Web failed because `ProviderResultsScreen` imported `react-native-maps` directly. On web, that package imports native React Native internals such as `codegenNativeCommands`, which Metro cannot bundle for the browser.

The backend was also opened at:

```text
http://0.0.0.0:3001
```

That URL is invalid in Chrome. `0.0.0.0` means “listen on all interfaces” for the server. In a browser, use one of these instead:

```text
http://localhost:3001/
http://localhost:3001/health
http://192.168.100.24:3001/health
```

## What changed

- Native mobile keeps real `react-native-maps` through `MapPanel.native.js`.
- Web uses `MapPanel.web.js`, which displays a clean map preview and marker list without importing native-only code.
- Backend `/` now returns a friendly HTML status page that confirms the API is running and links to `/health`.

## Correct local browser test

Use two terminals:

```powershell
cd D:\Desktop\hackathonMVP\backend
npm start
```

```powershell
cd D:\Desktop\hackathonMVP\mobile
npm install
npx expo start --web
```

Then open the frontend URL Expo prints, such as:

```text
http://localhost:8082
```

Open the backend status page separately at:

```text
http://localhost:3001/
```
