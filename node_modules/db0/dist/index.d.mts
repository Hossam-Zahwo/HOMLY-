import { Connector, ConnectorDependencies, ConnectorDependency, ConnectorName, ConnectorOptions, Database, DatabaseCapabilities, ExecResult, LibImport, PreparedStatement, Primitive, SQLDialect, Statement, connectorDependencies, connectors } from "./_chunks/types.mjs";
/**
 * Creates and returns a database interface using the specified connector.
 * This interface allows you to execute raw SQL queries, prepare SQL statements,
 * and execute SQL queries with parameters using tagged template literals.
 *
 * @param {Connector} connector - The database connector used to execute and prepare SQL statements. See {@link Connector}.
 * @returns {Database} The database interface that allows SQL operations. See {@link Database}.
 */
declare function createDatabase<TConnector extends Connector = Connector>(connector: TConnector): Database<TConnector>;
declare const dialectCapabilities: Record<SQLDialect, DatabaseCapabilities>;
declare function getCapabilities(dialect: SQLDialect, overrides?: Partial<DatabaseCapabilities>): DatabaseCapabilities;
export { type Connector, type ConnectorDependencies, type ConnectorDependency, type ConnectorName, type ConnectorOptions, type Database, type DatabaseCapabilities, type ExecResult, type LibImport, type PreparedStatement, type Primitive, type SQLDialect, type Statement, connectorDependencies, connectors, createDatabase, dialectCapabilities, getCapabilities };