import {
  ipCapReached,
  hwidCapReached,
  successfulAuthentication,
  invalidLicenseKey,
  expiredLicense,
  userBlacklisted,
} from "../helpers/authEmbeds";
import getClientIpAddress from "../helpers/getClientIpAddress";
import BlacklistModel from "../models/BlacklistModel";
import handleRequest from "../helpers/handleRequest";
import LicenseModel from "../models/LicenseModel";
import ProductModel from "../models/ProductModel";
import findLicense from "../helpers/findLicense";
import rateLimit from "express-rate-limit";
import { Router } from "express";
import { client } from "..";

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status_msg: "TOO_MANY_REQUESTS",
    status_overview: "failed",
    status_code: 429,
  },
  max: 100,
});

const router = Router();

interface RequestData {
  license: string;
  product: string;
  version: string;
  hwid?: string;
}

router.post("/client", limiter as any, async (req, res) => {
  const { license, product, version, hwid } = req.body as RequestData;
  const { authorization } = req.headers;
  const clientIp = getClientIpAddress(req);
  const webhook = client.webhooks.auth;

  if (!license || !product || !version || !authorization) {
    res.json({
      status_msg: "INVALID_REQUEST",
      status_overview: "failed",
      status_code: 400,
    });

    return await handleRequest({ ipAddress: clientIp, requestType: "failed" });
  }

  if (authorization !== client.config.LicenseSettings.PublicApiKey) {
    res.json({
      status_msg: "INVALID_REQUEST",
      status_overview: "failed",
      status_code: 400,
    });

    return await handleRequest({ ipAddress: clientIp, requestType: "failed" });
  }

  if (hwid && typeof hwid === "string") {
    const isBlacklisted = await BlacklistModel.findOne({
      type: "hwid",
      blacklisted: hwid,
    });

    if (isBlacklisted) {
      res.json({
        status_msg: "HWID_BLACKLISTED",
        status_overview: "failed",
        status_code: 403,
      });

      isBlacklisted.blocked_connections++;
      await isBlacklisted.save();

      await webhook?.send({
        embeds: [userBlacklisted(license, product, clientIp, isBlacklisted)],
      });
      return await handleRequest({
        ipAddress: clientIp,
        requestType: "failed",
      });
    }
  }

  const isBlacklisted = await BlacklistModel.findOne({
    type: "ip",
    blacklisted: clientIp,
  });

  if (isBlacklisted) {
    res.json({
      status_msg: "IP_BLACKLISTED",
      status_overview: "failed",
      status_code: 403,
    });

    isBlacklisted.blocked_connections++;
    await isBlacklisted.save();

    await webhook?.send({
      embeds: [userBlacklisted(license, product, clientIp, isBlacklisted)],
    });
    return await handleRequest({ ipAddress: clientIp, requestType: "failed" });
  }

  const licenseData = await findLicense(license);
  if (!licenseData) {
    res.json({
      status_msg: "INVALID_LICENSE",
      status_overview: "failed",
      status_code: 400,
    });

    await webhook?.send({
      embeds: [invalidLicenseKey(license, product, clientIp)],
    });
    return await handleRequest({ ipAddress: clientIp, requestType: "failed" });
  }

  const productData = await ProductModel.findOne({ name: product });
  if (productData?.name !== product) {
    res.json({
      status_msg: "INVALID_PRODUCT",
      status_overview: "failed",
      status_code: 400,
    });

    return await handleRequest({
      ipAddress: clientIp,
      requestType: "failed",
      license: licenseData,
    });
  }

  if (licenseData.product_name !== productData.name) {
    res.json({
      status_msg: "INVALID_LICENSE_FOR_PRODUCT",
      status_overview: "failed",
      status_code: 400,
    });

    await webhook?.send({
      embeds: [invalidLicenseKey(license, product, clientIp)],
    });
    return await handleRequest({ ipAddress: clientIp, requestType: "failed" });
  }

  const currentDate = new Date();
  const user = await client.users.fetch(licenseData?.discord_id);

  if (licenseData.expires_date && currentDate > licenseData.expires_date) {
    res.json({
      status_msg: "LICENSE_EXPIRED",
      status_overview: "failed",
      status_code: 400,
    });

    await handleRequest({
      ipAddress: clientIp,
      requestType: "failed",
      license: licenseData,
    });
    return await webhook?.send({ embeds: [expiredLicense(licenseData, user)] });
  }

  if (licenseData.ip_cap && licenseData.ip_list.length >= licenseData.ip_cap) {
    if (!licenseData.ip_list.includes(clientIp)) {
      // Solved issue with cap reached if IP is in cache.
      res.json({
        status_msg: "MAX_IP_CAP",
        status_overview: "failed",
        status_code: 400,
      });

      await handleRequest({
        ipAddress: clientIp,
        requestType: "failed",
        license: licenseData,
      });
      return await webhook?.send({ embeds: [ipCapReached(licenseData, user)] });
    }
  }

  if (
    licenseData.hwid_cap &&
    licenseData.hwid_list.length >= licenseData.hwid_cap
  ) {
    if (!licenseData.hwid_list.includes(hwid)) {
      // Solved issue with cap reached if IP is in cache.
      res.json({
        status_msg: "MAX_HWID_CAP",
        status_overview: "failed",
        status_code: 400,
      });

      await handleRequest({
        ipAddress: clientIp,
        requestType: "failed",
        license: licenseData,
      });
      return await webhook?.send({
        embeds: [hwidCapReached(licenseData, user)],
      });
    }
  }

  if (
    licenseData.hwid_cap &&
    licenseData.hwid_list.length >= licenseData.hwid_cap
  ) {
    res.json({
      status_msg: "MAX_HWID_CAP",
      status_overview: "failed",
      status_code: 400,
    });

    await handleRequest({
      ipAddress: clientIp,
      requestType: "failed",
      license: licenseData,
    });
    return await webhook?.send({ embeds: [hwidCapReached(licenseData, user)] });
  }

  if (!licenseData.ip_list.includes(clientIp)) {
    licenseData.ip_list.push(clientIp);
  }

  if (hwid && !licenseData.hwid_list.includes(clientIp)) {
    licenseData.hwid_list.push(hwid);
  }

  res.json({
    status_msg: "SUCCESSFUL_AUTHENTICATION",
    status_overview: "success",
    status_code: 200,
    status_id: "SUCCESS",
    version: productData.version,
    discord_username: user.username,
    discord_tag: user.tag,
    discord_id: licenseData.discord_id,
    expire_date: licenseData.expires_date || "Never",
  });

  await handleRequest({
    ipAddress: clientIp,
    requestType: "success",
    license: licenseData,
  });
  webhook?.send({ embeds: [successfulAuthentication(licenseData, user)] });
  return await LicenseModel.findByIdAndUpdate(licenseData._id, {
    $set: {
      latest_ip: clientIp,
      latest_hwid: hwid || null,
      total_requests: licenseData.total_requests + 1,
      ip_list: licenseData.ip_list,
      hwid_list: licenseData.hwid_list,
    },
  });
});

export default router;
