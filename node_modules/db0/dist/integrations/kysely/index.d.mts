import { Kysely, KyselyConfig } from "kysely";
import { Database } from "db0";
type KyselyDatabase<T = any> = Kysely<T>;
declare function kysely<T = any>(db: Database, config?: Omit<KyselyConfig, "dialect">): Kysely<T>;
export { KyselyDatabase, kysely };