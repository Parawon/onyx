/* eslint-disable */
/**
 * Types derived from `convex/schema.ts`.
 * Regenerate with `npx convex dev` after linking a Convex project.
 */
import type {
  DataModelFromSchemaDefinition,
  DocumentByName,
  SystemTableNames,
  TableNamesInDataModel,
} from "convex/server";
import type { GenericId } from "convex/values";
import type schema from "../schema.js";

export type DataModel = DataModelFromSchemaDefinition<typeof schema>;

export type Doc<TableName extends TableNamesInDataModel<DataModel>> = DocumentByName<
  DataModel,
  TableName
>;

export type Id<TableName extends TableNamesInDataModel<DataModel> | SystemTableNames> =
  GenericId<TableName>;
