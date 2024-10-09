import { Request } from "express";

export default (req: Request): string => {
  const ipAdress = String(
    // @ts-ignore
    req.headers["cf-connecting-ip"] ||
      // @ts-ignore
      req.headers["x-real-ip"] ||
      // @ts-ignore
      req.headers["x-forwarded-for"] ||
      // @ts-ignore
      req.socket.remoteAddress
  );

  return ipAdress.substring(0, 7) === "::ffff:"
    ? ipAdress.substring(7)
    : ipAdress;
};
