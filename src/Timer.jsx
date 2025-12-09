import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { IconButton, Button, TextField } from "@mui/material";
import { ArrowBack, PlayArrow, Pause } from "@mui/icons-material";

const Timer = ({ mode, setMode }) => {
  const [duration, setDuration] = useState(3600);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [input, setInput] = useState("01:00:00");

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!running) return;
      const t = await invoke("get_remaining");
      setRemaining(t);
      setInput(formatTime(t));
      if (t <= 0) setRunning(false);
    }, 100);

    return () => clearInterval(interval);
  }, [running]);

  const startTimer = async () => {
    await invoke("start_timer", { seconds: duration });
    setRemaining(duration);
    setRunning(true);
  };

  const pauseTimer = async () => {
    await invoke("pause_timer");
    setRunning(false);
  };

  const resetTimer = async () => {
    await invoke("reset_timer");
    setRemaining(duration);
    setInput(formatTime(duration));
    setRunning(false);
  };

  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const parseTime = (str) => {
    const parts = str.split(":").map((p) => parseInt(p, 10));
    if (
      parts.length === 3 &&
      !isNaN(parts[0]) &&
      !isNaN(parts[1]) &&
      !isNaN(parts[2])
    ) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    if (!running) {
      const secs = parseTime(val);
      setDuration(secs);
      setRemaining(secs);
    }
  };

  return (
    <div className="p-4 w-full h-full space-y-6">
      <div className="flex flex-row items-center gap-2">
        <IconButton size="small" onClick={() => setMode("search")}>
          <ArrowBack />
        </IconButton>
        <h1 className="text-3xl font-bold mb-2">Timer</h1>
      </div>

      <div className="text-center mb-4 items-center justify-center">
        <TextField
            value={input}
            onChange={handleInputChange}
            fullWidth
            variant="standard"
            sx={{
                '& .MuiInputBase-input': {
                fontSize: '2rem',
                fontFamily: 'monospace',
                textAlign: 'center',
                },
            }}
            InputProps={{
                disableUnderline: true,
            }}
            />
      </div>

      <div className="flex flex-row justify-center gap-4">
        {!running ? (
          <Button variant="contained" onClick={startTimer}>
            <PlayArrow />
          </Button>
        ) : (
          <Button variant="contained" onClick={pauseTimer}>
            <Pause />
          </Button>
        )}
        <Button variant="outlined" color="error" onClick={resetTimer}>
          Reset
        </Button>
      </div>
    </div>
  );
};

export default Timer;