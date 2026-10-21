import { ConnectorOptions } from "db0/connectors/better-sqlite3";
import { ConnectorOptions as ConnectorOptions$1 } from "db0/connectors/bun-sqlite";
import { ConnectorOptions as ConnectorOptions$2 } from "db0/connectors/cloudflare-d1";
import { ConnectorOptions as ConnectorOptions$3 } from "db0/connectors/cloudflare-hyperdrive-mysql";
import { ConnectorOptions as ConnectorOptions$4 } from "db0/connectors/cloudflare-hyperdrive-postgresql";
import { ConnectorOptions as ConnectorOptions$5 } from "db0/connectors/libsql/core";
import { ConnectorOptions as ConnectorOptions$6 } from "db0/connectors/libsql/http";
import { ConnectorOptions as ConnectorOptions$7 } from "db0/connectors/libsql/node";
import { ConnectorOptions as ConnectorOptions$8 } from "db0/connectors/libsql/web";
import { ConnectorOptions as ConnectorOptions$9 } from "db0/connectors/mysql2";
import { ConnectorOptions as ConnectorOptions$10 } from "db0/connectors/neon";
import { ConnectorOptions as ConnectorOptions$11 } from "db0/connectors/node-sqlite";
import { ConnectorOptions as ConnectorOptions$12 } from "db0/connectors/pglite";
import { ConnectorOptions as ConnectorOptions$13 } from "db0/connectors/planetscale";
import { ConnectorOptions as ConnectorOptions$14 } from "db0/connectors/postgresql";
import { ConnectorOptions as ConnectorOptions$15 } from "db0/connectors/sqlite3";
type ConnectorName = "better-sqlite3" | "bun-sqlite" | "bun" | "cloudflare-d1" | "cloudflare-hyperdrive-mysql" | "cloudflare-hyperdrive-postgresql" | "libsql-core" | "libsql-http" | "libsql-node" | "libsql" | "libsql-web" | "mysql2" | "neon" | "node-sqlite" | "sqlite" | "pglite" | "planetscale" | "postgresql" | "sqlite3";
type ConnectorOptions$16 = {
  "better-sqlite3": ConnectorOptions;
  "bun-sqlite": ConnectorOptions$1;
  /** alias of bun-sqlite */
  "bun": ConnectorOptions$1;
  "cloudflare-d1": ConnectorOptions$2;
  "cloudflare-hyperdrive-mysql": ConnectorOptions$3;
  "cloudflare-hyperdrive-postgresql": ConnectorOptions$4;
  "libsql-core": ConnectorOptions$5;
  "libsql-http": ConnectorOptions$6;
  "libsql-node": ConnectorOptions$7;
  /** alias of libsql-node */
  "libsql": ConnectorOptions$7;
  "libsql-web": ConnectorOptions$8;
  "mysql2": ConnectorOptions$9;
  "neon": ConnectorOptions$10;
  "node-sqlite": ConnectorOptions$11;
  /** alias of node-sqlite */
  "sqlite": ConnectorOptions$11;
  "pglite": ConnectorOptions$12;
  "planetscale": ConnectorOptions$13;
  "postgresql": ConnectorOptions$14;
  "sqlite3": ConnectorOptions$15;
};
declare const connectors: Record<ConnectorName, string>;
/**
 * Third-party packages each connector dynamically imports, keyed by the connector option
 * that can be used to provide them (usually `lib`).
 *
 * Connectors not listed here have no third-party dependencies.
 */
declare const connectorDependencies: Partial<Record<ConnectorName, ConnectorDependencies>>;
/**
 * Represents primitive types that can be used in SQL operations.
 */
type Primitive = string | number | boolean | undefined | null;
type SQLDialect = "mysql" | "postgresql" | "sqlite" | "libsql";
interface DatabaseCapabilities {
  readonly json: boolean;
  readonly booleans: boolean;
  readonly arrays: boolean;
  readonly dates: boolean;
  readonly uuids: boolean;
  readonly transactions: boolean;
}
type Statement = {
  /**
   * Binds parameters to the statement.
   * @param {...Primitive[]} params - Parameters to bind to the SQL statement.
   * @returns {PreparedStatement} The instance of the statement with bound parameters.
   */
  bind(...params: Primitive[]): PreparedStatement;
  /**
   * Executes the statement and returns all resulting rows as an array.
   * @param {...Primitive[]} params - Parameters to bind to the SQL statement.
   * @returns {Promise<unknown[]>} A promise that resolves to an array of rows.
   */
  all(...params: Primitive[]): Promise<unknown[]>;
  /**
   * Executes the statement as an action (e.g. insert, update, delete).
   * @param {...Primitive[]} params - Parameters to bind to the SQL statement.
   * @returns {Promise<{ success: boolean }>} A promise that resolves to the success state of the action.
   */
  run(...params: Primitive[]): Promise<{
    success: boolean;
  }>;
  /**
   * Executes the statement and returns a single row.
   * @param {...Primitive[]} params - Parameters to bind to the SQL statement.
   * @returns {Promise<unknown>} A promise that resolves to the first row in the result set.
   */
  get(...params: Primitive[]): Promise<unknown>;
};
type PreparedStatement = {
  /**
   * Binds parameters to the statement.
   * @param {...Primitive[]} params - Parameters to bind to the SQL statement.
   * @returns {PreparedStatement} The instance of the statement with bound parameters.
   */
  bind(...params: Primitive[]): PreparedStatement;
  /**
   * Executes the statement and returns all resulting rows as an array.
   * @returns {Promise<unknown[]>} A promise that resolves to an array of rows.
   */
  all(): Promise<unknown[]>;
  /**
   * Executes the statement as an action (e.g. insert, update, delete).
   * @returns {Promise<{ success: boolean }>} A promise that resolves to the success state of the action.
   */
  run(): Promise<{
    success: boolean;
  }>;
  /**
   * Executes the statement and returns a single row.
   * @returns {Promise<unknown>} A promise that resolves to the first row in the result set.
   */
  get(): Promise<unknown>;
};
/**
 * Represents the result of a database execution.
 */
type ExecResult = unknown;
/**
 * Defines a database connector for executing SQL queries and preparing statements.
 */
type Connector<TInstance = unknown> = {
  /**
   * The name of the connector.
   */
  name: string;
  /**
   * The SQL dialect used by the connector.
   */
  dialect: SQLDialect;
  /**
   * Override specific database capabilities for this connector.
   */
  capabilityOverrides?: Partial<DatabaseCapabilities>;
  /**
   * The client instance used internally.
   */
  getInstance: () => TInstance | Promise<TInstance>;
  /**
   * Executes an SQL query directly and returns the result.
   * @param {string} sql - The SQL string to execute.
   * @returns {ExecResult | Promise<ExecResult>} The result of the execution.
   */
  exec: (sql: string) => ExecResult | Promise<ExecResult>;
  /**
   * Prepares an SQL statement for execution.
   * @param {string} sql - The SQL string to prepare.
   * @returns {statement} The prepared SQL statement.
   */
  prepare: (sql: string) => Statement;
  /**
   * Closes the database connection and cleans up resources.
   * @returns {void | Promise<void>} A promise that resolves when the connection is closed.
   */
  dispose?: () => void | Promise<void>;
};
/**
 * Represents default SQL results, including any error messages, row changes and rows returned.
 */
type DefaultSQLResult = {
  lastInsertRowid?: number;
  changes?: number;
  error?: string;
  rows?: {
    id?: string | number;
    [key: string]: unknown;
  }[];
  success?: boolean;
};
interface Database<TConnector extends Connector = Connector> extends AsyncDisposable {
  readonly connector: ConnectorName;
  readonly dialect: SQLDialect;
  /**
   * Database capabilities supported by this connector.
   */
  readonly capabilities: DatabaseCapabilities;
  /**
   * Indicates whether the database instance has been disposed/closed.
   * @returns {boolean} True if the database has been disposed, false otherwise.
   */
  readonly disposed: boolean;
  /**
   * The client instance used internally.
   * @returns {Promise<TInstance>} A promise that resolves with the client instance.
   */
  getInstance: () => Promise<Awaited<ReturnType<TConnector["getInstance"]>>>;
  /**
   * Executes a raw SQL string.
   * @param {string} sql - The SQL string to execute.
   * @returns {Promise<ExecResult>} A promise that resolves with the execution result.
   */
  exec: (sql: string) => Promise<ExecResult>;
  /**
   * Prepares an SQL statement from a raw SQL string.
   * @param {string} sql - The SQL string to prepare.
   * @returns {statement} The prepared SQL statement.
   */
  prepare: (sql: string) => Statement;
  /**
   * Executes SQL queries using tagged template literals.
   * @template T The expected type of query result.
   * @param {TemplateStringsArray} strings - The segments of the SQL string.
   * @param {...Primitive[]} values - The values to interpolate into the SQL string.
   * @returns {Promise<T>} A promise that resolves with the typed result of the query.
   */
  sql: <T = DefaultSQLResult>(strings: TemplateStringsArray, ...values: Primitive[]) => Promise<T>;
  /**
   * Closes the database connection and cleans up resources.
   * @returns {Promise<void>} A promise that resolves when the connection is closed.
   */
  dispose: () => Promise<void>;
  /**
   * AsyncDisposable implementation for using syntax support.
   * @returns {Promise<void>} A promise that resolves when the connection is disposed.
   */
  [Symbol.asyncDispose]: () => Promise<void>;
}
/**
 * A third-party package that a connector dynamically imports at runtime.
 */
interface ConnectorDependency {
  /**
   * Name of the npm package to install.
   *
   * Can differ from the import specifier used by the connector, which is then
   * exposed as `import` (e.g. `mysql2` for `mysql2/promise`).
   */
  name: string;
  /**
   * Import specifier the connector uses, when it differs from `name`
   * (e.g. `mysql2/promise` for the `mysql2` package).
   *
   * Consumers that resolve the library themselves (to pass it back via the `lib` option)
   * should import this rather than `name`.
   */
  import?: string;
  /**
   * Supported version range of the package.
   */
  version: string;
  /**
   * The dependency is only needed for some connector features or configurations.
   */
  optional?: boolean;
}
/**
 * Third-party packages a connector dynamically imports, keyed by the connector option
 * that can be used to provide them (usually `lib`).
 *
 * Connectors expose this as a `CONNECTOR_DEPENDENCIES` export so that consumer frameworks
 * can check or install what a configured connector needs.
 */
type ConnectorDependencies = Record<string, ConnectorDependency>;
/**
 * A library used by a connector.
 *
 * Connectors dynamically import their dependencies. If the bundler or runtime cannot
 * resolve them (or you simply prefer a static top-level import), the library can be provided
 * as the module namespace object itself or as a (possibly async) function returning it.
 *
 * @example
 * ```ts
 * import * as mysql2 from "mysql2/promise";
 * mysqlConnector({ lib: mysql2 });
 * // or
 * mysqlConnector({ lib: () => import("mysql2/promise") });
 * ```
 */
type LibImport<T> = T | (() => T | Promise<T>);
export { Connector, ConnectorDependencies, ConnectorDependency, ConnectorName, ConnectorOptions$16 as ConnectorOptions, Database, DatabaseCapabilities, ExecResult, LibImport, PreparedStatement, Primitive, SQLDialect, Statement, connectorDependencies, connectors };