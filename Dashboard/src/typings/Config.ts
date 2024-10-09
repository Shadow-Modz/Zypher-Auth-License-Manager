import { ColorResolvable } from "discord.js";

export interface Config {
  GeneralSettings: GeneralSettings;
  DashboardSettings: DashboardSettings;
  DatabaseSettings: DatabaseSettings;
  LicenseSettings: LicenseSettings;
  WebhookLogs: WebhookLogs;
  CommandsSettings: CommandsSettings;
}

interface WebhookLogs {
  Auth: string;
  Commands: string;
  Web: string;
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
  DashboardKey: string;
  CustomerRole: string;
  EmbedColor: ColorResolvable;
}

interface DatabaseSettings {
  Uri: string;
}

interface DashboardSettings {
  ClientId: string;
  ClientSecret: string;
}

interface LicenseSettings {
  ApiPort: number;
  SecretKey: string;
  PublicApiKey: string;
  SecretApiKey: string;
}
