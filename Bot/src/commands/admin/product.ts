import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from "discord.js";
import paginationEmbed from "../../helpers/pagination";
import dateToTimestamp from "../../helpers/timestamp";
import ProductModel from "../../models/ProductModel";
import { Command } from "../../structures/Command";

interface ICUpdateProduct {
  Product: null;
  Version: null;
  "Update-Log"?: null;
  "Download-File"?: null;
}

export default new Command({
  name: "product",
  description: "product manager",
  options: [
    {
      name: "create",
      description: "Create a product",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "name",
          description: "The name of the product",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "price",
          description: "The price of the product (7.50)",
          type: ApplicationCommandOptionType.Number,
          required: true,
        },
        {
          name: "version",
          description: "The version of the product (1.0.0)",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "description",
          description: "The description of the product",
          type: ApplicationCommandOptionType.String,
          required: false,
        },
        {
          name: "role",
          description:
            "The role of the product (will be automatically granted to the buyer)",
          type: ApplicationCommandOptionType.Role,
          required: false,
        },
      ],
    },
    {
      name: "update",
      description: "Update a product",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "name",
          description: "The name of the product to update",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "version",
          description: "The new version of the product",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "update-log",
          description: "The update log of the product",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "downloadfile",
          description: "The download file of the product",
          type: ApplicationCommandOptionType.Attachment,
          required: true,
        },
      ],
    },
    {
      name: "delete",
      description: "Delete a specific product",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "name",
          description: "The name of the product to delete",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],
    },
    {
      name: "list",
      description: "List all your products",
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
      name: "edit",
      description: "Edit the fields of your product",
      type: ApplicationCommandOptionType.Subcommand,
      options: [
        {
          name: "name",
          description: "The name of the product to edit",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "new-name",
          description: "The new name of the product",
          type: ApplicationCommandOptionType.String,
        },
        {
          name: "new-price",
          description: "The new price of the product",
          type: ApplicationCommandOptionType.Number,
        },
        {
          name: "new-version",
          description: "The new version of the product",
          type: ApplicationCommandOptionType.String,
        },
      ],
    },
  ],
  run: async ({ interaction, client }) => {
    const subCommand = interaction.options.getSubcommand();

    if (subCommand === "create") {
      await interaction.deferReply();
      //@ts-ignore
      const name = interaction.options.getString("name");
      //@ts-ignore
      const price = interaction.options.getNumber("price");
      //@ts-ignore
      const version = interaction.options.getString("version");
      //@ts-ignore
      const description = interaction.options.getString("description");
      //@ts-ignore
      const role = interaction.options.getRole("role");

      if (name.length > 32 || name.length < 3) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "Product Validation Error",
                iconURL: "https://cdn-icons-png.flaticon.com/64/679/679821.png",
              })
              .setColor("Red")
              .setTimestamp()
              .addFields([
                {
                  name: "• Product Name:",
                  value:
                    "The product name must have a minimum of 3 characters and a maximum of 32",
                },
              ]),
          ],
        });
      }

      if (
        !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/g.test(
          version
        )
      ) {
        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "Product Validation Error",
                iconURL: "https://cdn-icons-png.flaticon.com/64/679/679821.png",
              })
              .setColor("Red")
              .setTimestamp()
              .addFields([
                {
                  name: "• Product Version:",
                  value:
                    "You must follow the [semver](https://semver.org) rules for the version of your product.",
                },
              ]),
          ],
        });
      }

      try {
        const product = await ProductModel.create({
          name: name,
          price: price.toFixed(2),
          version: version,
          description: description || "Without description",
          createdBy: interaction.user.id,
          role: role?.id,
        });

        client.logger.info(
          `Product ${name} has been created by: ${interaction.user.tag}`
        );
        const embed = new EmbedBuilder()
          .setColor("Green")
          .setTimestamp()
          .setAuthor({
            name: "Product Created",
            iconURL: "https://cdn-icons-png.flaticon.com/64/679/679821.png",
          })
          .addFields([
            {
              name: "• Product Information:",
              value: `>>> Name: **${name}**\nDescription: **${
                product.description
              }**\nVersion: **${version}**\nPrice: **${price.toFixed(2)}**`,
            },
          ]);

        if (role) {
          embed.addFields({
            name: "• Product Role Information:",
            value: `>>> Role: ${role}\nRole ID: **${role?.id}**`,
          });
        }

        return interaction.followUp({ embeds: [embed] });
      } catch (error) {
        client.logger.error(error);

        return interaction.followUp({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "Error creating product",
                iconURL: "https://cdn-icons-png.flaticon.com/64/679/679821.png",
              })
              .setColor("Red")
              .setTimestamp()
              .addFields([
                {
                  name: "• Product Name:",
                  value: "There is already a product with that name",
                },
              ]),
          ],
          ephemeral: true,
        });
      }
    } else if (subCommand === "list") {
      const ephemeral = !interaction.options.getBoolean("visible");
      const products = await ProductModel.find();

      if (!products.length) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "No products",
                iconURL: "https://cdn-icons-png.flaticon.com/64/679/679821.png",
              })
              .addFields({
                name: "• You don't have any product",
                value:
                  ">>> Hey, you don't have any products to list, create one using the command -/product create",
              })
              .setColor("Red")
              .setTimestamp(),
          ],
        });
      }

      const embeds = [];
      for (const product of products) {
        embeds.push(
          new EmbedBuilder()
            .setAuthor({
              name: `Total Products: ${products.length}`,
              iconURL: "https://cdn-icons-png.flaticon.com/64/679/679821.png",
            })
            .setColor(client.config.GeneralSettings.EmbedColor)
            .addFields({
              name: "• Product Information:",
              value: `>>> Product Name: **${
                product.name
              }**\nPrice: **$${product.price.toFixed(2)}**\nVersion: **${
                product.version
              }\n**Customer Role: **${
                product.role || "Unknown"
              }**\nCreated at: ${dateToTimestamp(product.createdAt)}`,
            })
            .setFooter({
              text: `Page ${embeds.length + 1} of ${products.length}`,
            })
            .setTimestamp()
        );
      }

      paginationEmbed({
        interaction,
        embeds,
        time: 60000,
        type: "reply",
        ephemeral,
      });
    } else if (subCommand === "delete") {
      //@ts-ignore
      const name = interaction.options.getString("name");
      const product = await ProductModel.findOne({ name });

      if (!product) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "Can't delete the product",
                iconURL: "https://cdn-icons-png.flaticon.com/64/679/679821.png",
              })
              .addFields({
                name: "• Product not found",
                value:
                  ">>> Hey, this product does not exist, check that you have sent the name correctly, remember that we are case sensitive",
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
        content: `Are you sure you want to delete the **${product.name}** product?`,
        components: createButtons(false),
      });

      const int = await message.awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: ComponentType.Button,
      });

      await int.deferUpdate();

      if (int.customId === "yes") {
        const embed = new EmbedBuilder()
          .setAuthor({
            name: "Product Deleted",
            iconURL: "https://cdn-icons-png.flaticon.com/64/679/679821.png",
          })
          .addFields([
            {
              name: "• Product Information:",
              value: `>>> Name: **${name}**\nDescription: **${
                product.description
              }**\nVersion: **${
                product.version
              }**\nPrice: **${product.price.toFixed(2)}**`,
            },
          ])
          .setColor("Red")
          .setTimestamp();

        if (product.role) {
          embed.addFields({
            name: "• Product Role Information:",
            value: `>>> Role: <@&${product?.role}>\nRole ID: **${product?.role}**`,
          });
        }

        await product.delete();
        return interaction.editReply({
          content: "",
          embeds: [embed],
          components: [],
        });
      }

      interaction.editReply({
        content: `The product **${product.name}** has not been deleted.`,
        components: createButtons(true),
      });
    } else if (subCommand === "edit") {
      //@ts-ignore
      const name = interaction.options.getString("name");
      const product = await ProductModel.findOne({ name });
      //@ts-ignore
      const newName = interaction.options.getString("new-name");
      //@ts-ignore
      const newVersion = interaction.options.getString("new-version");
      //@ts-ignore
      const newPrice = interaction.options.getNumber("new-price");

      if (!product) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "Can't edit the product",
                iconURL: "https://cdn-icons-png.flaticon.com/64/679/679821.png",
              })
              .addFields({
                name: "• Product not found",
                value:
                  ">>> Hey, this product does not exist, check that you have sent the name correctly, remember that we are case sensitive",
              })
              .setColor("Red")
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }

      if (!newName && !newVersion && !newPrice) {
        return interaction.reply({
          content: "🚫 You need to specify the value to edit!",
          ephemeral: true,
        });
      }

      product.name = newName || name;
      product.version = newVersion || product.version;
      product.price = newPrice || product.price;

      await product.save();
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setAuthor({
              name: `Product ${product.name}`,
              iconURL: "https://cdn-icons-png.flaticon.com/64/679/679821.png",
            })
            .setColor(client.config.GeneralSettings.EmbedColor)
            .addFields({
              name: "• Product Information:",
              value: `>>> Product Name: **${
                product.name
              }**\nPrice: **$${product.price.toFixed(2)}**\nVersion: **${
                product.version
              }\n**Customer Role: **${
                product.role || "Unknown"
              }**\nCreated at: ${dateToTimestamp(product.createdAt)}`,
            })
            .setTimestamp(),
        ],
      });
    }
  },
});
