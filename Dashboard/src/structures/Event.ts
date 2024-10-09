import { ClientEvents, User } from "discord.js";
import License from "../typings/License";

interface ExtendedEvents extends ClientEvents {
  licenseCreate: [license: License, user: User];
  licenseDelete: [license: License, user: User];
  licenseClear: [license: License, user: User, type: "IP" | "HWID"];
}

export class Event<Key extends keyof ExtendedEvents> {
  constructor(
    public event: Key,
    public run: (...args: ExtendedEvents[Key]) => void
  ) {}
}
