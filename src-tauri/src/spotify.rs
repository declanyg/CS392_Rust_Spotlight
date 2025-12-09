use std::env;
use reqwest;
use serde_json;
use urlencoding::encode;

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

#[tauri::command]
pub async fn spotify_search(token: String, query: String) -> Result<String, String> {
    let url = format!(
        "https://api.spotify.com/v1/search?q={}&type=track,playlist&limit=10",
        encode(&query)
    );

    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
pub async fn spotify_play(token: String, device_id: String, body: String) -> Result<(), String> {
    let url = format!(
        "https://api.spotify.com/v1/me/player/play?device_id={}",
        device_id
    );

    let client = reqwest::Client::new();

    let json_body: serde_json::Value = serde_json::from_str(&body)
        .map_err(|e| format!("Invalid JSON body: {}", e))?;

    client
        .put(url)
        .bearer_auth(token)
        .json(&json_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn spotify_current_track(token: String) -> Result<String, String> {
    let client = reqwest::Client::new();

    let res = client
        .get("https://api.spotify.com/v1/me/player/currently-playing")
        .bearer_auth(token)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if res.status() == 204 {
        return Ok("null".to_string());
    }

    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(body)
}

#[tauri::command]
pub async fn spotify_transfer(token: String, device_id: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let body = serde_json::json!({
        "device_ids": [device_id],
        "play": false
    });

    client
        .put("https://api.spotify.com/v1/me/player")
        .bearer_auth(&token)
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
