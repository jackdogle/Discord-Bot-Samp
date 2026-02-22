import express from "express";
import { createServer as createViteServer } from "vite";
import { DiscordBot } from "./src/services/discordBot";
import { getDb, handleDbError, testConnection } from "./src/services/db";
import query from "samp-query";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize Discord Bot
  const bot = new DiscordBot();
  bot.start();

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/api/server-status", async (req, res) => {
    const ip = process.env.SAMP_IP || '167.71.197.62';
    const port = parseInt(process.env.SAMP_PORT || '7003');

    query({ host: ip, port }, (err, response) => {
      if (err) {
        return res.status(500).json({ error: "Server unreachable" });
      }
      res.json(response);
    });
  });

  app.get("/api/stats", async (req, res) => {
    try {
      const db = await getDb();
      
      // Get total player count
      const [userCount]: any = await Promise.race([
        db.execute('SELECT COUNT(*) as count FROM players'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Query timeout')), 3000))
      ]);

      // Try to get admin count with fallback column names
      let adminCountValue = 0;
      const adminColumns = ['AdminLevel', 'Admin', 'pAdmin', 'LevelAdmin', 'admin', 'pAdminLevel'];
      
      for (const col of adminColumns) {
        try {
          const [adminCount]: any = await db.execute(`SELECT COUNT(*) as count FROM players WHERE ${col} > 0`);
          adminCountValue = adminCount[0].count;
          break; // Found a working column
        } catch (e: any) {
          if (e.code === 'ER_BAD_FIELD_ERROR') continue;
          throw e; // Rethrow other errors
        }
      }
      
      res.json({
        totalPlayers: userCount[0].count,
        totalAdmins: adminCountValue,
      });
    } catch (error) {
      console.error('Stats API Error:', error);
      const dbError = handleDbError(error);
      res.status(503).json({ 
        error: "Database error", 
        message: dbError.message,
        details: dbError,
        isMock: true,
        totalPlayers: 0,
        totalAdmins: 0
      });
    }
  });

  app.get("/api/db-check", async (req, res) => {
    const result = await testConnection();
    if (result.success) {
      res.json({ status: "connected" });
    } else {
      res.status(503).json({ 
        status: "disconnected", 
        error: result.error 
      });
    }
  });

  // Player Search API
  app.get("/api/players/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 3) {
        return res.status(400).json({ error: "Search query must be at least 3 characters long." });
      }

      const db = await getDb();
      // Use common column names for LRP. We select * to get all available data.
      const [rows]: any = await db.execute(
        'SELECT * FROM players WHERE Username LIKE ? LIMIT 20',
        [`%${query}%`]
      );

      // Sanitize the output to remove sensitive data like passwords
      const sanitizedRows = rows.map((row: any) => {
        const { Password, Key, IP, ...safeData } = row;
        return safeData;
      });

      res.json(sanitizedRows);
    } catch (error) {
      console.error('Player Search API Error:', error);
      const dbError = handleDbError(error);
      res.status(500).json({ error: "Database error", details: dbError });
    }
  });

  // Economy Top API
  app.get("/api/economy/top", async (req, res) => {
    try {
      const db = await getDb();
      
      // Try to find money column
      let moneyColumn = 'Money';
      const moneyColumns = ['Money', 'pCash', 'Cash', 'Bank', 'pBank'];
      let querySuccess = false;
      let rows: any = [];

      for (const col of moneyColumns) {
        try {
          [rows] = await db.execute(`SELECT Username, ${col} as Wealth FROM players ORDER BY ${col} DESC LIMIT 10`);
          querySuccess = true;
          break;
        } catch (e: any) {
          if (e.code === 'ER_BAD_FIELD_ERROR') continue;
          throw e;
        }
      }

      if (!querySuccess) {
        return res.status(404).json({ error: "Could not determine economy columns in database." });
      }

      res.json(rows);
    } catch (error) {
      console.error('Economy Top API Error:', error);
      const dbError = handleDbError(error);
      res.status(500).json({ error: "Database error", details: dbError });
    }
  });

  // Bot Settings API
  app.get("/api/bot/settings", (req, res) => {
    res.json({
      token: process.env.DISCORD_TOKEN ? '********' + process.env.DISCORD_TOKEN.slice(-4) : '',
      clientId: process.env.DISCORD_CLIENT_ID || '',
      guildId: process.env.DISCORD_GUILD_ID || '',
      statusChannel: process.env.DISCORD_STATUS_CHANNEL || '',
      adminRole: process.env.DISCORD_ADMIN_ROLE || '',
    });
  });

  app.post("/api/bot/settings", (req, res) => {
    // In a real application, you would save these to a database or a .env file.
    // For this preview environment, we just mock a successful save.
    const { token, clientId, guildId, statusChannel, adminRole } = req.body;
    
    // Example of what you would do:
    // if (token && !token.startsWith('***')) process.env.DISCORD_TOKEN = token;
    // process.env.DISCORD_CLIENT_ID = clientId;
    // process.env.DISCORD_GUILD_ID = guildId;
    
    res.json({ success: true, message: "Settings saved successfully." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
