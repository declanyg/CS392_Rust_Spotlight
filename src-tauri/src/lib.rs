use tauri::Manager;
use tauri::menu::{MenuItemBuilder, MenuBuilder};
use tauri::tray::TrayIconBuilder;
use dotenvy::dotenv;
use std::sync::{Arc, Mutex};

mod file_search;
mod spotify;
mod timer;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    dotenv().ok();

    let state = file_search::AppState { tree: Arc::new(Mutex::new(None)) };
    let timer_state = Arc::new(Mutex::new(timer::TimerState::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(state)
        .manage(timer_state)
        .invoke_handler(tauri::generate_handler![
            file_search::build_index,
            file_search::is_index_done,
            file_search::search_index,
            spotify::refresh_spotify_token,
            spotify::spotify_search,
            spotify::spotify_play,
            spotify::spotify_current_track,
            spotify::spotify_transfer,
            timer::start_timer,
            timer::pause_timer,
            timer::reset_timer,
            timer::get_remaining
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
                    "quit" => app.exit(0),
                    "hide" => app.get_webview_window("main").unwrap().hide().unwrap(),
                    "show" => app.get_webview_window("main").unwrap().show().unwrap(),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}