# Walkthrough — Testing on Windows Without APK

## What your logs showed

Expo was waiting on:

```text
exp://192.168.100.24:8081
```

The backend was running on:

```text
http://192.168.100.24:3001
```

The previous mobile fallback used port `3000`, so Expo Go could bundle the app but API calls would not reach your running backend. This fix aligns the app to backend port `3001` by default.

## Correct command flow

Use two separate terminals.

### Terminal 1 — backend

```powershell
cd D:\Desktop\hackathonMVP\backend
npm install
npm start
```

Keep this terminal open. Do not press `Ctrl+C` unless you want to stop the API.

### Terminal 2 — mobile

```powershell
cd D:\Desktop\hackathonMVP\mobile
npm install
npx expo start
```

Keep this terminal open too. Scan the QR code with Expo Go, or press `a` for Android emulator.

## Common Windows mistakes

- If you are already in `D:\Desktop\hackathonMVP\mobile`, do **not** run `cd mobile` again. That tries to enter `D:\Desktop\hackathonMVP\mobile\mobile`, which does not exist.
- `npx expo start --web` needs `react-dom` and `react-native-web`. These are now listed in `mobile/package.json`; run `npm install` again after pulling this change.
- If phone API calls fail, set `EXPO_PUBLIC_API_BASE_URL` to the backend LAN URL printed by `npm start`.

## Manual override example

```powershell
cd D:\Desktop\hackathonMVP\mobile
$env:EXPO_PUBLIC_API_BASE_URL="http://192.168.100.24:3001"
npx expo start
```
