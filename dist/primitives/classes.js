import { opendir, unlink } from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";
import { Packr } from "msgpackr";
import {} from "./types";
import { findMessage, updateMessage, deleteMessage, addForeignKeys, loadLog, binarysorted_insert, removeForeignKeys, binarysearch_mutate, findMessageByUnique, loadLogSync, validateData, resizeRCT, prepareMessage, SynFileWrit, SynFileWritWithWaitList, } from "./functions";
import { Sign, Verify } from "node:crypto";
export class Utils {
    static MANIFEST = {
        schemas: [],
        bearer: "",
        rings: [],
        EXABASE_KEYS: { privateKey: "", publicKey: "" },
        sign: undefined,
        verify: undefined,
    };
    static EXABASE_RING_STATE = {};
    static EXABASE_MANAGERS = {};
    static packr = new Packr();
    //? Regularity Cache Tank or whatever.
    static RCT = {
        none: false, //? none is default for use with identifiers that has no need to cache
    };
}
export class ExabaseError extends Error {
    constructor(...err) {
        const message = ExabaseError.geterr(err);
        super(message);
    }
    static geterr(err) {
        return String(err.join(""));
    }
}
export class Schema {
    tableName;
    RCT;
    _trx;
    columns = {};
    relationship = {};
    _unique_field = undefined;
    _foreign_field = {};
    migrationFN;
    _premature = true;
    constructor(options) {
        //? mock query
        this._trx = new Query({});
        this.tableName = options?.tableName?.trim()?.toUpperCase();
        // ? parse definitions
        if (this.tableName) {
            this._unique_field = {};
            this.RCT = options.RCT;
            this.migrationFN = options.migrationFN;
            this.columns = { ...(options?.columns || {}) };
            //? setting up _id type on initialisation
            this.columns._id = { type: String };
            //? setting up secondary types on initialisation
            //? Date
            for (const key in this.columns) {
                //? keep a easy track of relationships
                if (this.columns[key].RelationType) {
                    this.relationship[key] = this.columns[key];
                    delete this.columns[key];
                    continue;
                }
                //? adding vitual types validators for JSON, Date and likes
                // ? Date
                if (this.columns[key].type === Date) {
                    this.columns[key].type = ((d) => new Date(d).toString().includes("Inval") === false);
                }
                //? JSON
                if (this.columns[key].type === JSON) {
                    this.columns[key].type = ((d) => typeof d === "string");
                }
                //? validating default values
                if (this.columns[key].default) {
                    // ? check for type
                    if (typeof this.columns[key].default !==
                        typeof this.columns[key].type()) {
                        throw new ExabaseError(" schema property default value '", this.columns[key].default, "' for ", key, " on the ", this.tableName, " tableName has a wrong type");
                    }
                }
                //? more later
                //? let's keep a record of the unique fields we currectly have
                if (this.columns[key].unique) {
                    this._unique_field[key] = true;
                }
            }
            //? check if theres a unique key entered else make it undefined to avoid a truthiness bug
            if (Object.keys(this._unique_field).length === 0) {
                this._unique_field = undefined;
            }
        }
        // ? parse definitions end
    }
    /**
     * Exabase
     * ---
     * querys object
     * @returns {Query<Model>}
     */
    get query() {
        if (!this._premature)
            return this._trx;
        throw new ExabaseError("Schema - " +
            this.tableName +
            " is not yet connected to an Exabase Instance");
    }
    /**
     * Exabase query
     * Get the timestamp this data was inserted into the database
     * @param data
     * @returns Date
     */
    static getTimestamp(_id) {
        return new Date(parseInt(_id.slice(0, 8), 16) * 1000);
    }
}
//? this is okay because it's reusable
export class Query {
    _Manager;
    premature = true;
    constructor(Manager) {
        this._Manager = Manager;
        if (Manager) {
            this.premature = false;
        }
    }
    /**
     * Exabase query
     * find items on the database,
     * field can be _id string or unique props object
     * @param field
     * @param options
     * @returns
     */
    findMany(field, options) {
        // ? creating query payload
        const query = {
            select: typeof field === "string" ? field : "*",
        };
        // ? inputing relationship payload
        if (typeof field === "object") {
            query.select = undefined;
            let key = "", value;
            for (const k in field) {
                key = k;
                value = field[k];
                break;
            }
            const fieldT = this._Manager._schema.columns[key];
            if (fieldT && fieldT.unique) {
                query["unique"] = {
                    [key]: value,
                };
            }
            else {
                throw new ExabaseError(`column field ${key} is not unique, please try searching instead`);
            }
        }
        // ? populate options
        if (typeof options === "object") {
            query.populate = {};
            query.skip = options.skip;
            query.take = options.take;
            const fields = this._Manager._schema._foreign_field;
            if (options.populate === true) {
                for (const lab in fields) {
                    query.populate[lab] = fields[lab];
                }
            }
            else {
                if (Array.isArray(options.populate)) {
                    for (let i = 0; i < options.populate.length; i++) {
                        const lab = options.populate[0];
                        const relaName = fields[lab];
                        if (relaName) {
                            query.populate[lab] = fields[lab];
                        }
                        else {
                            throw new ExabaseError("can't POPULATE missing realtionship " + lab);
                        }
                    }
                }
            }
        }
        return this._Manager._run(query);
    }
    /**
     * Exabase query
     * find items on the database,
     * field can be _id string or unique props object
     * @param field
     * @param options
     * @returns
     */
    findOne(field, options) {
        // ? creating query payload
        const query = {
            select: typeof field === "string" ? field : undefined,
        };
        // ? inputing relationship payload
        if (typeof field === "object") {
            let key = "", value;
            for (const k in field) {
                key = k;
                value = field[k];
                break;
            }
            const fieldT = this._Manager._schema.columns[key];
            if (fieldT && fieldT.unique) {
                query["unique"] = {
                    [key]: value,
                };
            }
            else {
                throw new ExabaseError(`column field ${key} is not unique, please try searching instead`);
            }
        }
        // ? populate options
        if (typeof options === "object") {
            query.populate = {};
            const fields = this._Manager._schema._foreign_field;
            if (options.populate === true) {
                for (const lab in fields) {
                    query.populate[lab] = fields[lab];
                }
            }
            else {
                if (Array.isArray(options.populate)) {
                    for (let i = 0; i < options.populate.length; i++) {
                        const lab = options.populate[0];
                        const relaName = fields[lab];
                        if (relaName) {
                            query.populate[lab] = fields[lab];
                        }
                        else {
                            throw new ExabaseError("can't POPULATE missing realtionship " + lab);
                        }
                    }
                }
            }
        }
        return this._Manager._run(query);
    }
    /**
     * Exabase query
     * search items on the database,
     * @param searchQuery
     * @param options
     * @returns
     */
    search(searchQuery, options) {
        if (typeof searchQuery !== "object" && !Array.isArray(searchQuery))
            throw new ExabaseError("invalid search query ", searchQuery);
        let query = { search: searchQuery };
        // ? populate options
        if (typeof options === "object") {
            query.skip = options.skip;
            query.take = options.take;
            query.populate = {};
            const fields = this._Manager._schema._foreign_field;
            if (options.populate === true) {
                for (const lab in fields) {
                    query.populate[lab] = fields[lab];
                }
            }
            else {
                if (Array.isArray(options.populate)) {
                    for (let i = 0; i < options.populate.length; i++) {
                        const lab = options.populate[0];
                        const relaName = fields[lab];
                        if (relaName) {
                            query.populate[lab] = fields[lab];
                        }
                        else {
                            throw new ExabaseError("can't POPULATE missing realtionship " + lab);
                        }
                    }
                }
            }
        }
        return this._Manager._run(query);
    }
    /**
     * Exabase query
     * insert or update items on the database
     * @param data
     * @returns
     */
    save(data) {
        const hasid = typeof data?._id === "string";
        const query = {
            [hasid ? "update" : "insert"]: this._Manager._validate(data, hasid),
        };
        return this._Manager._run(query);
    }
    /**
     * Exabase query
     * delete items on the database,
     * @param _id
     * @returns
     */
    delete(_id) {
        if (typeof _id !== "string") {
            throw new ExabaseError("cannot continue with delete query '", _id, "' is not a valid Exabase _id value");
        }
        const query = {
            delete: _id,
        };
        return this._Manager._run(query);
    }
    /**
     * Exabase query
     * count items on the database
     * @returns
     */
    count(pops) {
        const query = {
            count: pops || true,
        };
        return this._Manager._run(query);
    }
    /**
     * Exabase query
     * connect relationship in the table on the database
     * @param options
     * @returns
     */
    addRelation(options) {
        const rela = this._Manager._schema.relationship[options.relationship];
        if (!rela) {
            throw new ExabaseError("No relationship definition called ", options.relationship, " on ", this._Manager._schema.tableName, " schema");
        }
        if (typeof options.foreign_id !== "string") {
            throw new ExabaseError("foreign_id field is invalid.");
        }
        const query = {
            reference: {
                _id: options._id,
                _new: true,
                type: rela.RelationType,
                foreign_id: options.foreign_id,
                relationship: options.relationship,
                foreign_table: rela.target,
            },
        };
        return this._Manager._run(query);
    }
    /**
     * Exabase query
     * disconnect relationship in the table on the database
     * @param options
     * @returns
     */
    removeRelation(options) {
        const rela = this._Manager._schema.relationship[options.relationship];
        if (!rela) {
            throw new ExabaseError("No relationship definition called ", options.relationship, " on ", this._Manager._schema.tableName, " schema");
        }
        const query = {
            reference: {
                _id: options._id,
                _new: false,
                type: rela.RelationType,
                foreign_id: options.foreign_id,
                relationship: options.relationship,
                foreign_table: rela.target,
            },
        };
        return this._Manager._run(query);
    }
    /**
     * Exabase query
     * insert or update many items on the database
     * @param data
     * @param type
     */
    saveBatch(data) {
        if (Array.isArray(data)) {
            const q = this._prepare_for(data, false);
            return this._Manager._runMany(q);
        }
        else {
            throw new ExabaseError(`Invalid inputs for .saveBatch method, data should be array.`);
        }
    }
    deleteBatch(data) {
        if (Array.isArray(data)) {
            const q = this._prepare_for(data, true);
            return this._Manager._runMany(q);
        }
        else {
            throw new ExabaseError(`Invalid inputs for .deleteBatch method, data should be array.`);
        }
    }
    _prepare_for(data, del) {
        const query = [];
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            if (del) {
                if (typeof item._id === "string") {
                    query.push({
                        delete: item._id,
                    });
                }
                else {
                    throw new ExabaseError("cannot continue with delete query '", item._id, "' is not a valid Exabase _id value");
                }
            }
            else {
                const hasid = item?._id && true;
                query.push({
                    [hasid ? "update" : "insert"]: this._Manager._validate(item, hasid),
                });
            }
        }
        return query;
    }
}
export class Manager {
    _schema;
    _name;
    _query;
    tableDir = "";
    RCTied = true;
    //? Regularity Cache Tank or whatever.
    RCT = {};
    //? number of RCTied log files
    rct_level;
    _LogFiles = {};
    _search;
    // public waiters: Record<string, (() => void)[]> = {};
    logging = false;
    // private clock_vector = { x0: null, xn: null };
    constructor(schema, level) {
        this._schema = schema;
        this._name = schema.tableName;
        this._search = new XTree({ persitKey: "" });
        this._query = new Query(this);
        schema._trx = this._query;
        //? set RCT key
        this.RCTied = schema.RCT || false;
        this.rct_level = level;
    }
    _setup(init) {
        // ? setup steps
        this.tableDir = init._exabaseDirectory + "/" + this._schema.tableName + "/";
        this.logging = init.logging;
        // ? setting up Xtree search index
        this._search = new XTree({ persitKey: this.tableDir + "XINDEX" });
        // ? setup relationship
        this._constructRelationships(init.schemas);
        //? setup table directories
        if (!existsSync(this.tableDir)) {
            mkdirSync(this.tableDir);
        }
        else {
            //? this is a chain process
            // ? first get logs from disk
            // ? recover and flush WAL
            // ? sync search index
            return this._sync_logs();
        }
    }
    waiters = {};
    acquireWrite(file) {
        return new Promise((resolve) => {
            if (!this.waiters[file]) {
                this.waiters[file] = [];
            }
            this.waiters[file].push(resolve);
            if (this.waiters[file].length === 1) {
                resolve(undefined);
            }
        });
    }
    async write(file, message, flag) {
        await this.acquireWrite(file);
        // ? do the writting by
        let messages = this.RCT[file] ?? (await loadLog(this.tableDir + file));
        if (flag === "i") {
            messages = await binarysorted_insert(message, messages);
            this._setLog(file, message._id, messages.length);
        }
        else {
            messages = await binarysearch_mutate(message, messages, flag);
            this._setLog(file, messages.at(-1)?._id || null, messages.length);
        }
        // ? update this active RCT
        if (this.RCTied) {
            this.RCT[file] = messages;
        }
        // ? synchronise writter
        await SynFileWrit(this.tableDir + file, Utils.packr.encode(messages));
        // ? update search index
        await this._search.manage(message, flag);
        //? resize RCT
        this.RCTied && resizeRCT(this.rct_level, this.RCT);
        // ? adjusting the wait list
        this.waiters[file].shift();
        if (this.waiters[file].length > 0) {
            this.waiters[file][0](undefined);
        }
        return message;
    }
    async _sync_logs() {
        const dir = await opendir(this.tableDir);
        const logfiles = [];
        let size = 0;
        for await (const dirent of dir) {
            // ? here we destroy invalid sync files, availability of such files
            // ? signifies an application crash stopping exabase from completing a commit
            // ? the commit operation can then be restarted from the wal files still in the wal directory
            if (dirent.name.includes("-SYNC")) {
                await unlink(this.tableDir + dirent.name).catch(() => { });
                continue;
            }
            if (dirent.isFile()) {
                const fn = dirent.name;
                logfiles.push(fn);
                // ! check for this files keys, some are probably not used anymore
                // ? f = foreign, u = unique, x = search indexes
                if ("FINDEX-UINDEX-XINDEX".includes(fn)) {
                    continue;
                }
                const LOG = await loadLog(this.tableDir + dirent.name);
                const last_id = LOG.at(-1)?._id || "";
                this._LogFiles[fn] = { last_id, size: LOG.length };
                size += LOG.length;
            }
        }
        await this._sync_searchindex(size);
    }
    async _sync_searchindex(size) {
        // ? search index columns checks
        // ? index  validation
        if (!this._search.confirmLength(size)) {
            console.log("Re-calculating search index due to changes in log size");
            this._search.restart(); //? reset indexes to zero
            //? index all available items
            for (const file in this._LogFiles) {
                const LOG = await loadLog(this.tableDir + file);
                const ln = LOG.length;
                for (let i = 0; i < ln; i++) {
                    this._search.insert(LOG[i]);
                }
            }
        }
    }
    _getReadingLog(logId) {
        if (logId === "*") {
            return "LOG-" + Object.keys(this._LogFiles).length;
        }
        for (const filename in this._LogFiles) {
            const logFile = this._LogFiles[filename];
            //? getting log file name for read operations
            if (String(logFile.last_id) > logId || logFile.last_id === logId) {
                return filename;
            }
            //? getting log file name for inset operation
            if (!logFile.last_id) {
                return filename;
            }
            if (logFile.size < 32768 /*size check is for inserts*/) {
                return filename;
            }
        }
        return "LOG-" + Object.keys(this._LogFiles).length;
    }
    _getInsertLog() {
        for (const filename in this._LogFiles) {
            const logFile = this._LogFiles[filename];
            //? size check is for inserts
            if (logFile.size < 32768) {
                return filename;
            }
        }
        //? Create a new log file with an incremented number of LOGn filename
        const nln = Object.keys(this._LogFiles).length + 1;
        const lfid = "LOG-" + nln;
        this._LogFiles[lfid] = { last_id: lfid, size: 0 };
        return lfid;
    }
    _setLog(fn, last_id, size) {
        this._LogFiles[fn] = { last_id, size };
    }
    _constructRelationships(allSchemas) {
        if (this._schema.tableName) {
            //? keep a easy track of relationships
            if (this._schema.relationship) {
                this._schema._foreign_field = {};
                for (const key in this._schema.relationship) {
                    if (typeof this._schema.relationship[key].target === "string") {
                        const namee = this._schema.relationship[key].target.toUpperCase();
                        const findschema = allSchemas.find((schema) => schema.tableName === namee);
                        if (findschema) {
                            this._schema._foreign_field[key] = namee;
                        }
                        else {
                            throw new ExabaseError(" tableName:", namee, " not found on any schema, please recheck the relationship definition of the ", this._schema.tableName, " schema");
                        }
                    }
                    else {
                        throw new ExabaseError(" Error on schema ", this._schema.tableName, " relationship target must be a string ");
                    }
                }
            }
        }
    }
    _validate(data, update) {
        const v = validateData(data, this._schema.columns);
        if (typeof v === "string") {
            console.log({ data, cols: this._schema.columns });
            throw new ExabaseError(update ? "insert" : "update", " on table :", this._schema.tableName, " aborted, reason - ", v);
        }
        if (!data._id && update) {
            throw new ExabaseError("update on table :", this._schema.tableName, " aborted, reason - _id is required");
        }
        return v;
    }
    async _select(query) {
        //? creating a relationship map if needed
        if (Array.isArray(query.select.relationship)) {
            const rela = {};
            for (let i = 0; i < query.select.relationship.length; i++) {
                const r = query.select.relationship;
                rela[r] = this._schema.relationship[r].target;
            }
            query.select.relationship = rela;
        }
        const file = this._getReadingLog(query.select);
        let RCTied = this.RCT[file];
        if (!RCTied) {
            RCTied = await loadLog(this.tableDir + file);
            if (this.RCTied) {
                this.RCT[file] = RCTied;
            }
        }
        if (query.select === "*")
            return RCTied;
        return findMessage(this.tableDir, query, RCTied);
    }
    async _trx_runner(query) {
        if (query["select"]) {
            return this._select(query);
        }
        if (query["insert"]) {
            const message = await prepareMessage(this.tableDir, this._schema._unique_field, query.insert);
            const file = this._getInsertLog();
            return this.write(file, message, "i");
        }
        if (query["update"]) {
            const message = await updateMessage(this.tableDir, this._schema._unique_field, query.update);
            const file = this._getReadingLog(message._id);
            return this.write(file, message, "u");
        }
        if (query["search"]) {
            const indexes = this._search.search(query.search, query.take);
            const searches = indexes.map((_id) => this._select({
                select: _id,
                populate: query.populate,
            }));
            return Promise.all(searches);
        }
        if (query["unique"]) {
            const select = await findMessageByUnique(this.tableDir + "UINDEX", this._schema._unique_field, query.unique);
            if (select) {
                const file = this._getReadingLog(select);
                return findMessage(this.tableDir, {
                    select,
                    populate: query.populate,
                }, this.RCT[file] ?? (await loadLog(this.tableDir + file)));
            }
            else {
                return [];
            }
        }
        if (query["count"]) {
            if (query["count"] === true) {
                //? we can get count right here
                let size = 0;
                const obj = Object.values(this._LogFiles);
                for (let c = 0; c < obj.length; c++) {
                    const element = obj[c];
                    size += element.size;
                }
                return size;
            }
            else {
                return this._search.count(query["count"]);
            }
        }
        if (query["delete"]) {
            const file = this._getReadingLog(query.delete);
            const message = await deleteMessage(query.delete, this.tableDir, this._schema._unique_field, this._schema.relationship ? true : false, this.tableDir + file, this.RCT[file] ?? (await loadLog(this.tableDir + file)));
            if (message) {
                return this.write(file, message, "d");
            }
        }
        if (query["reference"] && query["reference"]._new) {
            const file = this._getReadingLog(query.reference._id);
            return addForeignKeys(this.tableDir + file, query.reference, this.RCT[file]);
        }
        if (query["reference"]) {
            const file = this._getReadingLog(query.reference._id);
            return removeForeignKeys(this.tableDir + file, query.reference);
        }
    }
    _runMany(query) {
        // ? log the query
        if (this.logging)
            console.log({ query, table: this._name });
        //? create run trx(s)
        if (query.length) {
            // console.log({ logs: this._LogFiles, rcts: this.RCT, query });
            // console.log("-------------------------------------------------- >>>");
            return Promise.all(query.map((q) => this._trx_runner(q)));
        }
    }
    _run(query) {
        if (this.logging)
            console.log({ query, table: this._name });
        //? create and run TRX
        // console.log({ logs: this._LogFiles, rcts: this.RCT, query });
        // console.log("-------------------------------------------------- >>>");
        return this._trx_runner(query);
    }
}
class XNode {
    constructor(keys) {
        this.keys = keys || [];
    }
    keys = [];
    insert(value, index) {
        let low = 0;
        let high = this.keys.length - 1;
        for (; low <= high;) {
            const mid = Math.floor((low + high) / 2);
            const current = this.keys[mid].value;
            if (current === value) {
                this.keys[mid].indexes.push(index);
                return;
            }
            if (current < value) {
                low = mid + 1;
            }
            else {
                high = mid - 1;
            }
        }
        this.keys.splice(low, 0, { value, indexes: [index] });
    }
    disert(value, index) {
        let left = 0;
        let right = this.keys.length - 1;
        for (; left <= right;) {
            const mid = Math.floor((left + right) / 2);
            const current = this.keys[mid].value;
            if (current === value) {
                this.keys[mid].indexes = this.keys[mid].indexes.filter((a) => a !== index);
                return;
            }
            else if (current < value) {
                left = mid + 1;
            }
            else {
                right = mid - 1;
            }
        }
    }
    upsert(value, index) {
        this.disert(value, index);
        this.insert(value, index);
    }
    search(value) {
        let left = 0;
        let right = this.keys.length - 1;
        for (; left <= right;) {
            const mid = Math.floor((left + right) / 2);
            const current = this.keys[mid].value;
            if (current === value ||
                (typeof current === "string" && current.includes(value))) {
                return this.keys[mid].indexes;
            }
            else if (current < value) {
                left = mid + 1;
            }
            else {
                right = mid - 1;
            }
        }
        return [];
    }
}
export class XTree {
    base = [];
    mutatingBase = false;
    persitKey;
    tree = {};
    constructor(init) {
        this.persitKey = init.persitKey;
        const [base, tree] = XTree.restore(init.persitKey);
        if (base) {
            this.base = base;
            this.tree = tree;
        }
    }
    restart() {
        this.base = [];
        this.tree = {};
    }
    search(search, take = Infinity, skip = 0) {
        const results = [];
        for (const key in search) {
            if (this.tree[key]) {
                const indexes = this.tree[key].search(search[key]);
                if (skip && results.length >= skip) {
                    results.splice(0, skip);
                    skip = 0;
                }
                results.push(...(indexes || []).map((idx) => this.base[idx]));
                if (results.length >= take)
                    break;
            }
        }
        if (results.length >= take)
            return results.slice(0, take);
        return results;
    }
    searchBase(_id) {
        let left = 0;
        let right = this.base.length - 1;
        for (; left <= right;) {
            const mid = Math.floor((left + right) / 2);
            const current = this.base[mid];
            if (current === _id) {
                return mid;
            }
            else if (current < _id) {
                left = mid + 1;
            }
            else {
                right = mid - 1;
            }
        }
        return;
    }
    count(search) {
        let resultsCount = 0;
        for (const key in search) {
            if (this.tree[key]) {
                resultsCount += this.tree[key].search(search[key]).length;
            }
        }
        return resultsCount;
    }
    confirmLength(size) {
        return this.base.length === size;
    }
    manage(trx, flag) {
        switch (flag) {
            case "i":
                return this.insert(trx);
            case "u":
                return this.upsert(trx);
            case "d":
            case "n":
                return;
            default:
                console.error("boohoo", { trx });
                return;
        }
    }
    async insert(data, bulk = false) {
        if (!data["_id"])
            throw new Error("bad insert");
        if (!this.mutatingBase) {
            this.mutatingBase = true;
        }
        else {
            setImmediate(() => {
                this.insert(data, bulk);
            });
            return;
        }
        // ? save keys in their corresponding nodes
        if (typeof data === "object" && !Array.isArray(data)) {
            for (const key in data) {
                if ("_wal_ignore_flag-_id".includes(key))
                    continue;
                if (!this.tree[key]) {
                    this.tree[key] = new XNode();
                }
                this.tree[key].insert(data[key], this.base.length);
            }
            this.base.push(data["_id"]);
            this.mutatingBase = false;
        }
        if (!bulk)
            await this.persit();
    }
    async disert(data, bulk = false) {
        if (!data["_id"])
            throw new Error("bad insert");
        if (!this.mutatingBase) {
        }
        else {
            setImmediate(() => {
                this.disert(data, bulk);
            });
            return;
        }
        const index = this.searchBase(data["_id"]);
        if (index === undefined)
            return;
        if (typeof data === "object" && !Array.isArray(data)) {
            for (const key in data) {
                if (key === "_id" || !this.tree[key])
                    continue;
                this.tree[key].disert(data[key], index);
            }
            this.mutatingBase = true;
            this.base.splice(index, 1);
            this.mutatingBase = false;
        }
        if (!bulk)
            await this.persit();
    }
    async upsert(data, bulk = false) {
        if (!data["_id"])
            throw new Error("bad insert");
        if (!this.mutatingBase) {
        }
        else {
            setImmediate(() => {
                this.upsert(data, bulk);
            });
            return;
        }
        const index = this.searchBase(data["_id"]);
        if (index === undefined)
            return;
        if (typeof data === "object" && !Array.isArray(data)) {
            for (const key in data) {
                if (key === "_id")
                    continue;
                if (!this.tree[key]) {
                    this.tree[key] = new XNode();
                }
                this.tree[key].upsert(data[key], index);
            }
        }
        this.mutatingBase = true;
        if (!bulk)
            await this.persit();
        this.mutatingBase = false;
    }
    persit() {
        const obj = {};
        const keys = Object.keys(this.tree);
        for (let index = 0; index < keys.length; index++) {
            obj[keys[index]] = this.tree[keys[index]].keys;
        }
        return SynFileWritWithWaitList.write(this.persitKey, Utils.packr.encode({
            base: this.base,
            tree: obj,
        }));
    }
    static restore(persitKey) {
        const data = loadLogSync(persitKey);
        const tree = {};
        if (data.tree) {
            for (const key in data.tree) {
                tree[key] = new XNode(data.tree[key]);
            }
        }
        return [data.base, tree];
    }
}