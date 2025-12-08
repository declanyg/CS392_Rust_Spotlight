import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import TextField from "@mui/material/TextField";
import { Paper, List, ListItem, Button, Box } from "@mui/material";
import Stopwatch from "./Stopwatch";
import Spotify from "./Spotify"

function App() {
  const [indexingDone, setIndexingDone] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [showCount, setShowCount] = useState(10);
  const [mode, setMode] = useState("search");
  
  //Spotify persistent state
  const [playerReady, setPlayerReady] = useState(false);

  // File Indexing
  useEffect(() => {
    async function startIndex() {
      await invoke("build_index", { root: "/Users/YoungDeclan/" });

      const interval = setInterval(async () => {
        const done = await invoke("is_index_done");
        if (done) {
          clearInterval(interval);
          setIndexingDone(true);
        }
      }, 500);
    }
    startIndex();
  }, []);

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

  //Spotify UI
  if (mode === "play") {
    return (
      <Spotify playerReady={playerReady} setPlayerReady={setPlayerReady} mode={mode} setMode={setMode} />
    )
  }

  //Stopwatch UI
  if (mode === "stopwatch") {
    return (
      <div>
        <Stopwatch mode={mode} setMode={setMode} />
      </div>
     
    );
  }

  //File Search UI
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
          <div style={{ marginBottom: 10 }}>
            <TextField id="outlined-basic" label="Search:" variant="standard" onChange={(e) => setSearch(e.target.value)} />
          </div>

          {search.toLowerCase().includes("play") && (
            <div style={{ marginBottom: 10 }}>
              <Button variant="outlined" onClick={() => setMode("play")}>▶ Spotify</Button>
            </div>
          )}

          {search.toLowerCase().includes("stopwatch") && (
            <div style={{ marginBottom: 10 }}>
              <Button variant="outlined" onClick={() => setMode("stopwatch")}> Stopwatch</Button>
            </div>
          )}

          <Paper elevation={2} sx={{ maxHeight: 400, overflowY: "auto", p: 1 }}>
            <List>
              {results.slice(0, showCount).map((path, idx) => (
                <ListItem key={idx}>{path}</ListItem>
              ))}
            </List>

            {showCount < results.length && (
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => setShowCount(c => c + 10)}>
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
