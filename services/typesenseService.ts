import { Client } from "typesense";
import { logger } from "../api/middlewares/logger";
import { typesenseConfig } from "../config/typesense.config";
import { studyModulesSchema } from "../config/typesense.schema";

class TypesenseService {
  private client: Client;

  constructor() {
    this.client = new Client(typesenseConfig);
    logger.info(
      {
        context: "Typesense",
        nodes: typesenseConfig.nodes.map(({ host, port, protocol }) => ({ host, port, protocol })),
      },
      "Typesense client initialised"
    );

    this.initializeSchema().catch((error) => {
      logger.error({ err: error, context: "Typesense" }, "Typesense bootstrap failed");
    });
  }

  private async initializeSchema() {
    try {
      const collection = await this.client.collections("study_modules").retrieve();
      logger.info(
        { context: "Typesense", collection: "study_modules" },
        "Typesense ready: collection available"
      );
      return collection;
    } catch (error) {
      logger.warn({ err: error, context: "Typesense" }, "Failed to retrieve study_modules collection");
      logger.info({ context: "Typesense" }, "Attempting to create study_modules collection");
      try {
        const createdCollection = await this.client.collections().create(studyModulesSchema);
        logger.info(
          { context: "Typesense", collection: "study_modules" },
          "Successfully created Typesense collection"
        );
        return createdCollection;
      } catch (creationError) {
        logger.error(
          { err: creationError, context: "Typesense" },
          "Error creating study_modules collection"
        );
      }
    }
  }

  public getClient(): Client {
    return this.client;
  }

  public async indexModule(module: {
    id: number;
    study_path_id: number;
    title: string;
    description: string;
    subtopics: string[];
    image_url?: string;
  }) {
    try {
      const document = {
        ...module,
        id: module.id.toString(), // Convert id to string for Typesense
      };
      await this.client.collections("study_modules").documents().upsert(document);
      logger.info({ moduleId: module.id, context: "Typesense" }, "Indexed module in Typesense");
    } catch (error) {
      logger.error(
        { err: error, moduleId: module.id, context: "Typesense" },
        "Error indexing module in Typesense"
      );
    }
  }

  public async searchModules(query: string) {
    try {
      const searchParameters = {
        q: query,
        query_by: "title,description,subtopics",
        per_page: 10,
      };
      const searchResult = await this.client
        .collections("study_modules")
        .documents()
        .search(searchParameters);
      logger.debug(
        { query, found: searchResult.found, context: "Typesense" },
        "Typesense search completed"
      );
      return searchResult;
    } catch (error) {
      logger.error({ err: error, query, context: "Typesense" }, "Error searching in Typesense");
      throw error;
    }
  }
}

export const typesenseService = new TypesenseService();
