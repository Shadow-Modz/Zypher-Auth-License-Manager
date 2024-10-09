import connect from "connect-mongodb-session";
import apiRoutes from "../routes/api.routes";
import devRoutes from "../routes/dev.routes";
import usrRoutes from "../routes/usr.routes";
import UserModel from "../models/UserModel";
import { Strategy } from "passport-discord";
import type { Express } from "express";
import session from "express-session";
import passport from "passport";
import express from "express";
import { client } from "..";
import axios from "axios";
import path from "path";

const fetchErrors = {
  INVALID_LICENSE: "Your license is invalid.",
  INVALID_PRODUCT: "Yor license product is invalid.",
  MAX_IP_CAP: "Too many ips, restart from panel.",
};

export class App {
  public server: Express;

  constructor() {
    this.server = express();
  }

  private middlewares() {
    this.server.set("port", client.config.LicenseSettings.ApiPort);
    // @ts-ignore
    this.server.use(
      express.static(path.join(process.cwd(), "src", "web", "assets"))
    );
    this.server.set("views", path.join(process.cwd(), "src", "web", "views"));
    this.server.set("view engine", "ejs");
    this.server.set("trust proxy", 1);
    // @ts-ignore
    this.server.use(express.json());

    const MongoDBStore = connect(session);

    // @ts-ignore
    this.server.use(
      session({
        secret: client.config.GeneralSettings.Token,
        saveUninitialized: false,
        resave: false,
        store: new MongoDBStore({
          uri: client.config.DatabaseSettings.Uri,
          collection: "sessions",
        }),
        cookie: {
          maxAge: 1000 * 60 * 60 * 24 * 7 * 2,
          httpOnly: true,
        },
      })
    );
  }

  private routes() {
    this.server.use("/api/", apiRoutes);
    this.server.use("/api/", devRoutes);
    this.server.use("/", usrRoutes);
  }

  private passport() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    passport.serializeUser((user: any, done) => {
      done(null, user._id);
    });

    passport.deserializeUser(async (id, done) => {
      const user: Express.User = await UserModel.findById(id);
      if (!user) {
        return done(null, false);
      }

      return done(null, user);
    });

    passport.use(
      new Strategy(
        {
          clientID: client.config.DashboardSettings.ClientId,
          clientSecret: client.config.DashboardSettings.ClientSecret,
          callbackURL: "/auth/callback",
          scope: ["identify"],
          passReqToCallback: true,
        },
        async (req, accessToken, refreshToken, profile, done) => {
          try {
            const user: Express.User = await UserModel.findOne({
              discordId: profile.id,
            });

            if (user) return done(null, user);

            const staffUser = await UserModel.findOne();
            const newUser = new UserModel({
              discordId: profile.id,
              role: staffUser ? "user" : "owner",
            });

            await newUser.save();
            done(null, newUser as unknown as Express.User);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );

    this.server.use(passport.initialize());
    this.server.use(passport.session());

    this.server.use(async (req, res, next) => {
      res.locals.user = req.user || (null as Express.User);

      if (req.user) {
        let user = client.users.cache.get(res.locals.user.discordId);
        if (!user?.tag) {
          user = await client.users.fetch(res.locals.user.discordId);
        }

        res.locals.user.avatar = user.displayAvatarURL();
        res.locals.user.tag = user.tag;
      }

      next();
    });
  }

  async start(isLogged: boolean) {
    this.middlewares();
    this.passport();
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
