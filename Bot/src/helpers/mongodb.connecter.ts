import { ExtendedClient } from "../structures/Client";
import mongoose, { connect } from "mongoose";

export default async function startDatabase(client: ExtendedClient) {
  const { Uri } = client.config.DatabaseSettings;

  // Set strictQuery before connecting to the database
  mongoose.set("strictQuery", true); // or false, based on your preference

  try {
    const connection = await connect(Uri);
    client.logger.success("Succesfully database connected.");

    return connection;
  } catch (error) {
    client.logger.error("Error connecting to the database.");
    process.exit(1);
  }
}
