console.log("🔍 Starting server setup...");
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import chatRouter from "./routes/chat";

try {
  console.log("✅ Imports done");

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  (async () => {
    try {
      const server = await registerRoutes(app);

      if (app.get("env") === "development") {
        await setupVite(app, server);
      } else {
        serveStatic(app);
      }

      // Register routes
      app.use("/api/chat", chatRouter);

      const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

      // Try different ways of binding the server based on the environment
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error("❌ Error in async server setup:", err);
    }
  })();
} catch (err) {
  console.error("❌ Error during imports:", err);
}

