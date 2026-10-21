const columnTypes = {
	Int32: 0,
	Int64: 1,
	Float: 2,
	Double: 3,
	Numeric: 4,
	Boolean: 5,
	Text: 7,
	DateTime: 10,
	Json: 11,
	Bytes: 13,
	UnknownNumber: 128
};
const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
const getProviderFromDialect = (dialect) => {
	switch (dialect) {
		case "postgresql": return "postgres";
		case "libsql": return "sqlite";
		default: return dialect;
	}
};
const inferColumnType = (value) => {
	switch (typeof value) {
		case "bigint": return columnTypes.Int64;
		case "boolean": return columnTypes.Boolean;
		case "number": return Number.isInteger(value) && value >= INT32_MIN && value <= INT32_MAX ? columnTypes.Int32 : columnTypes.Double;
		case "string": return columnTypes.Text;
		case "object":
			if (value instanceof Date) return columnTypes.DateTime;
			if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) return columnTypes.Bytes;
			return columnTypes.Json;
		default: return columnTypes.UnknownNumber;
	}
};
const toResultSet = (rows) => {
	const columnNames = Object.keys(rows[0] || {});
	const values = rows.map((row) => columnNames.map((name) => row[name]));
	return {
		columnNames,
		columnTypes: columnNames.map((_name, index) => {
			const row = values.find((value) => value[index] != null);
			return row === void 0 ? columnTypes.UnknownNumber : inferColumnType(row[index]);
		}),
		rows: values
	};
};
const decodeBase64 = (value) => {
	if (typeof Buffer !== "undefined") return Buffer.from(value, "base64");
	const binary = atob(value);
	return Uint8Array.from(binary, (char) => char.codePointAt(0));
};
const getQueryArgs = (query, dialect) => {
	const isSqlite = dialect === "sqlite" || dialect === "libsql";
	return (query.args || []).map((arg, index) => {
		if (arg === null || arg === void 0) return null;
		const scalarType = query.argTypes?.[index]?.scalarType ?? "unknown";
		if (typeof arg === "string") switch (scalarType) {
			case "int": return Number.parseInt(arg, 10);
			case "decimal":
			case "float": return Number.parseFloat(arg);
			case "bigint": return BigInt(arg);
			case "bytes": return decodeBase64(arg);
			case "datetime": return isSqlite ? arg : new Date(arg);
			default: return arg;
		}
		if (typeof arg === "boolean") return isSqlite ? arg ? 1 : 0 : arg;
		if (arg instanceof Date) return isSqlite ? arg.toISOString() : arg;
		return arg;
	});
};
const getAffectedRows = (result) => {
	const res = result;
	if (!res) return 0;
	const count = res.changes ?? res.rowCount ?? res.affectedRows ?? res.rowsAffected ?? res.meta?.changes;
	return typeof count === "bigint" ? Number(count) : count || 0;
};
const adapterName = "db0";
var DriverAdapterError = class extends Error {
	name = "DriverAdapterError";
	constructor(cause) {
		super("Driver adapter error");
		this.cause = cause;
	}
};
const createMutex = () => {
	let last = Promise.resolve();
	return () => {
		let release;
		const next = new Promise((resolve) => {
			release = resolve;
		});
		const acquired = last.then(() => release);
		last = last.then(() => next);
		return acquired;
	};
};
function prisma(db) {
	const acquire = createMutex();
	const provider = getProviderFromDialect(db.dialect);
	const queryable = {
		adapterName,
		provider,
		queryRaw: async (params) => {
			const rows = await db.prepare(params.sql).all(...getQueryArgs(params, db.dialect));
			return toResultSet(rows);
		},
		executeRaw: async (params) => {
			const res = await db.prepare(params.sql).run(...getQueryArgs(params, db.dialect));
			return getAffectedRows(res);
		}
	};
	const adapter = {
		...queryable,
		executeScript: async (script) => {
			await db.exec(script);
		},
		dispose: () => db.dispose()
	};
	const startTransaction = async (isolationLevel) => {
		if (!db.capabilities.transactions) throw new Error(`The \`${db.connector}\` connector does not support transactions.`);
		if (provider === "sqlite" && isolationLevel && isolationLevel !== "SERIALIZABLE") throw new DriverAdapterError({
			kind: "InvalidIsolationLevel",
			level: isolationLevel
		});
		const release = await acquire();
		try {
			await db.exec("BEGIN");
		} catch (error) {
			release();
			throw error;
		}
		let settled = false;
		const end = () => {
			if (!settled) {
				settled = true;
				release();
			}
			return Promise.resolve();
		};
		return {
			...queryable,
			options: { usePhantomQuery: false },
			commit: end,
			rollback: end
		};
	};
	return {
		adapterName,
		provider,
		connect: () => Promise.resolve({
			...adapter,
			startTransaction
		})
	};
}
export { prisma };
