import paginationEmbed from "../../helpers/pagination";
import LicenseModel from "../../models/LicenseModel";
import { Command } from "../../structures/Command";
import { decrypt } from "../../helpers/crypto";
import { EmbedBuilder } from "discord.js";
import dateToTimestamp from "../../helpers/timestamp";

export default new Command({
  name: "mylicenses",
  description: "Get your license keys",
  run: async ({ interaction, client }) => {
    await interaction.deferReply({ ephemeral: true });
    const licenses = await LicenseModel.find({
      discord_id: interaction.user.id,
    });

    if (!licenses.length) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle("You don't have licenses in this server.")
            .setColor("Red"),
        ],
      });
    }

    const embeds = [];
    for (const license of licenses) {
      embeds.push(
        new EmbedBuilder()
          .setAuthor({
            name: `You have ${licenses.length} License Keys`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setColor(client.config.GeneralSettings.EmbedColor)
          .setTimestamp()
          .addFields([
            {
              name: "• License Information:",
              value: `>>> License Key: **${decrypt(
                license.license
              )}**\nProduct: **${license.product_name}**\nExpire at: ${
                license.expires_date
                  ? dateToTimestamp(license.expires_date)
                  : "**Never**"
              }\nCreated at: ${dateToTimestamp(license.createdAt)}`,
            },
            {
              name: "• User Information:",
              value: `>>> User: <@!${interaction.user.id}> (${interaction.user.tag})\nUser ID: **${interaction.user.id}**`,
            },
          ])
          .setFooter({
            text: `Page ${embeds.length + 1} of ${licenses.length}`,
          })
      );
    }

    paginationEmbed({
      interaction,
      embeds,
      time: 120000,
      ephemeral: true,
      type: "followUp",
    });

    const webhook = client.webhooks.commands;
    await webhook?.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `User executed command`,
            iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
          })
          .setColor("Orange")
          .addFields([
            {
              name: "• Command Information:",
              value: `>>> Command: **${interaction.commandName}**\nChannel: <#${interaction.channelId}>\nGuild: **${interaction.guild.name}**\nGuild ID: **${interaction.guildId}**`,
            },
            {
              name: "• User Information:",
              value: `>>> User: <@!${interaction.user.id}> (${interaction.user.tag})\nUser ID: **${interaction.user.id}**`,
            },
          ])
          .setTimestamp(),
      ],
    });
  },
});
