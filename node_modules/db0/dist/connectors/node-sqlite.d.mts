import { Connector } from "db0";
import { DatabaseSync } from "node:sqlite";
interface ConnectorOptions {
  cwd?: string;
  path?: string;
  name?: string;
}
declare function nodeSqlite3Connector(opts: ConnectorOptions): Connector<DatabaseSync>;
export { ConnectorOptions, nodeSqlite3Connector as default };