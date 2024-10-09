import apiRoutes from "../routes/api.routes";
import devRoutes from "../routes/dev.routes";
import type { Express } from "express";
import express from "express";
import { client } from "..";

export class App {
  public server: Express;

  constructor() {
    this.server = express();
  }

  private middlewares() {
    this.server.set("port", client.config.LicenseSettings.ApiPort);
    this.server.set("trust proxy", 1);
    // @ts-ignore
    this.server.use(express.json());
  }

  private routes() {
    this.server.use("/api/", apiRoutes);
    this.server.use("/api/", devRoutes);
  }

  async start(isLogged: boolean) {
    this.middlewares();
    this.routes();

    if (!isLogged) return process.exit(1);
    this.server.listen(this.server.get("port"), () => {
      client.logger.success(
        `Server started on port -> ${this.server.get("port")}`
      );
    });

    client.logger.success(
      `Your can access to the dashboard at -> http://127.0.0.1:${this.server.get(
        "port"
      )}`
    );
  }
}
