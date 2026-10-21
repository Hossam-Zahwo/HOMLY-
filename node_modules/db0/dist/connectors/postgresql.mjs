import { BoundableStatement } from "../_chunks/statement.mjs";
import { importLib, interopDefault, lazyInstance } from "../_chunks/utils.mjs";
import { normalizeParams } from "../_chunks/postgresql.mjs";
const CONNECTOR_DEPENDENCIES = { lib: {
	name: "pg",
	version: "^8"
} };
const CONNECTOR_NAME = "postgresql";
function postgresqlConnector(opts) {
	const { lib, ...config } = opts;
	const getClient = lazyInstance(async () => {
		const client = new (interopDefault(await importLib(CONNECTOR_NAME, "pg", lib, () => import("pg")))).Client("url" in config ? config.url : config);
		await client.connect();
		return client;
	});
	const query = async (sql, params) => {
		return (await getClient()).query(normalizeParams(sql), params);
	};
	return {
		name: "postgresql",
		dialect: "postgresql",
		getInstance: () => getClient(),
		exec: (sql) => query(sql),
		prepare: (sql) => new StatementWrapper(sql, query),
		dispose: async () => {
			const client = await getClient.current;
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
export { CONNECTOR_DEPENDENCIES, postgresqlConnector as default };
