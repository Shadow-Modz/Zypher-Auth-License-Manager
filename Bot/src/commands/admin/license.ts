import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  User,
} from "discord.js";
import { generateLicense } from "../../helpers/generateKeys";
import { decrypt, encrypt } from "../../helpers/crypto";
import paginationEmbed from "../../helpers/pagination";
import dateToTimestamp from "../../helpers/timestamp";
import LicenseModel from "../../models/LicenseModel";
import ProductModel from "../../models/ProductModel";
import findLicense from "../../helpers/findLicense";
import { Command } from "../../structures/Command";
import Product from "../../typings/Product";

interface ICProduct {
  License: string;
  Product: Product;
  Reason: string;
  User: User;
  "Hwid-Cap"?: number;
  "Ip-Cap"?: number;
  "Expire at": Date;
}

export default new Command({
  name: "license",
  description: "license manager",
  options: [
    {
      name: "create",
      description: "Create a license key",
      type: ApplicationCommandOptionType.Subcommand,
    },
    {
      name: "delete",
      description: "Delete a license key",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "license",
          description: "The license you want to delete",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "deleteall",
      description: "Delete all licenses of a specific user",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "userid",
          description: "The discord id of the user",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "user",
          description: "The discord user",
          type: ApplicationCommandOptionType.User,
          required: false,
        },
      ],
    },
    {
      name: "list",
      description: "List all the license key in the server",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "visible",
          description: "Do you want others to see the embed?",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: "cleardata",
      description: "Clear IP/HWID data of a specific license key",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "license",
          description:
            "The license to which the registered ips/hwid will be cleared",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "find",
      description: "Find license keys that contain a specific query",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "type",
          description: "The query you are sending is?",
          type: ApplicationCommandOptionType.String,
          choices: [
            {
              name: "IP",
              value: "ip_list",
            },
            {
              name: "HWID",
              value: "hwid_list",
            },
            {
              name: "License",
              value: "license",
            },
            {
              name: "User",
              value: "discord_id",
            },
            {
              name: "Product",
              value: "product_name",
            },
            {
              name: "Reason",
              value: "reason",
            },
          ],
          required: true,
        },
        {
          name: "query",
          description: "The query to search for in the database",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "visible",
          description: "Do you want others to see the embed?",
          type: ApplicationCommandOptionType.Boolean,
          required: false,
        },
      ],
    },
    {
      name: "edit",
      description: "Edit a specific license key",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "license",
          description: "The license key to edit",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
  ],
  run: async ({ interaction, client }) => {
    const subCommand = interaction.options.getSubcommand();

    if (subCommand === "create") {
      const licenseInfo: ICProduct = {
        License: generateLicense(),
        Product: null,
        Reason: null,
        "Expire at": null,
        "Hwid-Cap": null,
        "Ip-Cap": null,
        User: null,
      };

      const mainButtons = (state: boolean) => {
        const components = [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setStyle(
                licenseInfo.Product === null
                  ? ButtonStyle.Secondary
                  : ButtonStyle.Primary
              )
              .setCustomId("product")
              .setLabel("Product")
              .setDisabled(state)
              .setEmoji("📦"),
            new ButtonBuilder()
              .setStyle(
                licenseInfo.User === null
                  ? ButtonStyle.Secondary
                  : ButtonStyle.Primary
              )
              .setCustomId("user")
              .setLabel("User")
              .setDisabled(state)
              .setEmoji("👤"),
            new ButtonBuilder()
              .setStyle(
                licenseInfo["Ip-Cap"] === null
                  ? ButtonStyle.Secondary
                  : ButtonStyle.Primary
              )
              .setCustomId("ip-cap")
              .setLabel("Ip-Cap")
              .setDisabled(state)
              .setEmoji("📡"),
            new ButtonBuilder()
              .setStyle(
                licenseInfo["Expire at"] === null
                  ? ButtonStyle.Secondary
                  : ButtonStyle.Primary
              )
              .setCustomId("expire")
              .setLabel("Expire")
              .setDisabled(state)
              .setEmoji("🕙"),
            new ButtonBuilder()
              .setStyle(
                licenseInfo["Hwid-Cap"] === null
                  ? ButtonStyle.Secondary
                  : ButtonStyle.Primary
              )
              .setCustomId("hwid-cap")
              .setLabel("Hwid-Cap")
              .setDisabled(state)
              .setEmoji("🔒")
          ),
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setStyle(
                licenseInfo.Reason === null
                  ? ButtonStyle.Secondary
                  : ButtonStyle.Primary
              )
              .setCustomId("reason")
              .setLabel("Reason")
              .setDisabled(state)
              .setEmoji("✏️")
          ),
        ];

        if (
          licenseInfo.Product &&
          licenseInfo.User &&
          licenseInfo["Ip-Cap"] !== null
        ) {
          components[1].addComponents(
            new ButtonBuilder()
              .setStyle(ButtonStyle.Success)
              .setCustomId("save")
              .setLabel("Create")
              .setEmoji("✔️")
          );
        }

        return components;
      };

      const goToHome = async (state = false) => {
        return await interaction.editReply({
          embeds: mainEmbed(),
          components: mainButtons(state),
        });
      };

      const mainEmbed = (finish = false) => {
        const fields = [
          {
            name: "• License Information",
            value: Object.entries(licenseInfo)
              .filter(([k, v]) => v !== null && k !== "User")
              .map(([k, v]) => {
                if (k === "Expire at")
                  return `> ${k}: ${
                    v === null
                      ? "**Never**"
                      : dateToTimestamp(licenseInfo["Expire at"])
                  }`;
                return `> ${k}: **${
                  v.name ? v.name : v === null ? "Unknown" : v
                }**`;
              })
              .join("\n"),
          },
        ];

        if (licenseInfo.User) {
          fields.push({
            name: "• User Information:",
            value: `>>> User: <@!${licenseInfo.User.id}> (${licenseInfo.User.tag})\nUser ID: **${licenseInfo.User.id}**`,
          });
        }

        return [
          new EmbedBuilder()
            .setAuthor({
              name: finish ? "License Key Created" : "Create License Key",
              iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
            })
            .setColor(
              finish ? "Green" : client.config.GeneralSettings.EmbedColor
            )
            .addFields(fields)
            .setTimestamp(),
        ];
      };

      const message = await interaction.reply({
        embeds: mainEmbed(),
        components: mainButtons(false),
        fetchReply: true,
      });

      const collector = message.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
        time: 300000,
      });

      collector.on("collect", async (int) => {
        collector.resetTimer();

        if (int.customId === "product") {
          try {
            await int.deferUpdate();
            const products = await ProductModel.find();

            if (!products.length) {
              await int.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle(
                      "You need create a product using -/product create"
                    )
                    .setColor("Red"),
                ],
                components: [],
              });

              return collector.stop();
            }

            const message = await int.editReply({
              components: [
                new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                  new StringSelectMenuBuilder()
                    .setCustomId("products")
                    .setPlaceholder("Select the product")
                    .addOptions(
                      products.map((product) => {
                        return {
                          label: product.name,
                          value: product.name,
                          description: product.description.slice(0, 100),
                        };
                      })
                    )
                ),
              ],
            });

            const productInt = await message.awaitMessageComponent({
              componentType: ComponentType.SelectMenu,
              filter: (i) => i.user.id === int.user.id,
            });

            await productInt.deferUpdate();
            const product = productInt.values[0];

            licenseInfo.Product = products.find((p) => p.name === product);
          } catch (error) {
            console.error("An error occurred:", error);
            // Handle the error accordingly
          }
        }

        if (int.customId === "save") {
          const license = await LicenseModel.create({
            license: encrypt(licenseInfo.License),
            reason: licenseInfo.Reason,
            product_name: licenseInfo.Product.name,
            discord_id: licenseInfo.User.id,
            hwid_cap: licenseInfo["Hwid-Cap"] || 3,
            ip_cap: licenseInfo["Ip-Cap"] || 3,
            expires_date: licenseInfo["Expire at"],
            createdBy: interaction.user.id,
            latest_hwid: null,
            latest_ip: null,
            hwid_list: [],
            ip_list: [],
            total_requests: 0,
          });

          await interaction.editReply({
            embeds: mainEmbed(true),
            components: [],
          });

          client.emit("licenseCreate", license, interaction.user);

          const licenseMember = interaction.guild.members.cache.get(
            license.discord_id
          );
          await licenseMember.roles
            .add(licenseInfo.Product.role)
            .catch((e) => e);

          if (client.config.GeneralSettings.CustomerRole?.length > 3) {
            await licenseMember.roles
              .add(client.config.GeneralSettings.CustomerRole)
              .catch((e) => e);
          }

          if (licenseMember.dmChannel) {
            await licenseMember
              .send({
                embeds: [
                  new EmbedBuilder()
                    .setAuthor({
                      name: "Your License Key",
                      iconURL: licenseMember.user.displayAvatarURL(),
                    })
                    .setColor(client.config.GeneralSettings.EmbedColor)
                    .setDescription(
                      "Sharing this key with anyone will result in your license being **permanently** disabled and your acces to the product **removed**."
                    )
                    .addFields([
                      {
                        name: "Product",
                        value: license.product_name,
                      },
                      {
                        name: "License Key",
                        value: licenseInfo.License,
                      },
                    ]),
                ],
              })
              .catch((e) => e);
          }

          return collector.stop();
        }

        await goToHome(true);

        if (int.customId === "user") {
          await int.deferUpdate();

          int.followUp({
            content: `Hey ${interaction.user}, mention the user who will have the license.`,
            ephemeral: true,
          });

          const messages = await interaction.channel.awaitMessages({
            filter: (m) => m.author.id === interaction.user.id,
            max: 1,
          });

          await messages.first().delete();

          const user = messages.first().mentions.users.first();
          licenseInfo.User = user;
        }

        if (int.customId === "reason") {
          await int.deferUpdate();

          int.followUp({
            content: `Hey ${interaction.user}, what is the reason for the creation of this license?.`,
            ephemeral: true,
          });

          const messages = await interaction.channel.awaitMessages({
            filter: (m) => m.author.id === interaction.user.id,
            max: 1,
          });

          await messages.first().delete();

          const reason = messages.first().cleanContent;
          licenseInfo.Reason = reason;
        }

        if (int.customId === "ip-cap") {
          await int.showModal(
            new ModalBuilder()
              .setCustomId("ip.cap")
              .setTitle("Set the Ip-Cap")
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setPlaceholder(
                      "How many IP's will the user be allowed to use his license?"
                    )
                    .setStyle(TextInputStyle.Short)
                    .setCustomId("data")
                    .setLabel("Ip-Cap")
                    .setRequired(true)
                )
              )
          );

          const response = await int.awaitModalSubmit({
            time: 60000,
          });

          await response.deferUpdate();
          const data = parseInt(response.fields.getTextInputValue("data"));
          if (!data || isNaN(data)) return;

          licenseInfo["Ip-Cap"] = data;
        }

        if (int.customId === "expire") {
          await int.showModal(
            new ModalBuilder()
              .setCustomId("expire.days")
              .setTitle("Set the Expire days")
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setPlaceholder(
                      "How many days will this license last? use 0 for never"
                    )
                    .setStyle(TextInputStyle.Short)
                    .setCustomId("data")
                    .setLabel("Days")
                    .setRequired(true)
                )
              )
          );

          const response = await int.awaitModalSubmit({
            time: 60000,
          });

          await response.deferUpdate();
          const data = parseInt(response.fields.getTextInputValue("data"));
          if (data === null || isNaN(data)) {
            await goToHome(false);
            return;
          }

          const expireDate = new Date();
          expireDate.setDate(expireDate.getDate() + data);

          licenseInfo["Expire at"] = data === 0 ? null : expireDate;
        }

        if (int.customId === "hwid-cap") {
          await int.showModal(
            new ModalBuilder()
              .setCustomId("hwid.cap")
              .setTitle("Set the Hwid-Cap")
              .addComponents(
                new ActionRowBuilder<TextInputBuilder>().addComponents(
                  new TextInputBuilder()
                    .setPlaceholder(
                      "How many HWID's will the user be allowed to use his license?"
                    )
                    .setStyle(TextInputStyle.Short)
                    .setCustomId("data")
                    .setLabel("Hwid-Cap")
                    .setRequired(true)
                )
              )
          );

          const response = await int.awaitModalSubmit({
            time: 60000,
          });

          await response.deferUpdate();
          const data = parseInt(response.fields.getTextInputValue("data"));
          if (!data || isNaN(data)) return;

          licenseInfo["Hwid-Cap"] = data;
        }

        await goToHome(false);
      });
    } else if (subCommand === "list") {
      const ephemeral = !interaction.options.getBoolean("visible");
      const licenses = await LicenseModel.find();

      if (!licenses.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "No licenses",
                iconURL:
                  "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
              })
              .addFields({
                name: "• You don't have any license",
                value:
                  ">>> Hey, you don't have any license to list, create one using the command -/license create",
              })
              .setColor("Red")
              .setTimestamp(),
          ],
        });
      }

      const embeds = [];
      for await (const license of licenses) {
        const user = await client.users.fetch(license.discord_id);

        embeds.push(
          new EmbedBuilder()
            .setAuthor({
              name: `Total License Keys: ${licenses.length}`,
              iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
            })
            .addFields(
              {
                name: "• License Information:",
                value: `>>> License Key: **${decrypt(license.license).slice(
                  0,
                  100
                )}**\nReason: **${(license.reason || "None").slice(
                  0,
                  100
                )}**\nProduct: **${license.product_name.slice(
                  0,
                  100
                )}**\nTotal Requests: **${
                  license.total_requests
                }**\nLatest IP: **${(license.latest_ip || "Unknown").slice(
                  0,
                  100
                )}**\nLatest HWID: **${(license.latest_hwid || "Unknown").slice(
                  0,
                  100
                )}**\nExpire at: ${
                  license.expires_date
                    ? dateToTimestamp(license.expires_date)
                    : "**Never**"
                }\nCreated at: ${dateToTimestamp(license.createdAt).slice(
                  0,
                  100
                )}`,
              },
              {
                name: "• User Information",
                value: `>>> User: <@!${user.id}> (${user.tag.slice(
                  0,
                  100
                )})\nUser ID: **${user.id.slice(0, 100)}**`,
              }
            )
            .setColor(client.config.GeneralSettings.EmbedColor)
            .setTimestamp()
            .setFooter({
              text: `Page ${embeds.length + 1} of ${licenses.length}`,
            })
        );
      }

      paginationEmbed({
        interaction,
        embeds,
        time: 120000,
        ephemeral,
      });
    } else if (subCommand === "delete") {
      //@ts-ignore
      const licenseQuery = interaction.options.getString("license");
      const licenseData = await findLicense(licenseQuery);

      if (!licenseData) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "Can't delete the License",
                iconURL:
                  "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
              })
              .addFields({
                name: "• License not found",
                value:
                  ">>> Hey, this license does not exist, check that you have sent the license correctly, remember that we are case sensitive",
              })
              .setColor("Red")
              .setTimestamp(),
          ],
        });
      }

      const createButtons = (state: boolean) => [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("yes")
            .setLabel("Yes")
            .setDisabled(state)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("no")
            .setLabel("No")
            .setDisabled(state)
            .setStyle(ButtonStyle.Danger)
        ),
      ];

      const message = await interaction.reply({
        content: `Are you sure you want to delete the license\n**${licenseQuery}**?`,
        components: createButtons(false),
      });

      const int = await message.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
      });

      await int.deferUpdate();

      if (int.customId === "yes") {
        const user = await client.users.fetch(licenseData?.discord_id);
        client.emit("licenseDelete", licenseData, interaction.user);

        await licenseData.delete();
        return interaction.editReply({
          content: "",
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "License Deleted",
                iconURL:
                  "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
              })
              .addFields([
                {
                  name: "• License Information:",
                  value: `>>> License Key: **${licenseQuery}**\nReason: **${
                    licenseData.reason || "None"
                  }**\nProduct: **${
                    licenseData.product_name
                  }**\nCreated at: ${dateToTimestamp(
                    licenseData.createdAt
                  )}\nCreated by: <@!${licenseData.createdBy}>`,
                },
                {
                  name: "• User Information:",
                  value: `>>> User: <@!${user.id}> (${user.tag})\nUser ID: **${user.id}**`,
                },
              ])
              .setColor("Red")
              .setTimestamp(),
          ],
          components: [],
        });
      }

      interaction.editReply({
        content: `The license **${licenseQuery}** has not been deleted.`,
        components: createButtons(true),
      });
    } else if (subCommand === "deleteall") {
      //@ts-ignore
      let userQuery = interaction.options.getString("userid");
      if (userQuery === null) {
        //@ts-ignore
        const user = interaction.options.getUser("user");
        if (user != null) {
          //@ts-ignore
          userQuery = interaction.options.getUser("user").id;
        }
      } else if (userQuery == null) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "You must give a user or user ID",
                iconURL:
                  "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
              })
              .addFields({
                name: "• User not found",
                value:
                  ">>> Please give a user or user ID to delete all licenses from that user.",
              })
              .setColor("Red")
              .setTimestamp(),
          ],
        });
      }

      const licenses = await LicenseModel.find({ discord_id: userQuery });

      if (!licenses.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "Can't delete the License",
                iconURL:
                  "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
              })
              .addFields({
                name: "• No licenses found",
                value:
                  ">>> Hey, this user does not have any licenses, check that you have sent the user correctly.",
              })
              .setColor("Red")
              .setTimestamp(),
          ],
        });
      }

      const createButtons = (state) => [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("yes")
            .setLabel("Yes")
            .setDisabled(state)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId("no")
            .setLabel("No")
            .setDisabled(state)
            .setStyle(ButtonStyle.Danger)
        ),
      ];

      const content = `Are you sure you want to delete all the licenses of the user <@!${userQuery}>?\n**${licenses.length}** licenses will be deleted.`;

      const embed = new EmbedBuilder()
        .setAuthor({
          name: "Delete All Licenses Confirmation",
          iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
        })
        .setDescription(content)
        .setColor(client.config.GeneralSettings.EmbedColor)
        .setTimestamp();

      const message = await interaction.reply({
        embeds: [embed],
        components: createButtons(false),
      });

      const int = await message.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
      });

      await int.deferUpdate();

      if (int.customId === "yes") {
        const user = await client.users.fetch(userQuery);

        await Promise.all(licenses.map((license) => license.delete()));

        return interaction.editReply({
          content: "",
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "All Licenses Deleted",
                iconURL:
                  "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
              })
              .addFields(
                {
                  name: "• License Information:",
                  value: `>>> Licenses: **${licenses.length}**\nProduct: **${
                    licenses[0].product_name
                  }**\nCreated at: ${dateToTimestamp(
                    licenses[0].createdAt
                  )}\nCreated by: <@!${licenses[0].createdBy}>`,
                },
                {
                  name: "• User Information:",
                  value: `>>> User: <@!${user.id}> (${user.tag})\nUser ID: **${user.id}**`,
                }
              )
              .setColor("Red")
              .setTimestamp(),
          ],
          components: [],
        });
      } else if (int.customId === "no") {
        return message.delete();
      }
    } else if (subCommand === "cleardata") {
      //@ts-ignore
      const license = interaction.options.getString("license");
      const licenseData = await findLicense(license);

      if (!licenseData) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "Can't clear the License",
                iconURL:
                  "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
              })
              .addFields({
                name: "• License not found",
                value:
                  ">>> Hey, this license does not exist, check that you have sent the license correctly, remember that we are case sensitive",
              })
              .setColor("Red")
              .setTimestamp(),
          ],
        });
      }

      const createButtons = () => [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId("hwid")
            .setLabel("HWID")
            .setEmoji("🔒")
            .setDisabled(licenseData.hwid_list.length < 1)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("ip")
            .setLabel("IP")
            .setEmoji("📡")
            .setDisabled(licenseData.ip_list.length < 1)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
        ),
      ];

      const message = await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              `Do you want to restart the ip's or hwid's of the license\n**${license}**?`
            )
            .setColor("Orange"),
        ],
        components: createButtons(),
      });

      const int = await message.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
      });

      await int.deferUpdate();
      if (int.customId === "cancel") {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("The license was not cleared...")
              .setColor(client.config.GeneralSettings.EmbedColor),
          ],
          components: [],
        });
      }

      licenseData[int.customId === "hwid" ? "hwid_list" : "ip_list"] = [];
      licenseData[int.customId === "hwid" ? "latest_hwid" : "latest_ip"] = null;

      const user = await client.users.fetch(licenseData?.discord_id);
      await licenseData.save();

      client.emit(
        "licenseClear",
        licenseData,
        interaction.user,
        int.customId === "hwid" ? "HWID" : "IP"
      );
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `License Cleared (${
                int.customId === "hwid" ? "HWID" : "IP"
              })`,
              iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
            })
            .addFields([
              {
                name: "• License Information:",
                value: `>>> License Key: **${license}**\nReason: **${
                  licenseData.reason || "None"
                }**\nProduct: **${
                  licenseData.product_name
                }**\nCreated at: ${dateToTimestamp(
                  licenseData.createdAt
                )}\nCreated by: <@!${licenseData.createdBy}>`,
              },
              {
                name: "• User Information:",
                value: `>>> User: <@!${user.id}> (${user.tag})\nUser ID: **${user.id}**`,
              },
            ])
            .setColor(client.config.GeneralSettings.EmbedColor)
            .setTimestamp(),
        ],
        components: [],
      });
    } else if (subCommand === "find") {
      type queryTypes =
        | "ip_list"
        | "hwid_list"
        | "license"
        | "discord_id"
        | "reason";
      const ephemeral = !interaction.options.getBoolean("visible");
      //@ts-ignore
      const type = interaction.options.getString("type") as queryTypes;
      //@ts-ignore
      const query = interaction.options.getString("query");

      const licensesData = await LicenseModel.find({
        [type]: query,
      });

      if (type === "license") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const license = (await findLicense(query)) as any;
        if (license) licensesData.push(license);
      }

      const embeds = [];
      for await (const license of licensesData) {
        const user = await client.users.fetch(license.discord_id);
        const staff = await client.users.fetch(license.createdBy);

        embeds.push(
          new EmbedBuilder()
            .setAuthor({
              name: `Total License Keys: ${licensesData.length}`,
              iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
            })
            .addFields(
              {
                name: "• License Information:",
                value: `>>> License Key: **${decrypt(
                  license.license
                )}**\nReason: **${license.reason || "None"}**\nProduct: **${
                  license.product_name
                }**\nTotal Requests: **${
                  license.total_requests
                }**\nLatest IP: **${
                  license.latest_ip || "Unknown"
                }**\nLatest HWID: **${
                  license.latest_hwid || "Unknown"
                }**\nExpire at: ${
                  license.expires_date
                    ? dateToTimestamp(license.expires_date)
                    : "**Never**"
                }\nCreated at: ${dateToTimestamp(license.createdAt)}`,
              },
              {
                name: "• User Information",
                value: `>>> User: <@!${user.id}> (${user.tag})\nUser ID: **${user.id}**`,
                inline: true,
              },
              {
                name: "• Staff Information",
                value: `>>> Staff: <@!${staff.id}> (${staff.tag})\nStaff ID: **${staff.id}**`,
                inline: true,
              },
              {
                name: "\u200b",
                value: "\u200b",
                inline: true,
              },
              {
                name: `• IP Information (${license.ip_list.length}/${
                  license.ip_cap || "∞"
                })`,
                value: `>>> ${
                  license.ip_list.map((ip) => `• ${ip}`).join("\n") ||
                  "• No IP's registered."
                }`,
                inline: true,
              },
              {
                name: `• HWID Information (${license.hwid_list.length}/${
                  license.hwid_cap || "∞"
                })`,
                value: `>>> ${
                  license.hwid_list.map((ip) => `• ${ip}`).join("\n") ||
                  "• No HWID's registered."
                }`,
                inline: true,
              },
              {
                name: "\u200b",
                value: "\u200b",
                inline: true,
              }
            )
            .setColor(client.config.GeneralSettings.EmbedColor)
            .setTimestamp()
            .setFooter({
              text: `Page ${embeds.length + 1} of ${licensesData.length}`,
            })
        );
      }

      paginationEmbed({
        interaction,
        embeds,
        time: 120000,
        ephemeral,
      });
    } else if (subCommand === "edit") {
      //@ts-ignore
      const licensekey = interaction.options.getString("license");
      const licenseData = await findLicense(licensekey);

      if (!licenseData) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                "This license does not exist, check that you have sent the license correctly"
              )
              .setColor("Red"),
          ],
          ephemeral: true,
        });
      }

      const getButtons = (disabled = false) => [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setLabel("License")
            .setEmoji("🔑")
            .setCustomId("license")
            .setDisabled(disabled)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel("User")
            .setEmoji("👤")
            .setCustomId("discord_id")
            .setDisabled(disabled)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel("Ip-Cap")
            .setEmoji("📡")
            .setCustomId("ip_cap")
            .setDisabled(disabled)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel("Hwid-Cap")
            .setEmoji("🔒")
            .setCustomId("hwid_cap")
            .setDisabled(disabled)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setLabel("Expire")
            .setEmoji("🕙")
            .setCustomId("expires_date")
            .setDisabled(disabled)
            .setStyle(ButtonStyle.Primary)
        ),
      ];

      const message = await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Select the property you want to edit")
            .setColor(client.config.GeneralSettings.EmbedColor),
        ],
        components: getButtons(),
        fetchReply: true,
      });

      const int = await message.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
        time: 120000,
      });

      const querySearch = {
        license: "Send the new license key",
        discord_id: "Mention the user that they will now have the license key",
        ip_cap: "Send the new license ip-cap (use **0** for unlimited ips)",
        hwid_cap: "Send the new license hwid-cap (use **0** for unlimited ips)",
        expires_date:
          "Submit the new number of days the license will have before it expires.\n(use **0** for a lifetime license)",
      };

      await int.deferUpdate();
      await int.followUp({
        content: `Hey ${interaction.user}, ${querySearch[int.customId]}`,
        ephemeral: true,
      });

      let content: string | number | Date;
      const messages = await interaction.channel.awaitMessages({
        filter: (m) => m.author.id === interaction.user.id,
        time: 120000,
        max: 1,
      });

      await messages
        .first()
        .delete()
        .catch((e) => e);
      const cleanContent = messages.first().cleanContent;

      if (int.customId === "license") {
        content = encrypt(cleanContent);
      }

      if (int.customId === "discord_id") {
        const query = cleanContent
          .replace("<", "")
          .replace("@", "")
          .replace(">", "")
          .replace("!", "");
        content = (await client.users.fetch(query)).id;

        if (!content) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle("You need mention a user or send the id")
                .setColor("Red"),
            ],
            components: getButtons(true),
          });
        }
      }

      if (int.customId === "ip_cap" || int.customId === "hwid_cap") {
        content = parseInt(cleanContent);

        if (isNaN(content) || content < 0) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle("The new cap must be an positive number")
                .setColor("Red"),
            ],
            components: getButtons(true),
          });
        }
      }

      if (int.customId === "expires_date") {
        content = parseInt(cleanContent);

        if (isNaN(content) || content < 0) {
          return interaction.editReply({
            embeds: [
              new EmbedBuilder()
                .setTitle("Make sure to send a reasonable number of days")
                .setColor("Red"),
            ],
            components: getButtons(true),
          });
        }

        if (content === 0) {
          content = null;
        } else {
          const expireDate = new Date();
          expireDate.setDate(expireDate.getDate() + content);
          content = expireDate;
        }
      }

      licenseData[int.customId] = content;
      await licenseData.save();

      const newLicenseData = await LicenseModel.findOne({
        license: licenseData.license,
      });
      const user = await client.users.fetch(newLicenseData.discord_id);

      interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: "License updated correctly",
              iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
            })
            .setColor(client.config.GeneralSettings.EmbedColor)
            .setTimestamp()
            .addFields(
              {
                name: "• License Information:",
                value: `>>> License Key: **${decrypt(
                  newLicenseData.license
                )}**\nReason: **${
                  newLicenseData.reason || "None"
                }**\nProduct: **${
                  newLicenseData.product_name
                }**\nTotal Requests: **${
                  newLicenseData.total_requests
                }**\nLatest IP: **${
                  newLicenseData.latest_ip || "Unknown"
                }**\nLatest HWID: **${
                  newLicenseData.latest_hwid || "Unknown"
                }**\nExpire at: ${
                  newLicenseData.expires_date
                    ? dateToTimestamp(newLicenseData.expires_date)
                    : "**Never**"
                }\nCreated at: ${dateToTimestamp(newLicenseData.createdAt)}`,
              },
              {
                name: "• User Information",
                value: `>>> User: <@!${user.id}> (${user.tag})\nUser ID: **${user.id}**`,
              }
            ),
        ],
        components: getButtons(true),
      });
    }
  },
});
