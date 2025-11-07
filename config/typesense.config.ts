import dotenv from "dotenv";
import type { ConfigurationOptions } from "typesense/lib/Typesense/Configuration";

dotenv.config();

const parseUrlNode = (value?: string | null) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    const protocol = url.protocol.replace(":", "");

    return {
      host: url.hostname,
      port: Number(url.port || (protocol === "https" ? 443 : 80)),
      protocol,
    };
  } catch (error) {
    console.warn(`Could not parse Typesense URL "${value}":`, error);
    return null;
  }
};

const urlNode =
  parseUrlNode(process.env.TYPESENSE_PUBLIC_URL) || parseUrlNode(process.env.TYPESENSE_URL);

const host = process.env.TYPESENSE_HOST || urlNode?.host || "localhost";
const port = Number(process.env.TYPESENSE_PORT || urlNode?.port || 8108);
const protocol = process.env.TYPESENSE_PROTOCOL || urlNode?.protocol || "https";

export const typesenseConfig: ConfigurationOptions = {
  nodes: [
    {
      host,
      port,
      protocol,
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || "",
  connectionTimeoutSeconds: 10, // Increased timeout
};
