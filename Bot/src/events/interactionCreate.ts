import {
  CommandInteractionOptionResolver,
  EmbedBuilder,
  ButtonInteraction,
} from "discord.js";
import { ExtendedInteraction } from "../typings/Command";
import { Event } from "../structures/Event";
import { client } from "..";
import { DownloadConfig } from "../typings/Config";
import { getDownloadConfig } from "../helpers/yamlUtility";

export default new Event(
  "interactionCreate",
  (interaction: ExtendedInteraction) => {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (
        !interaction.member.roles.cache.some((r) =>
          command.Permissions.includes(r.id)
        )
      ) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("You don't have permissions to execute this command.")
              .setColor("Red"),
          ],
          ephemeral: true,
        });
      }

      try {
        command.run({
          args: interaction.options as CommandInteractionOptionResolver,
          interaction: interaction as ExtendedInteraction,
          client,
        });
      } catch {
        interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("An error occurred. Don't panic.")
              .setDescription(
                "This means that something unexpected occurred while processing your request. Don't panic, we throw errors more than you throw parties because it helps us catch more bugs. It's harder to get chicks without throwing parties, right?"
              )
              .setColor("Red"),
          ],
        });
      }
    }

    if (interaction.isButton()) {
      console.log("Button interaction detected.");

      const buttonInteraction = interaction as ButtonInteraction;

      const downloadConfig: DownloadConfig = getDownloadConfig();
      console.log("Download config:", downloadConfig);

      // Find the button in the config that matches the pressed button's customId
      const buttonConfig = downloadConfig.Buttons.find(
        (btn) => btn.CustomId === buttonInteraction.customId
      );

      if (buttonConfig && buttonConfig.URL) {
        buttonInteraction.reply({
          content: `Click [here](${buttonConfig.URL}) to start downloading.`,
          ephemeral: true, // This makes the reply only visible to the user
        });
      } else {
        buttonInteraction.reply({
          content: "Sorry, there was an issue fetching the download link.",
          ephemeral: true, // This makes the reply only visible to the user
        });
      }
    }
  }
);
