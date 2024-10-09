import { ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import { generateRequestCharts } from "../../helpers/createCharts";
import { Command } from "../../structures/Command";

export default new Command({
  name: "stats",
  description: "View the stats of your server",
  options: [
    {
      name: "type",
      description: "What date range do you want to see?",
      type: ApplicationCommandOptionType.String,
      choices: [
        {
          name: "Week",
          value: "Weekly",
        },
        {
          name: "Month",
          value: "Monthly",
        },
      ],
      required: true,
    },
  ],
  run: async ({ interaction, client }) => {
    await interaction.deferReply();
    const type = interaction.options.getString("type");

    const chartData = await generateRequestCharts(type);
    if (!chartData) {
      return interaction.followUp({
        embeds: [
          new EmbedBuilder()
            .setTitle("I have not received any requests to my api.")
            .setColor("Red"),
        ],
      });
    }

    await interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Request's ${type} Statistics`)
          .setDescription(
            `Successfully Response Per Day: **${chartData.averageSuccess}**\nRejected Response Per Day: **${chartData.averageRejected}**`
          )
          .setColor(client.config.GeneralSettings.EmbedColor)
          .setImage("attachment://image.jpg"),
      ],
      files: [chartData.attachment],
    });
  },
});
