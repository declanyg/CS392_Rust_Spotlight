import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Paper, Button, TextField, List, ListItem, Divider, IconButton} from "@mui/material";
import {ArrowBack, Search, SkipPrevious, SkipNext, PlayArrow, Pause} from "@mui/icons-material";

const Spotify = ({ playerReady, setPlayerReady, deviceId, setDeviceId, mode, setMode }) => {
  const [token, setToken] = useState("");
  const [spotifySearch, setSpotifySearch] = useState("");
  const [tracks, setTracks] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState({ name: "", artists: [] });

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

      window.onSpotifyWebPlaybackSDKReady = async () => {
        const player = new window.Spotify.Player({
          name: "Tauri Player",
          getOAuthToken: (cb) => cb(freshToken),
          volume: 0.5,
        });

        player.addListener("ready", async ({ device_id }) => {
          console.log("Player ready", device_id);
          setDeviceId(device_id);
          setPlayerReady(true);

          await invoke("spotify_transfer", { token: freshToken, deviceId: device_id });

          fetchCurrentTrack(freshToken);
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

  // Actions
  const searchSpotify = async () => {
    if (!token) return;
    const data = await invoke("spotify_search", { token, query: spotifySearch });
    const parsed = JSON.parse(data);
    setTracks(parsed.tracks.items);
    setPlaylists(parsed.playlists.items);
  };

  const apiPlay = async (body = {}) => {
    if (!deviceId || !token) return;
    await invoke("spotify_play", { token, deviceId, body: JSON.stringify(body) });
    setIsPlaying(true);
    fetchCurrentTrack();
  };

  const fetchCurrentTrack = async (overrideToken) => {
    const t = overrideToken || token;
    if (!t) return;

    const data = await invoke("spotify_current_track", { token: t });
    if (data === "null") {
      setCurrentTrack(null);
      setIsPlaying(false);
      return;
    }

    const json = JSON.parse(data);
    if (json && json.item) {
      setCurrentTrack({
        name: json.item.name,
        artists: json.item.artists?.map((a) => a.name) ?? [],
        img: json.item.album?.images?.[0]?.url || "",
      });
      setIsPlaying(json.is_playing);
    } else {
      setCurrentTrack(null);
      setIsPlaying(false);
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

  return (
    <div className="p-4 space-y-6">
      <div className="flex flex-row gap-2">
        <IconButton variant="outlined" size="small" onClick={() => setMode("search")}>
          <ArrowBack />
        </IconButton>
        <h1 className="text-3xl font-bold">Spotify</h1>
      </div>

      <Paper className="p-4 flex items-center gap-4">
        <TextField
          fullWidth
          label="Search"
          value={spotifySearch}
          onChange={(e) => setSpotifySearch(e.target.value)}
        />
        <Button variant="contained" endIcon={<Search />} onClick={searchSpotify}>
          Search
        </Button>
      </Paper>

      {playerReady && (
        <Paper className="p-4 flex flex-col items-center gap-4">
          {currentTrack?.img && (
            <img
              src={currentTrack.img}
              alt={currentTrack.name}
              className="w-40 h-40 object-cover rounded-md shadow-md mb-2"
            />
          )}
          <div className="text-lg font-medium">
            {currentTrack?.name ? (
              <div className="flex flex-col space-y-2 justify-center items-center">
                <div>{currentTrack.name}</div>
                <div>{(currentTrack.artists || []).join(", ")}</div>
              </div>
            ) : (
              <span className="text-gray-500">No track playing</span>
            )}
          </div>
          <div className="flex flex-row gap-4">
            <IconButton onClick={skipPrevious}><SkipPrevious /></IconButton>
            <IconButton onClick={togglePlayPause}>{isPlaying ? <Pause /> : <PlayArrow />}</IconButton>
            <IconButton onClick={skipNext}><SkipNext /></IconButton>
          </div>
        </Paper>
      )}

      {playerReady && (
        <Paper className="p-4">
          <h2 className="text-xl font-semibold mb-2">Tracks</h2>
          <Divider className="mb-3" />
          <List>
            {tracks.filter((track) => track).map((track) => (
              <ListItem key={track.id} className="flex justify-between items-center">
                <span className="mr-2">
                  <strong>{track.name}</strong> — {track.artists.map((a) => a.name).join(", ")}
                </span>
                <IconButton size="small" onClick={() => playTrack(track.uri)}>
                  <PlayArrow />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {playerReady && (
        <Paper className="p-4">
          <h2 className="text-xl font-semibold mb-2">Playlists</h2>
          <Divider className="mb-3" />
          <List>
            {playlists.filter((pl) => pl?.name && pl.owner?.display_name).map((pl) => (
              <ListItem key={pl.id} className="flex justify-between items-center">
                <span className="mr-2">
                  <strong>{pl.name}</strong> — {pl.owner.display_name}
                </span>
                <IconButton size="small" onClick={() => playPlaylist(pl.uri)}>
                  <PlayArrow />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {!playerReady && <p className="text-gray-500 text-lg">Loading Spotify player...</p>}
    </div>
  );
}

export default Spotify;
