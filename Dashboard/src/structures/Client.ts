import {
  Client,
  ClientEvents,
  Collection,
  GatewayIntentBits,
  Guild,
  WebhookClient,
} from "discord.js";
import startDatabase from "../helpers/mongodb.connecter";
import { CommandType } from "../typings/Command";
import { readdirSync, readFileSync } from "fs";
import RoleModel from "../models/RoleModel";
import { Config } from "../typings/Config";
import Logger from "../helpers/logger";
import { join, resolve } from "path";
import { promisify } from "util";
import { Event } from "./Event";
import { load } from "js-yaml";
import axios from "axios";
import { app } from "..";
import glob from "glob";

const globPromise = promisify(glob);

const fetchErrors = {
  INVALID_LICENSE: "Your license is invalid.",
  INVALID_PRODUCT: "Yor license product is invalid.",
  MAX_IP_CAP: "Too many ips, restart from panel.",
};

export class ExtendedClient extends Client {
  config: Config;
  commands: Collection<string, CommandType> = new Collection();
  webhooks: { [key: string]: WebhookClient };
  logger: Logger;
  guild: Guild;
  static logger: any;
  static commands: any;
  static config: any;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });

    this.config = load(readFileSync("config/config.yml", "utf-8")) as Config;
    this.logger = new Logger();
    this.webhooks = {};

    if (this.config.WebhookLogs.Auth) {
      this.webhooks.auth = new WebhookClient({
        url: this.config.WebhookLogs.Auth,
      });
    }

    if (this.config.WebhookLogs.Commands) {
      this.webhooks.commands = new WebhookClient({
        url: this.config.WebhookLogs.Commands,
      });
    }

    if (this.config.WebhookLogs.Web) {
      this.webhooks.web = new WebhookClient({
        url: this.config.WebhookLogs.Web,
      });
    }
  }

  async start() {
    app.start(true);
    await this.login(this.config.GeneralSettings.Token);
    this.logger.success(`Logged in as ${this.user.tag}`);

    this.handleErrors();
    await startDatabase(this);
    await this.loadEvents();
    await this.loadRoles();
    await this.loadCommands();
    await this.registerCommands();
  }

  async importFile(filePath: string) {
    return (await import(filePath))?.default;
  }

  async loadEvents() {
    let eventFiles;
    const eventsFolderPath = resolve(__dirname, "../events");

    if (process.platform === "win32") {
      eventFiles = readdirSync(eventsFolderPath).filter(
        (file) => file.endsWith(".ts") || file.endsWith(".js")
      );
    } else {
      eventFiles = await globPromise(`${eventsFolderPath}/**/*{.ts,.js}`);
    }

    eventFiles.forEach(async (filePath) => {
      const event: Event<keyof ClientEvents> = await this.importFile(
        resolve(eventsFolderPath, filePath)
      );
      this.on(event.event, event.run);
    });

    this.logger.success(`Loaded ${eventFiles.length} events.`);
  }

  async loadRoles() {
    const userRole = {
      roleId: 1,
      name: "User",
      permissions: [
        "view-own-license",
        "clear-ips-own-license",
        "view-license",
      ],
    };

    const supportRole = {
      roleId: 2,
      name: "Support",
      permissions: [
        "view-own-license",
        "clear-ips-own-license",
        "view-license",
      ],
    };

    const developerRole = {
      roleId: 3,
      name: "Developer",
      permissions: [
        "view-own-license",
        "clear-ips-own-license",
        "view-license",
        "create-license",
        "edit-license",
        "remove-license",
      ],
    };

    const adminRole = {
      roleId: 4,
      name: "Admin",
      permissions: [
        "view-own-license",
        "clear-ips-own-license",
        "view-license",
        "create-license",
        "edit-license",
        "remove-license",
        "view-product",
        "create-product",
        "edit-product",
        "remove-product",
        "view-user",
        "edit-user",
      ],
    };

    const ownerRole = {
      roleId: 5,
      name: "Owner",
      permissions: [
        "view-own-license",
        "clear-ips-own-license",
        "view-license",
        "create-license",
        "edit-license",
        "remove-license",
        "view-product",
        "create-product",
        "edit-product",
        "remove-product",
        "view-user",
        "edit-user",
        "view-role",
        "create-role",
        "edit-role",
      ],
    };

    const roles = [userRole, supportRole, developerRole, adminRole, ownerRole];

    roles.forEach(async (roleObject) => {
      try {
        const role = await RoleModel.findOne({
          name: roleObject.roleId,
        });

        if (role) return;

        const newRole = new RoleModel({
          roleId: roleObject.roleId,
          name: roleObject.name,
          permissions: roleObject.permissions,
        });

        await newRole.save();
      } catch (error) {
        console.error(error);
      }
    });
  }

  async loadCommands() {
    let commandFiles;
    const commandsFolderPath = resolve(__dirname, "../commands");

    if (process.platform === "win32") {
      commandFiles = getCommandFiles(commandsFolderPath);
    } else {
      commandFiles = await globPromise(`${commandsFolderPath}/**/*{.ts,.js}`);
    }

    for (const filePath of commandFiles) {
      try {
        const command: CommandType = await this.importFile(filePath);
        const commandConfig =
          this.config.CommandsSettings[capitalize(command.name)];
        if (!commandConfig?.Enabled) continue;

        const splitted = filePath.split("/");
        const directory = splitted[splitted.length - 2];

        const properties = { directory, ...command, ...commandConfig };
        this.commands.set(command.name, properties);
      } catch (error) {
        console.error(error);
        console.trace();
      }
    }

    this.logger.success(`Loaded ${commandFiles.length} commands.`);
  }

  async registerCommands() {
    this.guild = this.guilds.cache.first();

    if (!this.guild?.commands) {
      this.logger.error("You need invite the bot to a server.");
      process.exit(1);
    }

    const commands = await this.guild.commands.fetch();
    if (commands.size === this.commands.size) return;

    this.guild.commands.set(this.commands.toJSON());
    this.logger.success(`Registered ${this.commands.size} commands`);
  }

  handleErrors() {
    process.on("unhandledRejection", (e: string) => this.logger.error(e));
    process.on("uncaughtException", (e: string) => this.logger.error(e));
  }

  static getInstance() {
    if (!this) this.logger.error("Client is not initialized.");
    return this;
  }
}

function capitalize(string) {
  return string.at(0).toUpperCase() + string.slice(1, string.length);
}

function getCommandFiles(directoryPath) {
  const files = [];
  const dirents = readdirSync(directoryPath, { withFileTypes: true });

  for (const dirent of dirents) {
    const fullPath = join(directoryPath, dirent.name);
    if (
      dirent.isFile() &&
      (dirent.name.endsWith(".ts") || dirent.name.endsWith(".js"))
    ) {
      files.push(fullPath);
    } else if (dirent.isDirectory()) {
      files.push(...getCommandFiles(fullPath));
    }
  }

  return files;
}
