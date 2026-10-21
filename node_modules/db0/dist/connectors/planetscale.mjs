import { BoundableStatement } from "../_chunks/statement.mjs";
import { importLib, lazyInstance } from "../_chunks/utils.mjs";
const CONNECTOR_DEPENDENCIES = { lib: {
	name: "@planetscale/database",
	version: "^1"
} };
const CONNECTOR_NAME = "planetscale";
function planetscaleConnector(opts) {
	const { lib, ...config } = opts;
	const getClient = lazyInstance(async () => {
		const { Client } = await importLib(CONNECTOR_NAME, "@planetscale/database", lib, () => import("@planetscale/database"));
		return new Client(config);
	});
	const query = async (sql, params) => (await getClient()).execute(sql, params);
	return {
		name: "planetscale",
		dialect: "mysql",
		capabilityOverrides: { transactions: false },
		getInstance: () => getClient(),
		exec: (sql) => query(sql),
		prepare: (sql) => new StatementWrapper(sql, query),
		dispose: () => {
			getClient.reset();
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
export { CONNECTOR_DEPENDENCIES, planetscaleConnector as default };
