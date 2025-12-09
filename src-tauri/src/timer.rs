use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

pub struct TimerState {
    pub duration: Duration,
    pub start_time: Option<Instant>,
    pub remaining: Duration,
    pub running: bool,
}

impl TimerState {
    pub fn new() -> Self {
        Self {
            duration: Duration::ZERO,
            start_time: None,
            remaining: Duration::ZERO,
            running: false,
        }
    }

    pub fn update_remaining(&mut self) {
        if self.running {
            if let Some(start) = self.start_time {
                let elapsed = start.elapsed();
                if elapsed >= self.duration {
                    self.remaining = Duration::ZERO;
                    self.running = false;
                    self.start_time = None;
                } else {
                    self.remaining = self.duration - elapsed;
                }
            }
        }
    }
}

#[tauri::command]
pub fn start_timer(state: tauri::State<'_, Arc<Mutex<TimerState>>>, seconds: u64) {
    let mut s = state.lock().unwrap();
    s.duration = Duration::from_secs(seconds);
    s.remaining = s.duration;
    s.start_time = Some(Instant::now());
    s.running = true;
}

#[tauri::command]
pub fn pause_timer(state: tauri::State<'_, Arc<Mutex<TimerState>>>) {
    let mut s = state.lock().unwrap();
    s.update_remaining();
    s.running = false;
    s.start_time = None;
}

#[tauri::command]
pub fn reset_timer(state: tauri::State<'_, Arc<Mutex<TimerState>>>) {
    let mut s = state.lock().unwrap();
    s.start_time = None;
    s.remaining = s.duration;
    s.running = false;
}

#[tauri::command]
pub fn get_remaining(state: tauri::State<'_, Arc<Mutex<TimerState>>>) -> f64 {
    let mut s = state.lock().unwrap();
    s.update_remaining();
    s.remaining.as_secs_f64()
}