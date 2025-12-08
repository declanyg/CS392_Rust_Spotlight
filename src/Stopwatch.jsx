import { useState, useEffect } from "react";
import Button from "@mui/material/Button";

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
      <h1 className="text-3xl font-bold mb-4">Stopwatch</h1>
      <Button variant="outlined" onClick={() => setMode("search")}>⬅ Back</Button>

      <div className="flex flex-col items-center justify-center space-y-4 mt-4">
        <p className="text-4xl font-mono">{formatTime(timeMs)}</p>

        <div className="flex flex-row gap-2">
          <Button variant="contained" onClick={() => setRunning(!running)}>
            {running ? "||" : "▶"}
          </Button>

          <Button variant="contained" color="error" onClick={resetStopwatch}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Stopwatch;
