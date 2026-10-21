import { Database } from "bun:sqlite";
import { Connector } from "db0";
interface ConnectorOptions {
  cwd?: string;
  path?: string;
  name?: string;
}
declare function bunSqliteConnector(opts: ConnectorOptions): Connector<Database>;
export { ConnectorOptions, bunSqliteConnector as default };