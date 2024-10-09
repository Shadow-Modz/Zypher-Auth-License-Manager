import { ButtonStyle, ColorResolvable } from "discord.js";

export interface Config {
  GeneralSettings: GeneralSettings;
  DatabaseSettings: DatabaseSettings;
  LicenseSettings: LicenseSettings;
  WebhookLogs: WebhookLogs;
  CommandsSettings: CommandsSettings;
}

interface WebhookLogs {
  Auth: string;
  Commands: string;
}

interface CommandsSettings {
  [key: string]: {
    Enabled: boolean;
    Permissions: string[];
  };
}

interface GeneralSettings {
  Token: string;
  LicenseKey: string;
  EmbedColor: ColorResolvable;
  CustomerRole: string;
}

interface DatabaseSettings {
  Uri: string;
}

interface LicenseSettings {
  ApiPort: number;
  SecretKey: string;
  PublicApiKey: string;
  SecretApiKey: string;
}

export interface DownloadConfig {
  MainEmbed: MainEmbed;
  Buttons: Button[];
  URLs: {
    [key: string]: string;
  };
}

interface MainEmbed {
  Title: string;
  Description: string;
}

interface Button {
  Name: string;
  Emoji: string;
  CustomId?: string;
  URL: string;
  Style?: ButtonStyle;
}
