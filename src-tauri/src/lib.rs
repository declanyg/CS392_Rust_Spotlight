use std::{path::PathBuf, fs};
use serde::{Serialize, Deserialize};
use std::sync::{Arc, Mutex};
use tauri::Manager;
use dotenvy::dotenv;
use std::env;
use tauri::menu::{MenuItemBuilder, MenuBuilder};
use tauri::tray::TrayIconBuilder;

pub struct AppState {
    pub tree: Arc<Mutex<Option<DirNode>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirNode {
    pub files: Vec<FileNode>,
    pub subdirs: Vec<DirNode>,
    pub tokens: Vec<String>,
}

fn is_hidden_path(path: &PathBuf) -> bool {
    path.file_name()
        .and_then(|s| s.to_str())
        .map(|s| s.starts_with('.') || s == "Library")
        .unwrap_or(false)
}

fn build_tree(path: &PathBuf) -> DirNode {
    let mut files = Vec::new();
    let mut subdirs = Vec::new();
    let mut tokens = Vec::new();

    if is_hidden_path(path) {
        return DirNode { files, subdirs, tokens };
    }

    let entries = match fs::read_dir(path) {
        Ok(e) => e,
        Err(_) => return DirNode { files, subdirs, tokens },
    };

    for entry in entries.flatten() {
        let p = entry.path();
        if is_hidden_path(&p) { continue; }

        if p.is_file() {
            let name = entry.file_name().to_string_lossy().to_string();
            tokens.push(name.to_lowercase());
            files.push(FileNode { name, path: p });
        } else if p.is_dir() {
            let sub = build_tree(&p);
            tokens.extend(sub.tokens.iter().cloned());
            subdirs.push(sub);
        }
    }

    DirNode { files, subdirs, tokens }
}

fn search_tree(node: &DirNode, query: &str, out: &mut Vec<PathBuf>) {
    let q = query.to_lowercase();
    if !node.tokens.iter().any(|t| t.contains(&q)) {
        return;
    }

    for f in &node.files {
        if f.name.to_lowercase().contains(&q) {
            out.push(f.path.clone());
        }
    }

    for sub in &node.subdirs {
        search_tree(sub, query, out);
    }
}

#[tauri::command]
fn build_index(root: String, state: tauri::State<'_, AppState>) {
    let state_clone = state.tree.clone();

    std::thread::spawn(move || {
        let tree = build_tree(&PathBuf::from(root));
        *state_clone.lock().unwrap() = Some(tree);
    });
}

#[tauri::command]
fn is_index_done(state: tauri::State<'_, AppState>) -> bool {
    state.tree.lock().unwrap().is_some()
}

#[tauri::command]
fn search_index(query: String, state: tauri::State<'_, AppState>) -> Vec<PathBuf> {
    let mut results = Vec::new();
    if let Some(ref tree) = *state.tree.lock().unwrap() {
        search_tree(tree, &query, &mut results);
    }
    results
}

#[tauri::command]
async fn refresh_spotify_token() -> Result<String, String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv().ok();

    let state = AppState { tree: Arc::new(Mutex::new(None)) };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            build_index,
            is_index_done,
            search_index,
            refresh_spotify_token
        ])
        .setup(|app| {
            let hide = MenuItemBuilder::new("Hide").id("hide").build(app).unwrap();
            let show = MenuItemBuilder::new("Show").id("show").build(app).unwrap();
            let quit = MenuItemBuilder::new("Quit").id("quit").build(app).unwrap();

            let menu = MenuBuilder::new(app)
                .items(&[&hide, &show, &quit])
                .build()
                .unwrap();

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "hide" => {
                        dbg!("menu item hide clicked");
                        let window = app.get_webview_window("main").unwrap();
                        window.hide().unwrap();
                    }
                    "show" => {
                        dbg!("menu item show clicked");
                        let window = app.get_webview_window("main").unwrap();
                        window.show().unwrap();
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
        
        
}
