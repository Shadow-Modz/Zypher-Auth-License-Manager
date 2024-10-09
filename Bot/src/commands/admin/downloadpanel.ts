import {
  ApplicationCommandOptionType,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { Command } from "../../structures/Command";
import { DownloadConfig } from "../../typings/Config";
import { getDownloadConfig, updateYAML } from "../../helpers/yamlUtility";

const downloadConfig: DownloadConfig = getDownloadConfig();

export default new Command({
  name: "download",
  description: "Create download panel",
  options: [
    {
      name: "create",
      description: "Create download panel",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "update",
      description: "Update configurations",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "type",
          description: "Choose a button name",
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: getDownloadConfig().Buttons.map((button) => ({
            name: button.Name, // Display name of the button as the choice name
            value: button.CustomId, // Use the button's CustomId as the choice value
          })),
        },
        {
          name: "url",
          description: "New value for the selected type",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],
  run: async ({ interaction }) => {
    const subCommand = interaction.options.getSubcommand();

    if (subCommand === "create") {
      await interaction.deferReply();

      const embed = new EmbedBuilder()
        .setTitle(downloadConfig.MainEmbed.Title)
        .setDescription(downloadConfig.MainEmbed.Description)
        .setTimestamp();

      // Dynamically creating buttons based on download.yml
      const actionRowComponents = downloadConfig.Buttons.map((button) => {
        const builtButton = new ButtonBuilder()
          .setStyle(button.Style || ButtonStyle.Primary)
          .setLabel(button.Name)
          .setEmoji(button.Emoji);

        //@ts-ignore
        // Issue with Link change later
        if (button.Style === "Link" && button.URL) {
          builtButton.setURL(button.URL);
        } else {
          builtButton.setCustomId(button.CustomId);
        }

        return builtButton.toJSON();
      });

      await interaction.editReply({
        embeds: [embed],
        components: [
          {
            type: 1, // This is the ACTION_ROW type.
            components: actionRowComponents,
          },
        ],
      });
    } else if (subCommand === "update") {
      //@ts-ignore
      const newURL = interaction.options.getString("url");
      //@ts-ignore
      const configType = interaction.options.getString("type"); // This will get the currently set URL

      if (configType && newURL) {
        // Load current configuration
        const currentConfig: DownloadConfig = getDownloadConfig();

        // Find the button in the configuration that matches the chosen CustomId
        const buttonToUpdate = currentConfig.Buttons.find(
          (btn) => btn.CustomId === configType
        );

        if (buttonToUpdate) {
          buttonToUpdate.URL = newURL;
          //@ts-ignore
          if (buttonToUpdate.Style === "Link") {
            buttonToUpdate.URL = newURL;
          } else {
            buttonToUpdate.CustomId = configType;
          }
          updateYAML("Buttons", currentConfig.Buttons);
        }

        //await interaction.reply({
        //    content: `Configuration for ${configType} updated to: ${newURL}`,
        //    ephemeral: true  // This makes the reply only visible to the user
        //});

        const embed = new EmbedBuilder()
          .setTitle(downloadConfig.MainEmbed.Title)
          .setDescription(downloadConfig.MainEmbed.Description)
          .setTimestamp();

        const actionRowComponents = downloadConfig.Buttons.map((button) => {
          const builtButton = new ButtonBuilder()
            .setStyle(button.Style || ButtonStyle.Primary)
            .setLabel(button.Name)
            .setEmoji(button.Emoji);
          //@ts-ignore
          if (button.Style === "Link" && button.URL) {
            builtButton.setURL(button.URL);
          } else {
            builtButton.setCustomId(button.CustomId);
          }

          return builtButton.toJSON();
        });

        await interaction.reply({
          embeds: [embed],
          components: [
            {
              type: 1, // This is the ACTION_ROW type.
              components: actionRowComponents,
            },
          ],
        });
      } else {
        await interaction.reply({
          content: "Selected button not found. Please provide a valid choice.",
          ephemeral: true, // This makes the reply only visible to the user
        });
      }
    } else {
      await interaction.reply({
        content: "Failed to update. Please provide a valid type and value.",
        ephemeral: true, // This makes the reply only visible to the user
      });
    }
  },
});
