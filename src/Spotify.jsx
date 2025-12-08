import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Button from "@mui/material/Button";

const Spotify = ( { mode, setMode } ) => {
    const [token, setToken] = useState("");
    const [playerReady, setPlayerReady] = useState(false);
    const [deviceId, setDeviceId] = useState(null);
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

  const res = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

    if (res.status === 204) {
      setCurrentTrack(null);
      setIsPlaying(false);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();

    if (data && data.item) {
      setCurrentTrack({
        name: data.item.name,
        artists: data.item.artists?.map((a) => a.name) ?? [],
      });
      setIsPlaying(data.is_playing);
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

              {/* Current track display */}
              <span style={{ marginLeft: 20 }}>
                {currentTrack && currentTrack.name
                  ? `${currentTrack.name} — ${(currentTrack.artists || []).join(", ")}`
                  : ""}
              </span>
            </div>
          )}
        </div>

        {playerReady && <h2>Tracks</h2>}
        {tracks.filter(track => track !== null && track !== undefined).map((track) => (
          <div key={track.id} style={{ marginBottom: 5 }}>
            {track.name} — {track.artists.map((a) => a.name).join(", ")}
            <button onClick={() => playTrack(track.uri)}>▶ Play</button>
          </div>
        ))}

        {playerReady && <h2>Playlists</h2>}
        {playlists.filter(pl => pl !== null && pl !== undefined).map((pl) => (
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

export default Spotify;