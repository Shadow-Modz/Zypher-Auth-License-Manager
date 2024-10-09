/* eslint-disable indent */
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ComponentType,
} from "discord.js";
import { ExtendedInteraction } from "../typings/Command";

interface PaginationProps {
  interaction: ExtendedInteraction;
  embeds: EmbedBuilder[];
  time: number;
  type?: "reply" | "followUp" | "editReply";
  ephemeral?: boolean;
}

async function paginationEmbed({
  interaction,
  embeds,
  time,
  type = "reply",
  ephemeral = false,
}: PaginationProps) {
  let currentPage = 0;

  if (!embeds.length) {
    return interaction[type]({
      embeds: [
        new EmbedBuilder()
          .setTitle("I have not received any embed to show you...")
          .setColor("Red"),
      ],
    });
  }

  if (embeds.length === 1) {
    return await interaction[type]({
      embeds: embeds,
      ephemeral,
    });
  }

  const message = await interaction[type]({
    embeds: [embeds[currentPage]],
    components: createButtons(false),
    fetchReply: true,
    ephemeral,
  });

  const collector = message.createMessageComponentCollector({
    filter: (i) => i.user.id === interaction.user.id,
    componentType: ComponentType.Button,
    time,
  });

  collector.on("collect", (int: ButtonInteraction) => {
    switch (int.customId) {
      case "first":
        currentPage = 0;
        break;
      case "previous":
        currentPage--;
        break;
      case "next":
        currentPage++;
        break;
      case "last":
        currentPage = embeds.length - 1;
        break;
    }

    if (currentPage < 0) currentPage = embeds.length - 1;
    if (currentPage >= embeds.length) currentPage = 0;

    interaction.editReply({
      embeds: [embeds[currentPage]],
    });

    int.deferUpdate();
  });

  collector.once("end", () => {
    interaction.editReply({
      embeds: [embeds[currentPage].setColor("Red")],
      components: createButtons(true),
    });
  });
}

const createButtons = (state: boolean) => [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setEmoji("⏪")
      .setDisabled(state)
      .setStyle(ButtonStyle.Secondary)
      .setCustomId("first"),
    new ButtonBuilder()
      .setLabel("Previous")
      .setDisabled(state)
      .setStyle(ButtonStyle.Primary)
      .setCustomId("previous"),
    new ButtonBuilder()
      .setLabel("Next")
      .setDisabled(state)
      .setStyle(ButtonStyle.Primary)
      .setCustomId("next"),
    new ButtonBuilder()
      .setEmoji("⏩")
      .setDisabled(state)
      .setStyle(ButtonStyle.Secondary)
      .setCustomId("last")
  ),
];

export default paginationEmbed;
