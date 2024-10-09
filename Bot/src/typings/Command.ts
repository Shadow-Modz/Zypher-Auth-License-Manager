import {
  ChatInputApplicationCommandData,
  ChatInputCommandInteraction,
  CommandInteractionOptionResolver,
  GuildMember,
  TextChannel,
} from "discord.js";
import { ExtendedClient } from "../structures/Client";

export interface ExtendedInteraction extends ChatInputCommandInteraction {
  member: GuildMember;
  channel: TextChannel;
}

interface RunOptions {
  client: ExtendedClient;
  interaction: ExtendedInteraction;
  args: CommandInteractionOptionResolver;
}

export type CommandType = {
  run: (options: RunOptions) => unknown;
  Permissions?: string[];
  directory?: string;
} & ChatInputApplicationCommandData;
