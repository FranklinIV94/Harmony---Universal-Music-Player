import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import axios from "axios";
import multer from "multer";
import fs from "fs";

dotenv.config();

const upload = multer({ dest: "uploads/" });

async function startServer() {
  const app = express();
  const PORT = 3000;

  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  app.use(express.json());
  app.use(cookieParser());
  app.use("/uploads", express.static("uploads"));

  // --- Local Files Routes ---
  app.post("/api/local/upload", upload.single("file"), (req, res) => {
    if (!req.file) return res.status(400).send("No file uploaded");
    
    // In a real app, we'd extract metadata (ID3 tags) here
    const track = {
      id: req.file.filename,
      title: req.file.originalname,
      artist: "Local Artist",
      album: "Local Album",
      url: `/uploads/${req.file.filename}`,
      platform: "local"
    };
    
    res.json(track);
  });

  app.get("/api/local/tracks", (req, res) => {
    // Simple mock for now, would normally read from a DB or filesystem
    res.json([]);
  });

  // --- Spotify OAuth Routes ---
  const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
  const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
  const REDIRECT_URI = `${process.env.APP_URL}/api/auth/spotify/callback`;

  app.get("/api/auth/spotify/url", (req, res) => {
    const scope = "user-read-private user-read-email user-library-read user-top-read streaming user-read-playback-state user-modify-playback-state";
    const params = new URLSearchParams({
      response_type: "code",
      client_id: SPOTIFY_CLIENT_ID!,
      scope: scope,
      redirect_uri: REDIRECT_URI,
    });
    res.json({ url: `https://accounts.spotify.com/authorize?${params.toString()}` });
  });

  app.get("/api/auth/spotify/callback", async (req, res) => {
    const code = req.query.code as string;
    try {
      const response = await axios.post(
        "https://accounts.spotify.com/api/token",
        new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          redirect_uri: REDIRECT_URI,
        }),
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;
      
      // Set tokens in cookies
      res.cookie("spotify_access_token", access_token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: "none",
        maxAge: expires_in * 1000 
      });
      res.cookie("spotify_refresh_token", refresh_token, { 
        httpOnly: true, 
        secure: true, 
        sameSite: "none" 
      });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'spotify' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Spotify Auth Error:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/spotify/me", async (req, res) => {
    const token = req.cookies.spotify_access_token;
    if (!token) return res.status(401).json({ error: "Not authenticated" });

    try {
      const response = await axios.get("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // --- Vite middleware for development ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
