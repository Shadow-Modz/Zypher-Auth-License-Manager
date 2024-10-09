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
import { Config } from "../typings/Config";
import Logger from "../helpers/logger";
import { readdirSync, readFileSync } from "fs";
import { promisify } from "util";
import { Event } from "./Event";
import { load } from "js-yaml";
import axios from "axios";
import { app } from "..";
import glob from "glob";
import { join, resolve } from "path";

const globPromise = promisify(glob);

const fetchErrors = {
  INVALID_LICENSE: "Your license is invalid.",
  INVALID_PRODUCT: "Yor license product is invalid.",
  MAX_IP_CAP: "Too many ips, restart from panel.",
};

interface AddonExports {
  [key: string]: CommandType | Event<keyof ClientEvents>;
}

export class ExtendedClient extends Client {
  config: Config;
  commands: Collection<string, CommandType> = new Collection();
  webhooks: { [key: string]: WebhookClient };
  logger: Logger;
  guild: Guild;

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
  }

  async start() {
    app.start(true);
    await this.login(this.config.GeneralSettings.Token);
    this.logger.success(`Logged in as ${this.user.tag}`);

    this.handleErrors();
    await startDatabase(this);
    await this.loadEvents();
    await this.loadCommands();
    await this.registerCommands();
  }

  async importFile(filePath: string) {
    return (await import(filePath))?.default;
  }

  async importAddon(filePath: string) {
    return await import(filePath);
  }

  async loadEvents() {
    let eventFiles;
    let eventsFolderPath = resolve(__dirname, "../events");

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

  async loadAddons() {
    const addonFiles = await globPromise(
      `${__dirname}/../../addons/**/index{.ts,.js}`
    );
    addonFiles.forEach(async (filePath) => {
      const addonImports: AddonExports = await this.importAddon(filePath);
      const addons = Object.keys(addonImports);

      const splitted = filePath.split("/");
      const directory = splitted[splitted.length - 2];

      for (const name of addons) {
        const method = addonImports[name];

        if (method instanceof Event) {
          this.on(method.event, method.run);
        } else {
          const commandConfig =
            this.config.CommandsSettings[capitalize(method.name)];
          if (!commandConfig?.Enabled) continue;

          const properties = { directory, ...method, ...commandConfig };
          this.commands.set(method.name, properties);
        }
      }

      this.logger.info(`The ${directory} addon has been loadded`);
    });
  }

  async registerCommands() {
    this.guild = this.guilds.cache.first();

    if (!this.guild?.commands) {
      this.logger.error("You need invite the bot to a server.");
      process.exit(1);
    }

    this.guild.commands.set(this.commands.toJSON()).catch((e) => e);
  }

  handleErrors() {
    process.on("unhandledRejection", (e: string) => this.logger.error(e));
    process.on("uncaughtException", (e: string) => this.logger.error(e));
  }
}

function capitalize(string) {
  return string.at(0).toUpperCase() + string.slice(1, string.length);
}

function getCommandFiles(directoryPath) {
  const { join } = require("path");

  let files = [];

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
