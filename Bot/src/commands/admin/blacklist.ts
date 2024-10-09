import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import BlacklistModel from "../../models/BlacklistModel";
import dateToTimestamp from "../../helpers/timestamp";
import { Command } from "../../structures/Command";
import paginationEmbed from "../../helpers/pagination";

export default new Command({
  name: "blacklist",
  description: "blacklist manager",
  options: [
    {
      name: "add",
      description: "Add IP or HWID to the blacklist",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "type",
          description: "Is this an IP or HWID?",
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: "IP",
              value: "ip",
            },
            {
              name: "HWID",
              value: "hwid",
            },
          ],
          required: true,
        },
        {
          name: "value",
          description: "The ip or HWID to add to the blacklist",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "remove",
      description: "Remove ip or HWID from the blacklist",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "type",
          description: "Is this an IP or HWID?",
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: "IP",
              value: "ip",
            },
            {
              name: "HWID",
              value: "hwid",
            },
          ],
          required: true,
        },
        {
          name: "value",
          description: "The ip or HWID to remove to the blacklist",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "list",
      description: "List all IPs and HWIDs in the blacklist",
      type: ApplicationCommandOptionType.Subcommand,
    },
  ],
  run: async ({ client, interaction }) => {
    const subCommand = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    if (subCommand === "add") {
      //@ts-ignore
      const type = interaction.options.getString("type");
      //@ts-ignore
      const value = interaction.options.getString("value");

      if (type === "ip" && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/gm.test(value)) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle("You need to send a valid ip address ex: (1.0.0.1)")
              .setColor("Red"),
          ],
        });
      }

      const isBlacklisted = await BlacklistModel.findOne({
        blacklisted: value,
        type: type,
      });

      if (isBlacklisted) {
        const staffUser = await interaction.client.users.fetch(
          isBlacklisted.createdBy
        );
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: `${type.toUpperCase()} is already blacklisted`,
                iconURL: client.user.displayAvatarURL(),
              })
              .setColor("Red")
              .setTimestamp()
              .addFields([
                {
                  name: "• Blacklist Information:",
                  value: `>>> ${type.toUpperCase()}: **${
                    isBlacklisted.blacklisted
                  }**\nBlocked Connections: **${
                    isBlacklisted.blocked_connections
                  }**\nBlacklisted at: ${dateToTimestamp(
                    isBlacklisted.createdAt
                  )}`,
                },
                {
                  name: "• Blacklisted by:",
                  value: `>>> User: <@!${isBlacklisted.createdBy}> (${staffUser.tag})\nUser ID: **${isBlacklisted.createdBy}**`,
                },
              ]),
          ],
        });
      }

      await BlacklistModel.create({
        blacklisted: value,
        type: type,
        blocked_connections: 0,
        createdBy: interaction.user.id,
      });

      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${type.toUpperCase()} Blacklisted Correctly`,
              iconURL: client.user.displayAvatarURL(),
            })
            .setColor(client.config.GeneralSettings.EmbedColor)
            .setTimestamp()
            .addFields([
              {
                name: "• Blacklist Information:",
                value: `>>> ${type.toUpperCase()}: **${value}**\nBlocked Connections: **${0}**\nBlacklisted at: ${dateToTimestamp()}`,
              },
              {
                name: "• Blacklisted by:",
                value: `>>> User: <@!${interaction.user.id}> (${interaction.user.tag})\nUser ID: **${interaction.user.id}**`,
              },
            ]),
        ],
      });
    } else if (subCommand === "remove") {
      //@ts-ignore
      const type = interaction.options.getString("type");
      //@ts-ignore
      const value = interaction.options.getString("value");

      if (type === "ip" && !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/gm.test(value)) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setTitle("You need to send a valid ip address ex: (1.0.0.1)")
              .setColor("Red"),
          ],
        });
      }

      const blacklistData = await BlacklistModel.findOne({
        blacklisted: value,
        type: type,
      });

      if (!blacklistData) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: `Can't Un-Blacklist the ${type.toUpperCase()}`,
                iconURL: client.user.displayAvatarURL(),
              })
              .addFields({
                name: `• ${type.toUpperCase()} not found`,
                value: `>>> Hey, this ${type.toUpperCase()} isn't blacklisted, check that you have sent the ${type.toUpperCase()} correctly, remember that we are case sensitive`,
              })
              .setColor("Red")
              .setTimestamp(),
          ],
        });
      }

      await blacklistData.delete();
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `${type.toUpperCase()} Un-Blacklisted Correctly`,
              iconURL: client.user.displayAvatarURL(),
            })
            .setColor(client.config.GeneralSettings.EmbedColor)
            .setTimestamp()
            .addFields([
              {
                name: "• Blacklist Information:",
                value: `>>> ${type.toUpperCase()}: **${value}**\nBlocked Connections: **${
                  blacklistData.blocked_connections
                }**\nBlacklisted at: ${dateToTimestamp(
                  blacklistData.createdAt
                )}`,
              },
              {
                name: "• Blacklisted by:",
                value: `>>> User: <@!${interaction.user.id}> (${interaction.user.tag})\nUser ID: **${interaction.user.id}**`,
              },
            ]),
        ],
      });
    } else if (subCommand === "list") {
      const blacklistData = await BlacklistModel.find();

      if (!blacklistData.length) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "Can't list blacklists",
                iconURL: client.user.displayAvatarURL(),
              })
              .addFields({
                name: "• You don't have any blacklist",
                value:
                  ">>> Hey, you don't have any blacklist to list, create one using the command -/blacklist add",
              })
              .setColor("Red")
              .setTimestamp(),
          ],
        });
      }

      const embeds = [];
      for (const blacklist of blacklistData) {
        const staffUser = await client.users.fetch(blacklist.createdBy);
        embeds.push(
          new EmbedBuilder()
            .setAuthor({
              name: `Total Blacklisteds: ${blacklistData.length}`,
              iconURL: client.user.displayAvatarURL(),
            })
            .setColor(client.config.GeneralSettings.EmbedColor)
            .setTimestamp()
            .addFields([
              {
                name: "• Blacklist Information:",
                value: `>>> ${blacklist.type.toUpperCase()}: **${
                  blacklist.blacklisted
                }**\nBlocked Connections: **${
                  blacklist.blocked_connections
                }**\nBlacklisted at: ${dateToTimestamp(blacklist.createdAt)}`,
              },
              {
                name: "• Blacklisted by:",
                value: `>>> User: <@!${staffUser.id}> (${staffUser.tag})\nUser ID: **${staffUser.id}**`,
              },
            ])
            .setFooter({
              text: `Page ${embeds.length + 1} of ${blacklistData.length}`,
            })
        );
      }

      paginationEmbed({
        interaction,
        embeds,
        time: 120000,
        type: "followUp",
      });
    }
  },
});
