import { useState, useEffect } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import ArrowBack from '@mui/icons-material/ArrowBack';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Pause from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

const Stopwatch = ({ mode, setMode }) => {
  const [timeMs, setTimeMs] = useState(0);
  const [running, setRunning] = useState(false);

  const resetStopwatch = () => {
    setTimeMs(0);
    setRunning(false);
  };

  const formatTime = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);

    return (`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(milliseconds).padStart(2, "0")}`
    );
  };

  useEffect(() => {
    if (mode !== "stopwatch") return;

    let interval;
    if (running) {
      interval = setInterval(() => {
        setTimeMs((t) => t + 10);
      }, 10);
    }
    return () => clearInterval(interval);
  }, [running, mode]);

  return (
    <div className="p-4 w-full h-full">
      <div className="flex flex-row gap-2">
            <IconButton variant="outlined" size="small" onClick={() => setMode("search")}><ArrowBack/></IconButton>
            <h1 className="text-3xl font-bold mb-4">Stopwatch</h1>
      </div>

      <div className="flex flex-col items-center justify-center space-y-4 mt-4">
        <p className="text-4xl font-mono">{formatTime(timeMs)}</p>

        <div className="flex flex-row gap-2">
          <Button variant="contained" onClick={() => setRunning(!running)}>
            {running ? <Pause /> : <PlayArrow />}
          </Button>

          <Button variant="contained" color="error" onClick={resetStopwatch}>
            <RestartAltIcon />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Stopwatch;
