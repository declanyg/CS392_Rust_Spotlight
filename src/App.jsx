import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import TextField from "@mui/material/TextField";
import { Paper, List, ListItem, Button, Box } from "@mui/material";
import Stopwatch from "./Stopwatch";

function App() {
  const [indexingDone, setIndexingDone] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [showCount, setShowCount] = useState(10);
  const [mode, setMode] = useState("search");

  // Spotify states
  const [token, setToken] = useState("");
  const [playerReady, setPlayerReady] = useState(false);
  const [deviceId, setDeviceId] = useState(null);
  const [spotifySearch, setSpotifySearch] = useState("");
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState({ name: "", artists: [] });

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

  // Spotify
  useEffect(() => {
    if (mode !== "play") return;

    const loadSpotify = async () => {
      const freshToken = await invoke("refresh_spotify_token");
      setToken(freshToken);

      if (!document.getElementById("spotify-sdk")) {
        const script = document.createElement("script");
        script.id = "spotify-sdk";
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);
      }

      window.onSpotifyWebPlaybackSDKReady = () => {
        const player = new window.Spotify.Player({
          name: "Tauri Player",
          getOAuthToken: (cb) => cb(freshToken),
          volume: 0.5,
        });

        player.addListener("ready", ({ device_id }) => {
          console.log("Player ready", device_id);
          setDeviceId(device_id);
          setPlayerReady(true);
        });

        player.addListener("not_ready", ({ device_id }) => {
          console.log("Device went offline", device_id);
        });

        player.addListener("initialization_error", ({ message }) => {
          console.error("Init error:", message);
        });

        player.addListener("authentication_error", ({ message }) => {
          console.error("Auth error:", message);
        });

        player.connect();
      };
    };

    loadSpotify();
  }, [mode]);

  //Spotify Actions
  const searchSpotify = async () => {
    if (!token) return;

    const q = encodeURIComponent(spotifySearch);
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${q}&type=track,playlist&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    setTracks(data.tracks?.items || []);
    setPlaylists(data.playlists?.items || []);
  };

  const apiPlay = async (body = {}) => {
    if (!deviceId || !token) return;
    await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      }
    );
    setIsPlaying(true);
    fetchCurrentTrack();
  };

  const fetchCurrentTrack = async () => {
    if (!token) return;
    const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data && data.item) {
      setCurrentTrack({
        name: data.item.name,
        artists: data.item.artists.map((a) => a.name),
      });
      setIsPlaying(data.is_playing);
    }
  };

  const playTrack = (uri) => apiPlay({ uris: [uri] });
  const playPlaylist = (context_uri) => apiPlay({ context_uri });

  const skipNext = async () => {
    if (!deviceId || !token) return;
    await fetch(
      `https://api.spotify.com/v1/me/player/next?device_id=${deviceId}`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );
    fetchCurrentTrack();
  };

  const skipPrevious = async () => {
    if (!deviceId || !token) return;
    await fetch(
      `https://api.spotify.com/v1/me/player/previous?device_id=${deviceId}`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` } }
    );
    fetchCurrentTrack();
  };

  const togglePlayPause = async () => {
    if (!deviceId || !token) return;

    const res = await fetch("https://api.spotify.com/v1/me/player", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const playbackState = await res.json();

    if (playbackState.is_playing) {
      await fetch(
        `https://api.spotify.com/v1/me/player/pause?device_id=${deviceId}`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}` } }
      );
      setIsPlaying(false);
    } else {
      await apiPlay();
    }
    fetchCurrentTrack();
  };

  useEffect(() => {
    if (mode !== "play") return;
    const interval = setInterval(fetchCurrentTrack, 5000);
    return () => clearInterval(interval);
  }, [mode, token]);

  //Spotify UI
  if (mode === "play") {
    return (
      <div style={{ padding: 20 }}>
        <h1>Spotify</h1>

        <div>
          <input
            value={spotifySearch}
            onChange={(e) => setSpotifySearch(e.target.value)}
            placeholder="Search tracks or playlists"
          />
          <button onClick={searchSpotify}>Search</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
          {playerReady && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={skipPrevious}>⏮</button>
              <button onClick={togglePlayPause}>
                {isPlaying ? "⏸" : "▶"}
              </button>
              <button onClick={skipNext}>⏭</button>

              <span style={{ marginLeft: 20 }}>
                {currentTrack.name &&
                  `${currentTrack.name} — ${currentTrack.artists.join(", ")}`}
              </span>
            </div>
          )}
        </div>

        {playerReady && <h2>Tracks</h2>}
        {tracks.map((track) => (
          <div key={track.id} style={{ marginBottom: 5 }}>
            {track.name} — {track.artists.map((a) => a.name).join(", ")}
            <button onClick={() => playTrack(track.uri)}>▶ Play</button>
          </div>
        ))}

        {playerReady && <h2>Playlists</h2>}
        {playlists.map((pl) => (
          <div key={pl.id} style={{ marginBottom: 8 }}>
            <strong>{pl.name}</strong> — {pl.owner.display_name}
            <button
              style={{ marginLeft: 10 }}
              onClick={() => playPlaylist(pl.uri)}
            >
              ▶ Play
            </button>
          </div>
        ))}

        {!playerReady && <p>Loading Spotify player...</p>}

        <Button variant="outlined" onClick={() => setMode("search")}>⬅ Back</Button>
      </div>
    );
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
