import { NextFunction, Request, Response, Router } from "express";
import { generateLicense } from "../helpers/generateKeys";
import ProductModel from "../models/ProductModel";
import LicenseModel from "../models/LicenseModel";
import { decrypt, encrypt } from "../helpers/crypto";
import Product from "../typings/Product";
import License from "../typings/License";
import { client } from "..";
import findLicense from "../helpers/findLicense";
import findRole from "../helpers/findRole";

const router = Router();

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // @ts-ignore
  const { authorization } = req.headers;

  if (authorization === client.config.LicenseSettings.PublicApiKey) {
    // @ts-ignore
    return res.status(401).json({
      message: "Your SecretApiKey cannot be the same as the PublicApiKey",
    });
  }

  if (authorization !== client.config.LicenseSettings.SecretApiKey) {
    // @ts-ignore
    return res.status(401).json({
      message: "Invalid Api Key",
    });
  }

  next();
};

router
  .get("/products", authMiddleware, async (req, res) => {
    try {
      const products = await ProductModel.find();
      return res.status(200).json({
        message: "Products obtained correctly",
        products,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error,
      });
    }
  })
  .post("/products", authMiddleware, async (req, res) => {
    const { name, price, version, role, description } = req.body;

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

    if (role) {
      const guildRole = await client.guild.roles.fetch(role);
      if (!guildRole) {
        res.status(400).json({
          message: "Invalid Role",
        });
      }
    }

    if (description && description.length > 400) {
      return res.status(400).json({
        nessage: "Description too long!",
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
  .patch("/products/:name", authMiddleware, async (req, res) => {
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
      return res.status(200).json({
        message: "Product updated correctly",
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error,
      });
    }
  })
  .delete("/products/:name", authMiddleware, async (req, res) => {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        message: "Invalid Request",
      });
    }

    try {
      const product = await ProductModel.findOne({ name });
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
  });

router
  .get("/licenses", authMiddleware, async (req, res) => {
    try {
      const licensesFetched = await LicenseModel.find();
      const licenses = licensesFetched.map((license) => {
        license.license = decrypt(license.license);
        return license;
      });

      return res.status(200).json({
        message: "Licenses obtained correctly",
        licenses,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error,
      });
    }
  })
  .post("/licenses", authMiddleware, async (req, res) => {
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

    const licenseUser = await client.users.fetch(discord_id || "");
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

    const expires_date = new Date();
    expires_date.setDate(expires_date.getDate() + expiresDays || 0);

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
      createdBy: client.user.id,
      hwid_list: [],
      ip_list: [],
      latest_hwid: null,
      latest_ip: null,
      total_requests: 0,
    };

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
  })
  .patch("/licenses/:license", authMiddleware, async (req, res) => {
    const { product_name, reason, license, discord_id, ip_cap, hwid_cap } =
      req.body;
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
  })
  .patch("/roles/:role", authMiddleware, async (req, res) => {
    const { name, permissions } = req.body;
    const { role: roleQuery } = req.params;

    if (!roleQuery || roleQuery.length < 2) {
      return res.status(400).json({
        message: "Invalid Request",
      });
    }

    if (name && name.length < 3) {
      return res.status(400).json({
        message: "The name of the role must be a minimum of 3 characters",
      });
    }

    try {
      const roleData = await findRole(roleQuery);
      if (!roleData) {
        return res.status(400).json({
          message: "This role doesn't exist",
        });
      }

      await roleData.update({ $set: req.body }, { upsert: true });

      return res.status(200).json({
        message: "Role updated correctly",
      });
    } catch (error) {
      client.logger.error(error);
      return res.status(500).json({
        message: "Something went wrong",
        error,
      });
    }
  })
  .delete("/licenses/:license", authMiddleware, async (req, res) => {
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

      await licenseData.delete();

      return res.status(200).json({
        message: "Product deleted",
        license: licenseData,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Something went wrong",
        error: error,
      });
    }
  });

export default router;
