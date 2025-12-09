# Tauri + React

This template should help get you started developing with Tauri and React in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
# CS392_Rust_Spotlight
Instructions to run the Spotify Integration
Note: This integration requires Spotify Premium. Additionally, due to the very recent change to the spotify api which restricted the redirect URIs to https or http://127.0.0.1:xxxx only, you have to manually put the Refresh token into an .env file.
1. create a .env file in the format of the .env_example file in the src-tauri/ directory (or contact me for the .env file)
2. Insert the following information
3. To get the refresh token, click on this [link](https://accounts.spotify.com/authorize?client_id=da96532fc5ba42458db021b77c5803f1&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A1420%2Fcallback&scope=user-read-playback-state user-modify-playback-state streaming user-read-currently-playing app-remote-control) to authorize your spotify account
4. In the redirected url, copy the code into this cURL command and run it:
```bash
curl --location 'https://accounts.spotify.com/api/token' \
  --header 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'grant_type=authorization_code' \
  --data-urlencode 'code=<INSERT CODE>' \
  --data-urlencode 'redirect_uri=http://127.0.0.1:1420/callback' \
  --data-urlencode 'client_id=da96532fc5ba42458db021b77c5803f1' \
  --data-urlencode 'client_secret=<INSERT CLIENT_SECRET>'
``` 
5. Copy the refresh token into the .env file
