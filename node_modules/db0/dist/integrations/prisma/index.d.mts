import { Database } from "../../_chunks/types.mjs";
import { SqlDriverAdapterFactory } from "@prisma/driver-adapter-utils";
/**
 * Creates a Prisma [driver adapter](https://www.prisma.io/docs/orm/overview/databases/database-drivers)
 * backed by a db0 database instance.
 *
 * @param db - The db0 database to run Prisma queries through.
 * @returns A driver adapter factory to pass as `new PrismaClient({ adapter })`.
 */
declare function prisma(db: Database): SqlDriverAdapterFactory;
export { prisma };