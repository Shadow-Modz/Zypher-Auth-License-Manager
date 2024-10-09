import { CommandInteractionOptionResolver, EmbedBuilder } from "discord.js";
import { ExtendedInteraction } from "../typings/Command";
import { Event } from "../structures/Event";
import { client } from "..";

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
  }
);
