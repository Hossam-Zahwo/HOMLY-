import { Kysely, MysqlAdapter, MysqlIntrospector, MysqlQueryCompiler, PostgresAdapter, PostgresIntrospector, PostgresQueryCompiler, SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from "kysely";
var DB0Connection = class {
	db;
	constructor(db) {
		this.db = db;
	}
	async executeQuery(compiledQuery) {
		const { sql, parameters } = compiledQuery;
		const stmt = this.db.prepare(sql);
		if (compiledQuery.query.kind === "InsertQueryNode" || compiledQuery.query.kind === "UpdateQueryNode" || compiledQuery.query.kind === "DeleteQueryNode" || compiledQuery.query.kind === "MergeQueryNode") {
			const rows = await stmt.all(...parameters);
			return {
				rows,
				numAffectedRows: rows.length > 0 ? BigInt(rows.length) : void 0
			};
		}
		return { rows: await stmt.all(...parameters) };
	}
	async *streamQuery(_compiledQuery, _chunkSize) {
		throw new Error("db0 does not support streaming queries.");
	}
};
var DB0Driver = class {
	db;
	connection;
	constructor(db) {
		this.db = db;
		this.connection = new DB0Connection(db);
	}
	async init() {}
	async acquireConnection() {
		return this.connection;
	}
	async beginTransaction() {
		await this.db.exec("BEGIN");
	}
	async commitTransaction() {
		await this.db.exec("COMMIT");
	}
	async rollbackTransaction() {
		await this.db.exec("ROLLBACK");
	}
	async releaseConnection() {}
	async destroy() {}
};
var DB0Dialect = class {
	db;
	sqlDialect;
	constructor(db) {
		this.db = db;
		this.sqlDialect = db.dialect;
	}
	createDriver() {
		return new DB0Driver(this.db);
	}
	createQueryCompiler() {
		switch (this.sqlDialect) {
			case "postgresql": return new PostgresQueryCompiler();
			case "mysql": return new MysqlQueryCompiler();
			default: return new SqliteQueryCompiler();
		}
	}
	createAdapter() {
		switch (this.sqlDialect) {
			case "postgresql": return new PostgresAdapter();
			case "mysql": return new MysqlAdapter();
			default: return new SqliteAdapter();
		}
	}
	createIntrospector(db) {
		switch (this.sqlDialect) {
			case "postgresql": return new PostgresIntrospector(db);
			case "mysql": return new MysqlIntrospector(db);
			default: return new SqliteIntrospector(db);
		}
	}
};
function kysely(db, config) {
	return new Kysely({
		...config,
		dialect: new DB0Dialect(db)
	});
}
export { kysely };
