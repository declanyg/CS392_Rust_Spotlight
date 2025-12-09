import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import TextField from "@mui/material/TextField";
import { Paper, List, ListItem, Button, Box } from "@mui/material";
import { PlayArrow } from "@mui/icons-material";
import Stopwatch from "./Stopwatch";
import Spotify from "./Spotify";
import Timer from "./Timer";

function App() {
  const [rootPath, setRootPath] = useState("/Users/YoungDeclan/");
  const [pathSubmitted, setPathSubmitted] = useState(false);
  const [indexingDone, setIndexingDone] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [showCount, setShowCount] = useState(10);
  const [mode, setMode] = useState("search");
  // Spotify persistent state
  const [deviceId, setDeviceId] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    if (!pathSubmitted) return;

    async function startIndex() {
      await invoke("build_index", { root: rootPath });

      const interval = setInterval(async () => {
        const done = await invoke("is_index_done");
        if (done) {
          clearInterval(interval);
          setIndexingDone(true);
        }
      }, 500);
    }

    startIndex();
  }, [pathSubmitted, rootPath]);

  useEffect(() => {
    if (!search) {
      setResults([]);
      setShowCount(10);
      return;
    }

    async function searchFiles() {
      const res = await invoke("search_index", { query: search });
      setResults(res);
      setShowCount(10);
    }

    searchFiles();
  }, [search]);

  // Path Search Selection UI
  if (!pathSubmitted) {
    return (
      <div className="p-4">
        <h1 className="text-3xl font-bold mb-4">Choose Index Path</h1>

        <TextField
          label="Directory to index"
          variant="outlined"
          fullWidth
          value={rootPath}
          onChange={(e) => setRootPath(e.target.value)}
        />

        <Button
          className="mt-4"
          variant="contained"
          disabled={!rootPath.trim()}
          onClick={() => setPathSubmitted(true)}
        >
          Start Indexing
        </Button>
      </div>
    );
  }

  //Spotify UI
  if (mode === "play") {
    return (
      <Spotify
        playerReady={playerReady}
        setPlayerReady={setPlayerReady}
        deviceId={deviceId}
        setDeviceId={setDeviceId}
        mode={mode}
        setMode={setMode}
      />
    );
  }

  //Stopwatch UI
  if (mode === "stopwatch") {
    return <Stopwatch mode={mode} setMode={setMode} />;
  }

  //Timer UI
  if (mode === "timer") {
    return <Timer mode={mode} setMode={setMode} />;
  }

  // File Search UI
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold">File Search</h1>

      {!indexingDone && (
        <div style={{ display: "flex", alignItems: "center" }}>
          Indexing filesystem...
          <span className="spinner"></span>
        </div>
      )}

      {indexingDone && (
        <>
          <div className="mb-4">
            <TextField
              id="outlined-basic"
              label="Search:"
              variant="standard"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {search.toLowerCase().includes("play") && (
            <div className="mb-4">
              <Button
                variant="outlined"
                startIcon={<PlayArrow />}
                onClick={() => setMode("play")}
              >
                Spotify
              </Button>
            </div>
          )}

          {search.toLowerCase().includes("stopwatch") && (
            <div className="mb-4">
              <Button variant="outlined" onClick={() => setMode("stopwatch")}>
                Stopwatch
              </Button>
            </div>
          )}

          {search.toLowerCase().includes("timer") && (
            <div className="mb-4">
              <Button variant="outlined" onClick={() => setMode("timer")}>
                Timer
              </Button>
            </div>
          )}

          <Paper elevation={2} sx={{ maxHeight: 400, overflowY: "auto", p: 1 }}>
            <List>
              {results.slice(0, showCount).map((path, idx) => (
                <ListItem key={idx}>{path}</ListItem>
              ))}
            </List>

            {showCount < results.length && (
              <Box className="mt-2">
                <Button
                  variant="contained"
                  onClick={() => setShowCount((c) => c + 10)}
                >
                  Load more ({results.length - showCount} remaining)
                </Button>
              </Box>
            )}
          </Paper>
        </>
      )}
    </div>
  );
}

export default App;