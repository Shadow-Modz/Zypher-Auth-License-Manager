/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateLicense } from "../helpers/generateKeys";
import { decrypt, encrypt } from "../helpers/crypto";
import dateToTimestamp from "../helpers/timestamp";
import LicenseModel from "../models/LicenseModel";
import ProductModel from "../models/ProductModel";
import RequestModel from "../models/RequestModel";
import { Colors, EmbedBuilder } from "discord.js";
import findLicense from "../helpers/findLicense";
import { NextFunction, Router } from "express";
import { existsSync, unlinkSync } from "fs";
import UserModel from "../models/UserModel";
import RoleModel from "../models/RoleModel";
import License from "../typings/License";
import Product from "../typings/Product";
import MRequest from "../typings/MRequest";
import { mkdir } from "fs/promises";
import { promisify } from "util";
import passport from "passport";
import { client } from "..";
import { join } from "path";
import multer from "multer";
import { Request } from "express";
import glob from "glob";

type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

const globPromise = promisify(glob);

function uploadFiles(_req, res) {
  res.status(200).json({ message: "File uploaded successfully" });
}

const isAuthenticated = (
  role: "owner" | "admin" | "developer" | "support" | "user" = "user"
) => {
  return function (req: any, res: any, next: NextFunction) {
    if (!req.isAuthenticated() || !req.user?.role) {
      return res.redirect("/login");
    }

    const userRole = req.user?.role;
    if (userRole !== "owner" && role === "owner") {
      if (req.method === "GET") {
        return res.render("404");
      }

      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    if (userRole !== "admin" && userRole !== "owner" && role === "admin") {
      if (req.method === "GET") {
        return res.render("404");
      }

      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    if (
      userRole !== "developer" &&
      userRole !== "owner" &&
      userRole !== "admin" &&
      role === "developer"
    ) {
      if (req.method === "GET") {
        return res.render("404");
      }

      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    if (
      userRole !== "support" &&
      userRole !== "owner" &&
      userRole !== "admin" &&
      userRole !== "developer" &&
      role === "support"
    ) {
      if (req.method === "GET") {
        return res.render("404");
      }

      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    if (
      userRole !== "user" &&
      userRole !== "owner" &&
      userRole !== "admin" &&
      userRole !== "developer" &&
      userRole !== "support" &&
      role === "user"
    ) {
      if (req.method === "GET") {
        return res.render("404");
      }

      return res.status(403).json({
        error: "Unauthorized",
      });
    }

    next();
  };
};

const storage = multer.diskStorage({
  destination: (
    request: Request,
    _file: Express.Multer.File,
    callback: DestinationCallback
  ): void => {
    // @ts-ignore this fucking works
    const product = request.params.product.toLowerCase();
    const destinationPath = join(__dirname, "..", "..", "updates", product);

    if (!existsSync(destinationPath)) mkdir(destinationPath);

    callback(null, destinationPath);
  },
  filename: (
    _request: Request,
    file: Express.Multer.File,
    callback: FileNameCallback
  ): void => {
    callback(null, file.originalname);
  },
});

const upload = multer({ storage });

type User = {
  id: string;
  tag: string;
  avatar: string;
  spent: number;
  requests: number;
  role: string;
  licenses: any[];
};

type Stats = {
  profit: number;
  requests: MRequest[];
  licenses: any[];
  products: number;
  users: number;
  sales: any[];
};

const router = Router();

// API Endpoints
router
  .get("/validate/discord/:id", isAuthenticated("admin"), async (req, res) => {
    const { id } = req.params;

    try {
      const user = await client.users.fetch(id).catch((e) => e);
      if (!user?.tag) {
        return res.status(404).json({
          message: "I couldn't find that user, check it out.",
        });
      }

      return res.status(200).json({
        user,
        message: "User found correctly",
      });
    } catch (error) {
      return res.status(500).json({
        error: error.toString(),
      });
    }
  })
  .post(
    "/api/web/licenses",
    isAuthenticated("support"),
    async (req: any, res) => {
      const {
        product_name,
        reason,
        license,
        discord_id,
        ip_cap,
        hwid_cap,
        expiresDays,
      } = req.body;

      const licenseProduct = await ProductModel.findOne({ name: product_name });
      if (!licenseProduct) {
        return res.status(400).json({
          message: "You need specify a valid product_name",
        });
      }

      if (!license || license.length < 3) {
        return res.status(400).json({
          message: "The license key must have a minimum of 3 characters",
        });
      }

      if (reason && reason.length < 3) {
        return res.status(400).json({
          message: "The license reason must have a minimum of 3 characters",
        });
      }

      const licenseUser = await client.users
        .fetch(discord_id || "")
        .catch((e) => e);
      if (!licenseUser) {
        return res.status(400).json({
          message: "You need specify a valid user discord_id",
        });
      }

      if (isNaN(ip_cap)) {
        return res.status(400).json({
          message: "You need specify a valid license ip_cap",
        });
      }

      if (isNaN(hwid_cap) || typeof hwid_cap !== "number") {
        return res.status(400).json({
          message: "You need specify a valid license hwid_cap",
        });
      }

      if (expiresDays === null && isNaN(expiresDays)) {
        return res.status(400).json({
          message: "You need specify a valid expiresDays",
        });
      }

      let expires_date = null;
      if (expiresDays) {
        expires_date = new Date();
        expires_date.setDate(expires_date.getDate() + expiresDays || 0);
      }

      const licenseKey = license || generateLicense();
      const latest_license_change = new Date();

      const newLicense: License = {
        license: encrypt(licenseKey),
        latest_license_change,
        reason,
        product_name,
        discord_id,
        ip_cap,
        hwid_cap,
        expires_date,
        createdBy: req.user.discordId || client.user.id,
        hwid_list: [],
        ip_list: [],
        latest_hwid: null,
        latest_ip: null,
        total_requests: 0,
      };

      if (licenseUser) {
        try {
          const dmChannel =
            licenseUser.dmChannel || (await licenseUser.createDM());
          await dmChannel
            .send({
              embeds: [
                new EmbedBuilder()
                  .setAuthor({
                    name: "Your License Key",
                    iconURL: licenseUser.displayAvatarURL(),
                  })
                  .setColor(client.config.GeneralSettings.EmbedColor)
                  .setDescription(
                    "Sharing this key with anyone will result in your license being **permanently** disabled and your access to the product **removed**."
                  )
                  .addFields([
                    {
                      name: "Product",
                      value: product_name,
                    },
                    {
                      name: "License Key",
                      value: licenseKey,
                    },
                  ]),
              ],
            })
            .catch((error) => {
              console.log(
                "Error occurred while sending a message to the user:",
                error
              );
            });
        } catch (error) {
          console.log(
            "Error occurred while sending a message to the user:",
            error
          );
        }
      }

      const staffUser = await client.users
        .fetch(req.user.discordId)
        .catch((e) => e);

      const webHook = client.webhooks.web;
      if (webHook) {
        await webHook
          .send({
            embeds: [
              new EmbedBuilder()
                .setAuthor({
                  name: "License Created",
                  iconURL: staffUser.displayAvatarURL(),
                })
                .setColor(Colors.Green)
                .setDescription(
                  "There is a new license created in the web panel."
                )
                .addFields([
                  {
                    name: "• Product Information:",
                    value: `>>> Product: **${product_name}**\nReason: **${
                      reason || "No reason specified"
                    }**\nExpires at: **${
                      expires_date ? expires_date.toLocaleString() : "Never"
                    }**\nCreated at: **${dateToTimestamp(
                      new Date()
                    )}**\nUser: **${licenseUser.tag}**\nDiscord ID: **${
                      licenseUser.id
                    }**`,
                  },
                  {
                    name: "• Staff Information:",
                    value: `>>> User: <@!${staffUser.id}> (${staffUser.tag})\nUser ID: **${staffUser.id}**`,
                  },
                ]),
            ],
          })
          .catch((e) => console.log(e));
      }

      const memberUser = client.guild.members.cache.get(discord_id);
      if (memberUser && licenseProduct.role) {
        await memberUser.roles.add(licenseProduct.role).catch((e) => e);
      }

      try {
        await LicenseModel.create(newLicense);
        newLicense.license = licenseKey;

        return res.status(201).json({
          message: "License created successfully",
          license: newLicense,
        });
      } catch (error) {
        return res.status(500).json({
          message: "Something went wrong",
          error,
        });
      }
    }
  )
  .patch(
    "/api/web/licenses/:license",
    isAuthenticated("developer"),
    async (req: any, res) => {
      const {
        product_name,
        reason,
        license,
        discord_id,
        ip_cap,
        hwid_cap,
        expiresDays,
      } = req.body;
      const { license: licenseQuery } = req.params;

      if (!licenseQuery || licenseQuery.length < 3) {
        return res.status(400).json({
          message: "Invalid Request",
        });
      }

      if (product_name && product_name.length < 3) {
        return res.status(400).json({
          message: "Product name must have a minimum of 3 characters",
        });
      }

      if (reason && reason.length < 3) {
        return res.status(400).json({
          message: "Reason must have a minimum of 3 characters",
        });
      }

      if (product_name) {
        const productDatabase = await ProductModel.findOne({
          name: product_name,
        });

        if (!productDatabase) {
          return res.status(400).json({
            message: "You must enter a valid product, we are case sensitive",
          });
        }
      }

      if (license && license.length < 8) {
        return res.status(400).json({
          message: "License must have a minimum of 8 characters",
        });
      }

      if (discord_id && !client.users.cache.get(discord_id)) {
        return res.status(400).json({
          message: "Invalid user, remember to verify that it is in the discord",
        });
      }

      if (ip_cap && isNaN(ip_cap)) {
        return res.status(400).json({
          message: "The ip-cap must be a number",
        });
      }

      if (hwid_cap && isNaN(hwid_cap)) {
        return res.status(400).json({
          message: "The hwid-cap must be a number",
        });
      }

      let expires_date = null;
      if (expiresDays) {
        expires_date = new Date();
        expires_date.setDate(expires_date.getDate() + expiresDays || 0);
        req.body.expires_date = expires_date;
      }

      if (license) {
        req.body.license = encrypt(license);
      }

      try {
        const licenseData = await findLicense(licenseQuery);
        if (!licenseData) {
          return res.status(400).json({
            message: "This license key doesnt exists",
          });
        }

        await licenseData.update({ $set: req.body }, { upsert: true });

        const memberUser = await client.users.fetch(discord_id).catch((e) => e);
        const staffUser = await client.users
          .fetch(req.user.discordId)
          .catch((e) => e);

        const webHook = client.webhooks.web;
        await webHook
          ?.send({
            embeds: [
              new EmbedBuilder()
                .setAuthor({
                  name: "License Changed",
                  iconURL: staffUser.displayAvatarURL(),
                })
                .setColor(Colors.Yellow)
                .setDescription("There is a license changed in the web panel.")
                .addFields([
                  {
                    name: "• Product Information:",
                    value: `>>> Product: **${
                      licenseData.product_name
                    }**\nChanged at: **${dateToTimestamp(
                      new Date()
                    )}**\nUser: **${memberUser.tag}**\nDiscord ID: **${
                      memberUser.id
                    }**`,
                  },
                  {
                    name: "• Changed by:",
                    value: `>>> User: <@!${staffUser.id}> (${staffUser.tag})\nUser ID: **${staffUser.id}**`,
                  },
                ]),
            ],
          })
          .catch((e) => console.log(e));

        return res.status(200).json({
          message: "License updated correctly",
        });
      } catch (error) {
        client.logger.error(error);
        return res.status(500).json({
          message: "Something went wrong",
          error,
        });
      }
    }
  )
  .delete(
    "/api/web/licenses/:license",
    isAuthenticated("developer"),
    async (req: any, res) => {
      const { license } = req.params;

      if (!license) {
        return res.status(400).json({
          message: "Invalid Request",
        });
      }

      try {
        const licenseData = await findLicense(license);
        if (!licenseData) {
          return res.status(400).json({
            message: "This license key doesnt exists",
          });
        }

        const memberUser = await client.users
          .fetch(licenseData.discord_id)
          .catch((e) => e);
        const staffUser = await client.users
          .fetch(req.user.discordId)
          .catch((e) => e);

        const webHook = client.webhooks.web;
        await webHook
          ?.send({
            embeds: [
              new EmbedBuilder()
                .setAuthor({
                  name: "License Deleted",
                  iconURL: memberUser.displayAvatarURL(),
                })
                .setColor(Colors.Red)
                .setDescription("There is a license deleted in the web panel.")
                .addFields([
                  {
                    name: "• Product Information:",
                    value: `>>> Product: **${
                      licenseData.product_name
                    }**\nDeleted at: **${dateToTimestamp(
                      new Date()
                    )}**\nUser: **${memberUser.tag}**\nDiscord ID: **${
                      memberUser.id
                    }**`,
                  },
                  {
                    name: "• Deleted by:",
                    value: `>>> User: <@!${staffUser.id}> (${staffUser.tag})\nUser ID: **${staffUser.id}**`,
                  },
                ]),
            ],
          })
          .catch((e) => console.log(e));

        await licenseData.delete();

        return res.status(200).json({
          message: "License deleted successfully",
          license: licenseData,
        });
      } catch (error) {
        return res.status(500).json({
          message: "Something went wrong",
          error: error,
        });
      }
    }
  )
  .patch(
    "/api/web/reset-license/:license",
    isAuthenticated("developer"),
    async (req: any, res) => {
      const { license } = req.params;

      if (!license) {
        return res.status(400).json({
          message: "Invalid Request",
        });
      }

      try {
        const licenseData = await findLicense(license);
        if (!licenseData) {
          return res.status(400).json({
            message: "This license key doesnt exists",
          });
        }

        if (licenseData.expires_date && licenseData.expires_date < new Date()) {
          return res.status(410).json({
            message: "This license is expired",
          });
        }

        licenseData.ip_list = [];
        licenseData.latest_ip = null;
        licenseData.hwid_list = [];
        licenseData.latest_hwid = null;

        await licenseData.save();

        return res.status(210).json({
          message: "IP's & HWID's reset correctly!",
        });
      } catch (error) {
        client.logger.error(error);
        return res.status(500).json({
          message: "Something went wrong",
          error,
        });
      }
    }
  )
  .patch(
    "/api/web/refresh-license/:license",
    isAuthenticated("user"),
    async (req: any, res) => {
      const { license } = req.params;

      if (!license) {
        return res.status(400).json({
          message: "Invalid Request",
        });
      }

      try {
        const licenseData = await findLicense(license);
        if (!licenseData) {
          return res.status(400).json({
            message: "This license key doesnt exists",
          });
        }

        if (licenseData.expires_date && licenseData.expires_date < new Date()) {
          return res.status(410).json({
            message: "This license is expired",
          });
        }

        if (req.user.role === "user") {
          if (
            licenseData.latest_license_change &&
            licenseData.latest_license_change >
              new Date(new Date().getTime() - 1000 * 60 * 60 * 24)
          ) {
            const timeDifference =
              licenseData.latest_license_change.getTime() -
              (new Date().getTime() - 1000 * 60 * 60 * 24);
            const remainingHours = Math.floor(
              timeDifference / (1000 * 60 * 60)
            );
            const remainingMinutes = Math.floor(
              (timeDifference % (1000 * 60 * 60)) / (1000 * 60)
            );
            const remainingSeconds = Math.floor(
              (timeDifference % (1000 * 60)) / 1000
            );

            return res.status(410).json({
              message: `You can refresh your license after ${remainingHours} hours, ${remainingMinutes} minutes, and ${remainingSeconds} seconds!`,
            });
          }
        }

        let newLicense = generateLicense();
        while (await LicenseModel.exists({ license: newLicense })) {
          newLicense = generateLicense();
        }

        licenseData.license = encrypt(newLicense);
        licenseData.latest_license_change = new Date();

        await licenseData.save();

        return res.status(210).json({
          message: "License refreshed correctly!",
        });
      } catch (error) {
        client.logger.error(error);
        return res.status(500).json({
          message: "Something went wrong",
          error,
        });
      }
    }
  )
  .post("/api/web/products", isAuthenticated("admin"), async (req, res) => {
    const { name, description, price, version, role } = req.body;

    if (!name || !price || !version) {
      return res.status(400).json({
        message: "Invalid Request",
      });
    }

    if (name?.length < 3) {
      return res.status(400).json({
        message: "Product name must have a minimum of 3 characters",
      });
    }

    if (isNaN(price)) {
      return res.status(400).json({
        message: "Price must be a number",
      });
    }

    if (description && description.length > 400) {
      return res.status(400).json({
        nessage: "Description too long!",
      });
    }

    if (role && isNaN(role)) {
      const guildRole = await client.guild.roles.fetch(role);
      if (!guildRole) {
        res.status(400).json({
          message:
            "Invalid Role, please copy the role id from your discord server",
        });
      }

      return res.status(400).json({
        message: "The role must be a number",
      });
    }

    const productObject: Product = req.body;
    productObject.price = price.toFixed(2);

    const productExists = await ProductModel.findOne({ name });
    if (productExists) {
      return res.status(409).json({
        message: "The product already exists",
      });
    }

    try {
      const product = await ProductModel.create(productObject);

      const webHook = client.webhooks.web;
      await webHook
        ?.send({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "Product Created",
              })
              .setColor(Colors.Green)
              .setDescription("There is a product created in the web panel.")
              .addFields([
                {
                  name: "• Product Information:",
                  value: `>>> Product: **${product.name}**\nDescription: **${
                    product.description
                  }**\nPrice: **${product.price}**\nVersion: **${
                    product.version
                  }**\nRole: **${
                    product.role || "None"
                  }**\nCreated at: **${dateToTimestamp(new Date())}**`,
                },
                {
                  name: "• Created by:",
                  value:
                    ">>> User: **Djorr#9522**\nDiscord ID: **292439191105830913**",
                },
              ]),
          ],
        })
        .catch((e) => console.log(e));

      return res.status(201).json({
        message: "Product created",
        product,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error,
      });
    }
  })
  .patch(
    "/api/web/products/:name",
    isAuthenticated("admin"),
    async (req, res) => {
      const { name, description, price, version, role }: Product = req.body;
      const { name: nameQuery } = req.params;

      if (!nameQuery || nameQuery.length < 3) {
        return res.status(400).json({
          message: "Invalid Request",
        });
      }

      if (name && name?.length < 3) {
        return res.status(400).json({
          message: "Product name must have a minimum of 3 characters",
        });
      }

      if (price && isNaN(price)) {
        return res.status(400).json({
          message: "Price must be a number",
        });
      }

      if (description && description.length > 400) {
        return res.status(400).json({
          nessage: "Description too long!",
        });
      }

      const product = await ProductModel.findOne({ name: nameQuery });
      if (!product) {
        return res.status(404).json({
          message: "The product doesn't exists",
        });
      }

      const productObject: Product = {
        name: name || product?.name,
        description: description || product?.description,
        price: price || product?.price,
        version: version || product?.version,
        role: role || product?.role,
        createdBy: product.createdBy,
      };

      try {
        await product.update({ $set: productObject });

        const webHook = client.webhooks.web;
        await webHook
          ?.send({
            embeds: [
              new EmbedBuilder()
                .setAuthor({
                  name: "Product Change",
                })
                .setColor(Colors.Yellow)
                .setDescription("There is a product changed in the web panel.")
                .addFields([
                  {
                    name: "• Product Information:",
                    value: `>>> Product: **${product.name}**\nDescription: **${
                      product.description
                    }**\nPrice: **${product.price}**\nVersion: **${
                      product.version
                    }**\nRole: **${
                      product.role
                    }** || "None"}**\nChanged at: **${dateToTimestamp(
                      new Date()
                    )}**`,
                  },
                  {
                    name: "• Created by:",
                    value:
                      ">>> User: **Djorr#9522**\nDiscord ID: **292439191105830913**",
                  },
                ]),
            ],
          })
          .catch((e) => console.log(e));

        return res.status(200).json({
          message: "Product updated correctly",
        });
      } catch (error) {
        return res.status(500).json({
          message: "Something went wrong",
          error,
        });
      }
    }
  )
  .delete(
    "/api/web/products/:name",
    isAuthenticated("admin"),
    async (req, res) => {
      const { name } = req.params;

      if (!name) {
        return res.status(400).json({
          message: "Invalid Request",
        });
      }

      try {
        const product = await ProductModel.findOne({ name });
        await product.delete();

        const webHook = client.webhooks.web;
        await webHook
          ?.send({
            embeds: [
              new EmbedBuilder()
                .setAuthor({
                  name: "Product Deleted",
                })
                .setColor(Colors.Red)
                .setDescription("There is a product deleted in the web panel.")
                .addFields([
                  {
                    name: "• Product Information:",
                    value: `>>> Product: **${
                      product.name
                    }**\nDeleted at: **${dateToTimestamp(new Date())}**`,
                  },
                  {
                    name: "• Created by:",
                    value:
                      ">>> User: **Djorr#9522**\nDiscord ID: **292439191105830913**",
                  },
                ]),
            ],
          })
          .catch((e) => console.log(e));

        return res.status(200).json({
          message: "Product deleted",
          product,
        });
      } catch (error) {
        return res.status(500).json({
          message: "Something went wrong",
          error: error,
        });
      }
    }
  )
  .get("/logout", isAuthenticated(), (req, res) => {
    req.logout((e) => e);
    return res.redirect("/login");
  })
  .patch("/api/web/roles", isAuthenticated("owner"), async (req, res) => {
    const { role } = req.body;

    const roleData = await RoleModel.findOne({
      name: role,
    });

    try {
      roleData.name = role;
      await roleData.save();

      return res.status(200).json({
        message: "Role updated correctly",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error,
      });
    }
  })
  .patch("/api/web/users", isAuthenticated("admin"), async (req, res) => {
    const { user, role } = req.body;

    const userData = await UserModel.findOne({
      discordId: user,
    });

    if (!userData) {
      return res.status(404).json({
        message: "The user doesn't exists",
      });
    }

    try {
      const webHook = client.webhooks.web;
      await webHook
        ?.send({
          embeds: [
            new EmbedBuilder()
              .setAuthor({
                name: "User Change",
              })
              .setColor(Colors.Yellow)
              .setDescription("There is a product changed in the web panel.")
              .addFields([
                {
                  name: "• User Information:",
                  value: `>>> Product: **${user.name}**\nOld role: **${
                    user.role
                  }**\nNew role: **${role}**\nChanged at: **${dateToTimestamp(
                    new Date()
                  )}**`,
                },
                {
                  name: "• Created by:",
                  value:
                    ">>> User: **Djorr#9522**\nDiscord ID: **292439191105830913**",
                },
              ]),
          ],
        })
        .catch((e) => console.log(e));

      userData.role = role;
      await userData.save();

      return res.status(200).json({
        message: "User updated correctly",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error,
      });
    }
  })
  .get(
    "/download/:product/:version",
    isAuthenticated("user"),
    async (req: any, res: any) => {
      try {
        const productName = req.params.product;
        const version = req.params.version;

        const haveLicense = await LicenseModel.findOne({
          discord_id: req.user.discordId,
          product_name: productName,
        });

        if (!haveLicense) {
          return res.redirect(
            "/download?authError=You%20can%27t%20download%20that%20product"
          );
        }

        const filePath = join(
          __dirname,
          "..",
          "..",
          "updates",
          productName.toLowerCase(),
          version
        );
        res.download(filePath);
      } catch (error) {
        res.redirect(
          "/download?authError=I%20couldn%27t%20find%20that%20version,%20please%20try%20another%20one"
        );
      }
    }
  )
  .get("/api/updates/:product", isAuthenticated("admin"), async (req, res) => {
    const productName = req.params.product;

    const paths = await globPromise(
      join(__dirname, "..", "..", "updates", productName.toLowerCase(), "*")
    );
    return res.status(200).json({
      versions: paths.map((filePath) => {
        const splitted = filePath.split("/");
        return splitted[splitted.length - 1];
      }),
    });
  })
  .delete(
    "/api/updates/:product/:version",
    isAuthenticated("admin"),
    async (req: any, res: any) => {
      const { product, version } = req.params;
      const path = join(
        __dirname,
        "..",
        "..",
        "updates",
        product.toLowerCase(),
        version
      );

      try {
        unlinkSync(path);
        res.sendStatus(200);
      } catch (error) {
        res.sendStatus(500);
      }
    }
  )
  .post("/api/update/:product", <any>upload.single("file"), uploadFiles)
  .get("/auth/discord", passport.authenticate("discord"))
  .get(
    "/auth/callback",
    passport.authenticate("discord", {
      failureRedirect: "/login",
      session: true,
    }),
    (req, res) => res.redirect("/")
  );

// View Endpoints
router
  .get("/wizard", async (req, res) => {
    try {
      const usersWithOwnerRole = await UserModel.find({ role: "owner" }).exec();
      if (usersWithOwnerRole.length !== 0) {
        return res.redirect("/login");
      }

      return res.render("wizard");
    } catch (error) {
      // Handle the error appropriately
      console.error(error);
      return res
        .status(500)
        .json({ error: "Internal Server Error | Could not load wizard" });
    }
  })
  .get(
    "/login",
    async (req, res, next) => {
      try {
        const usersWithOwnerRole = await UserModel.find({
          role: "owner",
        }).exec();
        if (usersWithOwnerRole.length === 0) {
          return res.redirect("/wizard");
        }

        if (req.isAuthenticated() || req?.user) {
          return res.redirect("/");
        }

        return next();
      } catch (error) {
        // Handle the error appropriately
        console.error(error);
        return res
          .status(500)
          .json({ error: "Internal Server Error | Could not load login" });
      }
    },
    async (req, res) => {
      try {
        const usersWithOwnerRole = await UserModel.find({
          role: "owner",
        }).exec();
        if (!usersWithOwnerRole) {
          return res.redirect("/wizard");
        }

        return res.render("login");
      } catch (error) {
        // Handle the error appropriately
        console.error(error);
        return res
          .status(500)
          .json({ error: "Internal Server Error | Could not load login" });
      }
    }
  )
  .get("/", isAuthenticated(), async (req: any, res) => {
    const licenses = [];
    const userLicenses = await LicenseModel.find({
      discord_id: req.user.discordId,
    });

    for (const license of userLicenses) {
      license.license = decrypt(license.license);
      license.createdBy =
        client.users.cache.get(license.createdBy)?.tag || "Unknown#0000";

      licenses.push(license);
    }

    if (req.user.role !== "user") {
      const stats = {} as Stats;
      const panelLicenses = [];
      const licensesCache = await LicenseModel.find(
        {},
        "-_id discord_id createdAt product_name"
      );

      stats.products = (await ProductModel.find({}, "name")).length;
      stats.users = [...new Set(licensesCache.map((l) => l.discord_id))].length;
      stats.sales = licensesCache;

      for await (const license of licensesCache) {
        let userCache = client.users.cache.get(license.discord_id);
        if (!userCache?.tag)
          userCache = await client.users.fetch(license.discord_id);

        panelLicenses.push({
          license,
          ...{
            avatar: userCache.displayAvatarURL({ size: 64, forceStatic: true }),
            tag: userCache.tag,
          },
        });
      }

      stats.licenses = panelLicenses;
      stats.requests = await RequestModel.find(
        {},
        "-_id date rejected_requests successful_requests requests"
      )
        .limit(30)
        .sort({ createdAt: 1 });

      return res.render("index", {
        stats,
        licenses,
      });
    }

    return res.render("index", {
      licenses,
    });
  })
  .get("/licenses", isAuthenticated("support"), async (req: any, res) => {
    const licensesFetched = await LicenseModel.find();

    const licenses = [];
    for await (const license of licensesFetched) {
      license.license = decrypt(license.license);

      const userCache = client.users.cache.get(license.discord_id);
      if (userCache?.tag) {
        license.discord_id = userCache.tag;
      } else {
        license.discord_id =
          (await client.users.fetch(license.discord_id))?.tag ||
          license.discord_id;
      }

      licenses.push(license);
    }

    return res.render("licenses", {
      licenses,
    });
  })
  .get("/licenses/:query", isAuthenticated("admin"), async (req, res) => {
    const { query } = req.params;

    const license = await findLicense<{ tag: string }>(query);
    if (!license) return res.render("404");

    const user = await client.users.fetch(license.discord_id);
    license.tag = user.tag;
    license.license = query;

    return res.render("license", {
      license,
    });
  })
  .get("/add-new", isAuthenticated("developer"), async (req, res) => {
    const products = await ProductModel.find();

    return res.render("add-new", { products });
  })
  .get("/add-product", isAuthenticated("admin"), async (req, res) => {
    return res.render("add-product");
  })
  .get("/products", isAuthenticated("admin"), async (req, res) => {
    const products = await ProductModel.find();

    return res.render("products", {
      products,
    });
  })
  .get("/products/:query", isAuthenticated("admin"), async (req, res) => {
    const { query } = req.params;

    const product = await ProductModel.findOne({ name: query });
    if (!product) return res.render("404");

    return res.render("product", {
      product,
    });
  })
  .get("/roles", isAuthenticated("owner"), async (req, res) => {
    const roles = await RoleModel.find();

    return res.render("roles", {
      roles,
    });
  })
  .get("/users", isAuthenticated("admin"), async (req, res) => {
    const usersData = await UserModel.find({}, "-_id role discordId");
    const licenses = await LicenseModel.find();
    const products = await ProductModel.find();
    const roles = await RoleModel.find();

    const users: User[] = [];
    for await (const userData of usersData) {
      const userLicenses = licenses.filter(
        (l) => l.discord_id === userData.discordId
      );
      const userRole = userData.role || "none";
      let user = client.users.cache.get(userData.discordId);
      if (!user) {
        user = await client.users.fetch(userData.discordId);
      }

      users.push({
        avatar: user.displayAvatarURL({
          size: 64,
          extension: "png",
          forceStatic: true,
        }),
        licenses: userLicenses,
        tag: user.tag,
        id: userData.discordId,
        spent: userLicenses.reduce(
          (total, license) =>
            total +
              products.find((p) => p.name === license.product_name)?.price || 0,
          0
        ),
        requests: userLicenses.reduce(
          (total, license) => total + license.total_requests,
          0
        ),
        role: userRole,
      });
    }

    return res.render("users", {
      users,
      products,
      roles,
    });
  })
  .get("/download", isAuthenticated(), async (req: any, res) => {
    const userLicenses = (
      await LicenseModel.find(
        {
          discord_id: req.user.discordId,
        },
        "product_name"
      )
    ).map((license) => license.product_name);

    const products = await ProductModel.find();
    const productsFiles: { [key: string]: string[] } = {};

    for (const product of products) {
      if (!userLicenses.includes(product.name)) continue;
      const paths = await globPromise(
        join(__dirname, "..", "..", "updates", product.name.toLowerCase(), "*")
      );

      productsFiles[product.name] = paths.map((filePath) => {
        const splitted = filePath.split("/");
        return splitted[splitted.length - 1];
      });
    }

    return res.render("downloads", {
      products: products.filter((p) => userLicenses.includes(p.name)),
      files: productsFiles,
      authError: req.query?.authError,
    });
  })
  .get("*", (req, res) => {
    if (req.method === "GET") {
      return res.status(404).render("404");
    }

    res.status(404).json({
      error: true,
      message: "Route not found!",
    });
  });

export default router;
