use std::{
    path::PathBuf,
    fs,
    sync::{Arc, Mutex},
};
use serde::{Serialize, Deserialize};

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
pub fn build_index(root: String, state: tauri::State<'_, AppState>) {
    let state_clone = state.tree.clone();
    std::thread::spawn(move || {
        let tree = build_tree(&PathBuf::from(root));
        *state_clone.lock().unwrap() = Some(tree);
    });
}

#[tauri::command]
pub fn is_index_done(state: tauri::State<'_, AppState>) -> bool {
    state.tree.lock().unwrap().is_some()
}

#[tauri::command]
pub fn search_index(query: String, state: tauri::State<'_, AppState>) -> Vec<PathBuf> {
    let mut results = Vec::new();
    if let Some(ref tree) = *state.tree.lock().unwrap() {
        search_tree(tree, &query, &mut results);
    }
    results
}