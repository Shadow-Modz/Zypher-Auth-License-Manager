import { EmbedBuilder, User } from "discord.js";
import { client } from "..";
import Blacklist from "../typings/Blacklist";
import License from "../typings/License";
import { decrypt } from "./crypto";
import dateToTimestamp from "./timestamp";

const ipCapReached = (licenseData: License, user: User) => {
  return new EmbedBuilder()
    .setAuthor({
      name: `IP Cap Reached! (${licenseData.ip_list.length}/${licenseData.ip_cap})`,
      iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
    })
    .addFields([
      {
        name: "• License Information:",
        value: `>>> License Key: **${decrypt(
          licenseData.license
        )}**\nProduct: **${licenseData.product_name}**\nTotal Requests: **${
          licenseData.total_requests
        }**\nLatest IP: **${
          licenseData.latest_ip || "Unknown"
        }**\nLatest HWID: **${
          licenseData.latest_hwid || "Unknown"
        }**\nCreated at: ${dateToTimestamp(licenseData.createdAt)}`,
      },
      {
        name: "• User Information:",
        value: `>>> User: <@!${user.id}> (${user.tag})\nUser ID: **${user.id}**`,
      },
      {
        name: "• IP List:",
        value:
          "```yaml\n" +
          licenseData.ip_list.map((ip, i) => `${i + 1}: ${ip}`).join("\n") +
          "```",
      },
    ])
    .setColor("Red")
    .setTimestamp();
};

const hwidCapReached = (licenseData: License, user: User) => {
  return new EmbedBuilder()
    .setAuthor({
      name: `HWID Cap Reached! (${licenseData.ip_list.length}/${licenseData.ip_cap})`,
      iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
    })
    .addFields([
      {
        name: "• License Information:",
        value: `>>> License Key: **${decrypt(
          licenseData.license
        )}**\nProduct: **${licenseData.product_name}**\nTotal Requests: **${
          licenseData.total_requests
        }**\nLatest IP: **${
          licenseData.latest_ip || "Unknown"
        }**\nLatest HWID: **${
          licenseData.latest_hwid || "Unknown"
        }**\nExpire at: ${
          licenseData.expires_date
            ? dateToTimestamp(licenseData.expires_date)
            : "**Never**"
        }\nCreated at: ${dateToTimestamp(licenseData.createdAt)}`,
      },
      {
        name: "• User Information:",
        value: `>>> User: <@!${user.id}> (${user.tag})\nUser ID: **${user.id}**`,
      },
      {
        name: "• HWID List:",
        value:
          "```yaml\n" +
          licenseData.hwid_list.map((ip, i) => `${i + 1}: ${ip}`).join("\n") +
          "```",
      },
    ])
    .setColor("Red")
    .setTimestamp();
};

const successfulAuthentication = (licenseData: License, user: User) => {
  return new EmbedBuilder()
    .setAuthor({
      name: "Successful Authentication",
      iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
    })
    .addFields([
      {
        name: "• License Information:",
        value: `>>> License Key: **${decrypt(
          licenseData.license
        )}**\nProduct: **${licenseData.product_name}**\nTotal Requests: **${
          licenseData.total_requests
        }**\nLatest IP: **${
          licenseData.latest_ip || "Unknown"
        }**\nLatest HWID: **${
          licenseData.latest_hwid || "Unknown"
        }**\nExpire at: ${
          licenseData.expires_date
            ? dateToTimestamp(licenseData.expires_date)
            : "**Never**"
        }\nCreated at: ${dateToTimestamp(licenseData.createdAt)}`,
      },
      {
        name: "• User Information:",
        value: `>>> User: <@!${user.id}> (${user.tag})\nUser ID: **${user.id}**`,
      },
    ])
    .setColor("Green")
    .setTimestamp();
};

const invalidLicenseKey = (
  license: string,
  product: string,
  clientIp: string
) => {
  return new EmbedBuilder()
    .setAuthor({
      name: "Invalid License Key",
      iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
    })
    .addFields([
      {
        name: "• Information:",
        value: `>>> License Key: **${license}**\nProduct: **${product}**\nIP-Address: **${clientIp}**`,
      },
    ])
    .setColor("Red")
    .setTimestamp();
};

const expiredLicense = (licenseData: License, user: User) => {
  return new EmbedBuilder()
    .setAuthor({
      name: "License Key Expired",
      iconURL: "https://cdn-icons-png.flaticon.com/64/1828/1828506.png",
    })
    .addFields([
      {
        name: "• License Information:",
        value: `>>> License Key: **${decrypt(
          licenseData.license
        )}**\nProduct: **${licenseData.product_name}**\nTotal Requests: **${
          licenseData.total_requests
        }**\nLatest IP: **${
          licenseData.latest_ip || "Unknown"
        }**\nLatest HWID: **${
          licenseData.latest_hwid || "Unknown"
        }**\nExpire at: ${
          licenseData.expires_date
            ? dateToTimestamp(licenseData.expires_date)
            : "**Never**"
        }\nCreated at: ${dateToTimestamp(licenseData.createdAt)}`,
      },
      {
        name: "• User Information:",
        value: `>>> User: <@!${user.id}> (${user.tag})\nUser ID: **${user.id}**`,
      },
    ])
    .setColor("Red")
    .setTimestamp();
};

const userBlacklisted = (
  license: string,
  product: string,
  clientIp: string,
  blacklisted: Blacklist
) => {
  return new EmbedBuilder()
    .setAuthor({
      name: "User Blacklisted",
      iconURL: client.user.displayAvatarURL(),
    })
    .addFields([
      {
        name: "• Information:",
        value: `>>> License Key: **${license}**\nProduct: **${product}**\nIP-Address: **${clientIp}**`,
      },
      {
        name: "• Blacklist Information:",
        value: `>>> ${blacklisted.type.toUpperCase()}: **${
          blacklisted.blacklisted
        }**\nBlocked Connections: **${
          blacklisted.blocked_connections
        }**\nBlacklisted at: ${dateToTimestamp(blacklisted.createdAt)}`,
      },
    ])
    .setColor("Red")
    .setTimestamp();
};

export {
  ipCapReached,
  hwidCapReached,
  successfulAuthentication,
  invalidLicenseKey,
  expiredLicense,
  userBlacklisted,
};
