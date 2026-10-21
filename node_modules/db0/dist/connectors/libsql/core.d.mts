import { Connector, DatabaseCapabilities } from "db0";
import { Client } from "@libsql/client";
type ConnectorOptions = {
  getClient: () => Client | Promise<Client>;
  name?: string;
  capabilityOverrides?: Partial<DatabaseCapabilities>;
  dispose?: () => void | Promise<void>;
};
declare function libSqlCoreConnector(opts: ConnectorOptions): Connector<Client>;
export { ConnectorOptions, libSqlCoreConnector as default };