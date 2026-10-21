import { BoundableStatement } from "../_chunks/statement.mjs";
import { importLib, lazyInstance } from "../_chunks/utils.mjs";
import { normalizeParams } from "../_chunks/postgresql.mjs";
const CONNECTOR_DEPENDENCIES = { lib: {
	name: "@electric-sql/pglite",
	version: "^0.3 || ^0.4 || ^0.5"
} };
const CONNECTOR_NAME = "pglite";
function pgliteConnector(opts) {
	const { lib, ...config } = opts || {};
	const getClient = lazyInstance(async () => {
		const { PGlite } = await importLib(CONNECTOR_NAME, "@electric-sql/pglite", lib, () => import("@electric-sql/pglite"));
		return PGlite.create(config);
	});
	const query = async (sql, params) => {
		const client = await getClient();
		const normalizedSql = normalizeParams(sql);
		return await client.query(normalizedSql, params);
	};
	return {
		name: "pglite",
		dialect: "postgresql",
		getInstance: () => getClient(),
		exec: (sql) => query(sql),
		prepare: (sql) => new StatementWrapper(sql, query),
		dispose: async () => {
			const client = await getClient.current;
			getClient.reset();
			await client?.close?.();
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
export { CONNECTOR_DEPENDENCIES, pgliteConnector as default };
