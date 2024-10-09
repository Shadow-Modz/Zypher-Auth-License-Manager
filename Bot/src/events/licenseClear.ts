import dateToTimestamp from "../helpers/timestamp";
import { Event } from "../structures/Event";
import { decrypt } from "../helpers/crypto";
import { EmbedBuilder } from "discord.js";
import { client } from "..";

export default new Event("licenseClear", async (license, staff, type) => {
  const user = await client.users.fetch(license.discord_id);
  const webhook = client.webhooks.commands;

  if (webhook) {
    await webhook?.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: `License Data Cleared (${type})`,
            iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
          })
          .setColor("Orange")
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
              name: "• Cleared by:",
              value: `>>> User: <@!${staff.id}> (${staff.tag})\nUser ID: **${staff.id}**`,
            },
          ])
          .setTimestamp(),
      ],
    });
  } else {
    console.log(
      "Commands webhook not setupped yet, please know that your not receiving command logs!"
    );
  }
});
