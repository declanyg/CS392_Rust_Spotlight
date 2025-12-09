use std::env;
use reqwest;
use serde_json;

#[tauri::command]
pub async fn refresh_spotify_token() -> Result<String, String> {
    let client_id = env::var("SPOTIFY_CLIENT_ID")
        .map_err(|_| "Missing SPOTIFY_CLIENT_ID".to_string())?;
    let client_secret = env::var("SPOTIFY_CLIENT_SECRET")
        .map_err(|_| "Missing SPOTIFY_CLIENT_SECRET".to_string())?;
    let refresh_token = env::var("SPOTIFY_REFRESH_TOKEN")
        .map_err(|_| "Missing SPOTIFY_REFRESH_TOKEN".to_string())?;

    let params = [
        ("grant_type", "refresh_token"),
        ("refresh_token", &refresh_token),
    ];

    let client = reqwest::Client::new();
    let resp = client
        .post("https://accounts.spotify.com/api/token")
        .basic_auth(client_id, Some(client_secret))
        .form(&params)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let json: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let access_token = json["access_token"]
        .as_str()
        .ok_or("No access token")?
        .to_string();

    Ok(access_token)
}
