import dateToTimestamp from "../helpers/timestamp";
import { decrypt } from "../helpers/crypto";
import { Event } from "../structures/Event";
import { EmbedBuilder } from "discord.js";
import { client } from "..";

export default new Event("licenseDelete", async (license, staff) => {
  const user = await client.users.fetch(license.discord_id);
  const webhook = client.webhooks.commands;

  await webhook?.send({
    embeds: [
      new EmbedBuilder()
        .setAuthor({
          name: "License Deleted",
          iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
        })
        .setColor("Red")
        .addFields([
          {
            name: "• License Information:",
            value: `>>> License Key: **${decrypt(
              license.license
            )}**\nReason: **${license.reason || "None"}**\nProduct: **${
              license.product_name
            }**\nCreated at: ${dateToTimestamp(license.createdAt)}`,
          },
          {
            name: "• User Information:",
            value: `>>> User: <@!${user.id}> (${user.tag})\nUser ID: **${user.id}**`,
          },
          {
            name: "• Deleted by:",
            value: `>>> User: <@!${staff.id}> (${staff.tag})\nUser ID: **${staff.id}**`,
          },
        ])
        .setTimestamp(),
    ],
  });
});
