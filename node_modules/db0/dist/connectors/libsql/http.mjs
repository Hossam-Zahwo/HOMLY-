import { importLib, lazyInstance } from "../../_chunks/utils.mjs";
import libSqlCoreConnector from "./core.mjs";
const CONNECTOR_DEPENDENCIES = { lib: {
	name: "@libsql/client",
	import: "@libsql/client/http",
	version: "^0.14 || ^0.15 || ^0.16 || ^0.17"
} };
const CONNECTOR_NAME = "libsql-http";
function libSqlConnector(opts) {
	const { lib, ...config } = opts;
	const getClient = lazyInstance(async () => {
		const { createClient } = await importLib(CONNECTOR_NAME, "@libsql/client/http", lib, () => import("@libsql/client/http"));
		return createClient(config);
	});
	return libSqlCoreConnector({
		name: CONNECTOR_NAME,
		capabilityOverrides: { transactions: false },
		getClient,
		dispose: async () => {
			const client = await getClient.current;
			getClient.reset();
			client?.close?.();
		}
	});
}
export { CONNECTOR_DEPENDENCIES, libSqlConnector as default };
