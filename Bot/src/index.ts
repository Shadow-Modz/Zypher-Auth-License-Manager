import { ExtendedClient } from "./structures/Client";
import { App } from "./structures/Server";

export const client = new ExtendedClient();
export const app = new App();

client.start();
