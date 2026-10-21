import { DB0DrizzleSQLiteConfig, DrizzleSQLiteDatabase, drizzle } from "../../_chunks/index.mjs";
import { AnyRelations, EmptyRelations } from "drizzle-orm";
import { DrizzleSQLiteConfig } from "drizzle-orm/sqlite-core";
/**
 * Config accepted by the default (SQLite) `drizzle()` integration.
 *
 * Kept as an alias with a `TRelations` default: drizzle v1 replaced
 * `DrizzleConfig<TSchema, TRelations>` (both parameters defaulted) with
 * `DrizzleSQLiteConfig<TRelations>`, which has no default, so re-exporting it
 * directly would break every downstream `DrizzleBaseConfig` used without a type
 * argument.
 */
type DrizzleBaseConfig<TRelations extends AnyRelations = EmptyRelations> = DrizzleSQLiteConfig<TRelations>;
export { type DB0DrizzleSQLiteConfig, DrizzleBaseConfig, type DrizzleSQLiteDatabase as DrizzleDatabase, drizzle };