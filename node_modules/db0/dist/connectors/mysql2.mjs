import { BoundableStatement } from "../_chunks/statement.mjs";
import { importLib, lazyInstance } from "../_chunks/utils.mjs";
const CONNECTOR_DEPENDENCIES = { lib: {
	name: "mysql2",
	import: "mysql2/promise",
	version: "^3"
} };
const CONNECTOR_NAME = "mysql2";
function mysqlConnector(opts) {
	const { lib, ...config } = opts;
	const getConnection = lazyInstance(async () => {
		return (await importLib(CONNECTOR_NAME, "mysql2/promise", lib, () => import("mysql2/promise"))).createConnection({ ...config });
	});
	const query = (sql, params) => getConnection().then((c) => c.query(sql, params)).then((res) => res[0]);
	return {
		name: "mysql",
		dialect: "mysql",
		getInstance: () => getConnection(),
		exec: (sql) => query(sql),
		prepare: (sql) => new StatementWrapper(sql, query),
		dispose: async () => {
			const connection = await getConnection.current;
			getConnection.reset();
			await connection?.end?.();
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
		return await this.#query(this.#sql, params);
	}
	async run(...params) {
		return {
			success: true,
			...await this.#query(this.#sql, params)
		};
	}
	async get(...params) {
		return (await this.#query(this.#sql, params))[0];
	}
};
export { CONNECTOR_DEPENDENCIES, mysqlConnector as default };
