import LicenseModel from "../../models/LicenseModel";
import { Command } from "../../structures/Command";
import { EmbedBuilder } from "discord.js";

export default new Command({
  name: "clearmyips",
  description: "Clear all ips of your licenses",
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

    for (const license of licenses) {
      license.ip_list = [];
      license.latest_ip = null;
      await license.save();
    }

    await interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            `You have successfully cleared your ips from all your licenses (${licenses.length})`
          )
          .setColor(client.config.GeneralSettings.EmbedColor),
      ],
    });

    const webhook = client.webhooks.commands;
    await webhook?.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `License Data Cleared (IPs)`,
            iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
          })
          .setColor("Orange")
          .addFields([
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
