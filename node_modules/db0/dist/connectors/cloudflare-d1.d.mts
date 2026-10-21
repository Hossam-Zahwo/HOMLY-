import { Connector } from "db0";
interface ConnectorOptions {
  bindingName?: string;
}
declare function cloudflareD1Connector(options: ConnectorOptions): Connector<D1Database>;
export { ConnectorOptions, cloudflareD1Connector as default };