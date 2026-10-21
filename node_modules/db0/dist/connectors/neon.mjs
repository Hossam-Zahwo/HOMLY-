import { BoundableStatement } from "../_chunks/statement.mjs";
import { importLib, lazyInstance } from "../_chunks/utils.mjs";
import { normalizeParams } from "../_chunks/postgresql.mjs";
const CONNECTOR_DEPENDENCIES = { lib: {
	name: "@neondatabase/serverless",
	version: "^1"
} };
const CONNECTOR_NAME = "neon";
function neonConnector(opts) {
	const { lib, url, ...config } = opts || {};
	const getClient = lazyInstance(async () => {
		if (url) config.connectionString = url;
		if (!config.connectionString && !config.host) throw new Error(`[db0] [${CONNECTOR_NAME}] Missing connection string. Pass \`url\` or a \`host\` to the connector.`);
		const client = new (await (importLib(CONNECTOR_NAME, "@neondatabase/serverless", lib, () => import("@neondatabase/serverless")))).Client(config);
		await client.connect();
		return client;
	});
	const query = async (sql, params) => {
		return (await getClient()).query(normalizeParams(sql), params);
	};
	return {
		name: CONNECTOR_NAME,
		dialect: "postgresql",
		getInstance: () => getClient(),
		exec: (sql) => query(sql),
		prepare: (sql) => new StatementWrapper(sql, query),
		dispose: async () => {
			const client = await getClient.current?.catch(() => void 0);
			getClient.reset();
			await client?.end?.();
		}
	};
}
var StatementWrapper = class extends BoundableStatement {
	#query;
	#sql;
	constructor(sql, query) {
		super();
		this.#sql = sql;
		this.#query = query;
	}
	async all(...params) {
		return (await this.#query(this.#sql, params)).rows;
	}
	async run(...params) {
		return {
			success: true,
			...await this.#query(this.#sql, params)
		};
	}
	async get(...params) {
		return (await this.#query(this.#sql, params)).rows[0];
	}
};
export { CONNECTOR_DEPENDENCIES, neonConnector as default };
