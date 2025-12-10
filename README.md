# Tauri + React

This template should help get you started developing with Tauri and React in Vite.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
# CS392_Rust_Spotlight
### How to Run

1.  Run `npm install`\
2.  Run `npm tauri dev` to start the application

------------------------------------------------------------------------

### Instructions to Run the Spotify Integration

**Note:** This integration requires **Spotify Premium**.\
Due to recent changes to the Spotify API that restrict redirect URIs to
HTTPS or `http://127.0.0.1:xxxx`, you must manually put the refresh
token into a `.env` file.

1.  Create a `.env` file following the format of `.env_example` located
    in the `src-tauri/` directory.\
2.  Insert the following information into the `.env` file.\
3.  To get the refresh token, click this link to authorize your Spotify
    account:\
    [Spotify Authorization
    Link](https://accounts.spotify.com/authorize?client_id=da96532fc5ba42458db021b77c5803f1&response_type=code&redirect_uri=http%3A%2F%2F127.0.0.1%3A1420%2Fcallback&scope=user-read-playback-state%20user-modify-playback-state%20streaming%20user-read-currently-playing%20app-remote-control)
4.  After authorizing, you'll be redirected. Copy the `code` parameter
    from the redirect URL and insert it into the following cURL command:

``` bash
curl --location 'https://accounts.spotify.com/api/token'   --header 'Content-Type: application/x-www-form-urlencoded'   --data-urlencode 'grant_type=authorization_code'   --data-urlencode 'code=<INSERT CODE>'   --data-urlencode 'redirect_uri=http://127.0.0.1:1420/callback'   --data-urlencode 'client_id=da96532fc5ba42458db021b77c5803f1'   --data-urlencode 'client_secret=<INSERT CLIENT_SECRET>'
```

5.  Copy the **refresh token** from the response into your `.env` file.

