import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { opendir, unlink, copyFile, rename, readFile, writeFile } from 'node:fs/promises';
import { Packr } from 'msgpackr';
import { randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { freemem } from 'node:os';

// src/index.ts
var readDataFromFile = async (RCT_KEY, filePath) => {
  if (Utils.RCT[RCT_KEY]) {
    if (Utils.RCT[RCT_KEY][filePath]) {
      return Utils.RCT[RCT_KEY][filePath];
    }
  }
  try {
    const data = await readFile(filePath);
    const d = Utils.packr.decode(data) || [];
    if (Utils.RCT[RCT_KEY] !== false) {
      Utils.RCT[RCT_KEY][filePath] = d;
    }
    return d;
  } catch (error) {
    return [];
  }
};
var readDataFromFileSync = (filePath) => {
  try {
    const data = readFileSync(filePath);
    const d = Utils.packr.decode(data) || [];
    return d;
  } catch (error) {
    return [];
  }
};
var writeDataToFile = (filePath, data) => {
  return writeFile(filePath, Utils.packr.encode(data));
};
async function updateMessage(dir, _unique_field, message) {
  if (_unique_field) {
    const someIdex = await findIndex(dir + "UINDEX", _unique_field, message);
    if (Array.isArray(someIdex) && someIdex[1] !== message._id) {
      throw new ExabaseError(
        "UPDATE on table :",
        dir,
        " aborted, reason - unique field's ",
        someIdex[0],
        " value ",
        someIdex[1],
        " exists!"
      );
    }
  }
  if (_unique_field) {
    await updateIndex(dir, _unique_field, message);
  }
  message._wal_flag = "u";
  return message;
}
async function insertMessage(dir, _unique_field, message) {
  if (_unique_field) {
    const someIdex = await findIndex(dir + "UINDEX", _unique_field, message);
    if (Array.isArray(someIdex)) {
      throw new ExabaseError(
        "INSERT on table :",
        dir,
        " aborted, reason - unique field's '",
        someIdex[0],
        "' value '",
        someIdex[1],
        "' exists!"
      );
    }
  }
  message._id = generate_id();
  message._wal_flag = "i";
  if (_unique_field) {
    await updateIndex(dir, _unique_field, message);
  }
  return message;
}
async function deleteMessage(_id, dir, _unique_field, RCT_KEY, fn) {
  const message = await findMessage(RCT_KEY, dir + fn, {
    select: _id
  });
  if (_unique_field) {
    if (message) {
      await dropIndex(dir, message, _unique_field);
    }
  }
  if (message) {
    message._wal_flag = "d";
  }
  return message;
}
async function findMessages(RCT_KEY, fileName, fo) {
  const { select, take, skip, populate } = fo;
  let messages = await readDataFromFile(RCT_KEY, fileName);
  if (select === "*") {
    if (skip) {
      messages.splice(0, skip);
    }
    if (take) {
      messages = messages.slice(0, take);
    }
    if (populate) {
      const _med = messages.map(async (m) => {
        const _foreign = await populateForeignKeys(fileName, m._id, populate);
        for (const key in _foreign) {
          m[key] = _foreign[key];
        }
        return m;
      });
      messages = await Promise.all(_med);
    }
    return messages;
  }
  let left = 0;
  let right = messages.length - 1;
  let mid = Math.floor((left + right) / 2);
  let midId = messages[mid]?._id;
  while (left <= right) {
    mid = Math.floor((left + right) / 2);
    midId = messages[mid]._id;
    if (midId === select) {
      const message = messages[mid];
      if (populate) {
        const _foreign = await populateForeignKeys(
          fileName,
          message._id,
          populate
        );
        for (const key in _foreign) {
          message[key] = _foreign[key];
        }
      }
      return message;
    } else if (midId < select) {
      left = mid + 1;
    } else if (midId === void 0) {
      return void 0;
    } else {
      right = mid - 1;
    }
  }
  return;
}
async function findMessage(RCT_KEY, fileName, fo) {
  const { select, populate } = fo;
  let messages = await readDataFromFile(RCT_KEY, fileName);
  let left = 0;
  let right = messages.length - 1;
  let mid = Math.floor((left + right) / 2);
  let midId = messages[mid]?._id;
  while (left <= right) {
    mid = Math.floor((left + right) / 2);
    midId = messages[mid]._id;
    if (midId === select) {
      const message = messages[mid];
      if (populate) {
        const _foreign = await populateForeignKeys(
          fileName,
          message._id,
          populate
        );
        for (const key in _foreign) {
          message[key] = _foreign[key];
        }
      }
      return message;
    } else if (midId < select) {
      left = mid + 1;
    } else if (midId === void 0) {
      return void 0;
    } else {
      right = mid - 1;
    }
  }
  return;
}
var addForeignKeys = async (RCT_KEY, fileName, reference) => {
  const message = await findMessage(RCT_KEY, fileName, {
    select: reference._id
  });
  if (!message) {
    throw new ExabaseError(
      "Adding relation on table :",
      RCT_KEY,
      " aborted, reason - item _id '",
      reference._id,
      "' not found!"
    );
  }
  const foreign_message = await Utils.EXABASE_MANAGERS[reference.foreign_table.toUpperCase()]._transaction.find(reference.foreign_id);
  if (!foreign_message) {
    throw new ExabaseError(
      "Adding relation on table :",
      RCT_KEY,
      " aborted, reason - foreign_id '",
      reference.foreign_id,
      "' from foreign table '",
      reference.foreign_table,
      "' via it's relationship '",
      reference.relationship,
      "' not found!"
    );
  }
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FINDEX";
  let messages = await readDataFromFile(
    "none",
    fileName
  );
  if (Array.isArray(messages)) {
    messages = {};
  }
  let messageX = messages[reference._id];
  if (typeof messageX !== "object") {
    messageX = {};
  }
  if (reference.type === "ONE") {
    messageX[reference.relationship] = reference.foreign_id;
  } else {
    if (Array.isArray(messageX[reference.relationship])) {
      if (messageX[reference.relationship].indexOf(
        reference.foreign_id
      ) === -1) {
        messageX[reference.relationship].push(
          reference.foreign_id
        );
      }
    } else {
      messageX[reference.relationship] = [reference.foreign_id];
    }
  }
  messages[reference._id] = messageX;
  await FileLockTable.write(fileName, messages);
};
var populateForeignKeys = async (fileName, _id, relationships) => {
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FINDEX";
  let messages = await readDataFromFile(
    "none",
    fileName
  );
  if (Array.isArray(messages)) {
    messages = {};
  }
  const rela = {};
  if (relationships) {
    for (const relationship in relationships) {
      if (messages[_id] && messages[_id][relationship]) {
        const fk = messages[_id][relationship];
        if (fk) {
          if (Array.isArray(fk)) {
            const marray = fk.map(async (id) => {
              return Utils.EXABASE_MANAGERS[relationships[relationship]]._transaction.find(id);
            });
            const msgs = await Promise.all(marray);
            rela[relationship] = msgs.flat();
          } else {
            const msgs = await Utils.EXABASE_MANAGERS[relationships[relationship].toUpperCase()]._transaction.find(fk);
            rela[relationship] = msgs;
          }
        }
      }
    }
  }
  return rela;
};
var removeForeignKeys = async (fileName, reference) => {
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FINDEX";
  const messages = await readDataFromFile(
    "none",
    fileName
  );
  if (messages[reference._id]) {
    if (Array.isArray(messages[reference._id][reference.relationship])) {
      messages[reference._id][reference.relationship] = messages[reference._id][reference.relationship].filter((item) => item !== reference.foreign_id);
    } else {
      delete messages[reference._id][reference.relationship];
    }
    await FileLockTable.write(fileName, messages);
  }
};
var updateIndex = async (fileName, _unique_field, message) => {
  fileName = fileName.split("/").slice(0, 2).join("/") + "/UINDEX";
  let messages = await readDataFromFile(
    "none",
    fileName
  );
  if (Array.isArray(messages)) {
    messages = {};
  }
  for (const type in _unique_field) {
    if (!messages[type]) {
      messages[type] = {};
    }
    messages[type][message[type]] = message._id;
  }
  await FileLockTable.write(fileName, messages);
};
var findIndex = async (fileName, _unique_field, data) => {
  let messages = await readDataFromFile(
    "none",
    fileName
  );
  if (Array.isArray(messages)) {
    return false;
  }
  for (const uf in _unique_field) {
    if (!messages[uf]) {
      return false;
    }
    if (messages[uf][data[uf]]) {
      return [uf, messages[uf][data[uf]]];
    }
  }
  return false;
};
var findMessageByUnique = async (fileName, _unique_field, data) => {
  let messages = await readDataFromFile(
    "none",
    fileName
  );
  if (Array.isArray(messages)) {
    return void 0;
  }
  for (const uf in _unique_field) {
    if (!messages[uf]) {
      return void 0;
    }
    if (messages[uf][data[uf]]) {
      return messages[uf][data[uf]];
    }
  }
  return void 0;
};
var dropIndex = async (fileName, data, _unique_field) => {
  if (!_unique_field) {
    return;
  }
  let messages = await readDataFromFile(
    "none",
    fileName
  );
  if (Array.isArray(messages)) {
    messages = {};
  }
  for (const key in _unique_field) {
    if (!messages[key]) {
      continue;
    }
    delete messages[key][data[key]];
  }
  await FileLockTable.write(fileName + "/UINDEX", messages);
};
var binarysearch_mutate = async (message, messages) => {
  const _id = message._id;
  let left = 0;
  let right = messages.length - 1;
  for (; left <= right; ) {
    const mid = Math.floor((left + right) / 2);
    const midId = messages[mid]._id;
    if (midId === _id) {
      if (message._wal_flag === "u") {
        delete message._wal_flag;
        messages[mid] = message;
      }
      if (message._wal_flag === "d") {
        messages.splice(mid, 1);
      }
      break;
    } else if (midId < _id) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return messages;
};
var binarysorted_insert = async (message, messages) => {
  const _id = message._id;
  let low = 0;
  let high = messages.length - 1;
  for (; low <= high; ) {
    const mid = Math.floor((low + high) / 2);
    const current = messages[mid]._id;
    if (current < _id) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  delete message._wal_flag;
  messages.splice(low, 0, message);
  return messages;
};
var PROCESS_UNIQUE = randomBytes(5);
var index = ~~(Math.random() * 16777215);
var generate_id = () => {
  const time = ~~(Date.now() / 1e3);
  const inc = index = (index + 1) % 16777215;
  const buffer = Buffer.alloc(12);
  buffer[3] = time & 255;
  buffer[2] = time >> 8 & 255;
  buffer[1] = time >> 16 & 255;
  buffer[0] = time >> 24 & 255;
  buffer[4] = PROCESS_UNIQUE[0];
  buffer[5] = PROCESS_UNIQUE[1];
  buffer[6] = PROCESS_UNIQUE[2];
  buffer[7] = PROCESS_UNIQUE[3];
  buffer[8] = PROCESS_UNIQUE[4];
  buffer[11] = inc & 255;
  buffer[10] = inc >> 8 & 255;
  buffer[9] = inc >> 16 & 255;
  return buffer.toString("hex");
};
var FileLockTable = {
  table: {},
  async write(fileName, content) {
    if (this.table[fileName] === true) {
      setImmediate(() => {
        this.write(fileName, content);
      });
    } else {
      this.table[fileName] = true;
      await this._run(fileName, content);
      this.table[fileName] = false;
    }
  },
  async _run(fileName, content) {
    const fcpn = fileName + "_COPY";
    if (existsSync(fileName)) {
      await copyFile(fileName, fcpn);
      await writeDataToFile(fcpn, content);
    } else {
      if (existsSync(fcpn)) {
        await unlink(fcpn);
      }
      await writeDataToFile(fcpn, content);
    }
    await rename(fcpn, fileName);
  }
};
function validateData(data = {}, schema = {}) {
  let info = {};
  if (typeof data !== "object") {
    info = " data is invalid " + data;
  }
  for (const [prop, value] of Object.entries(schema)) {
    const { type, length, width, nullable } = value;
    info[prop] = data[prop] || value.default || null;
    if (prop === "_id") {
      continue;
    }
    if ((data[prop] === void 0 || data[prop] === null) && nullable) {
      continue;
    }
    if ((data[prop] === void 0 || data[prop] === null) && !nullable) {
      if (!value.default) {
        info = `${prop} is required`;
        break;
      }
    }
    if (typeof data[prop] !== "undefined") {
      if (typeof data[prop] === "string" && data[prop].trim() === "" && nullable) {
        info = `${prop} cannot be empty `;
        break;
      }
      if (typeof type === "function" && typeof data[prop] !== typeof type()) {
        info = `${prop} type is invalid ${typeof data[prop]}`;
        break;
      }
      if (width && !Number.isNaN(Number(data[prop])) && Number(data[prop]) < width) {
        info = `Given ${prop} must not be lesser than ${width}`;
        break;
      }
      if (length && typeof data[prop] === "string" && data[prop].length > length) {
        info = `${prop} is more than ${length} characters `;
      }
    }
  }
  return info;
}
var getComputedUsage = (allowedUsagePercent, schemaLength) => {
  const nuPerc = (p) => p / 1500;
  const usableGB = freemem() * nuPerc(allowedUsagePercent || 10);
  const usableManagerGB = usableGB / (schemaLength || 1);
  return usableManagerGB;
};

// src/primitives/classes.ts
var Utils = class {
  static {
    this.MANIFEST = {
      name: "Exabase",
      port: 8080,
      schemas: [],
      mode: "REPLICATION",
      extension_level: 1,
      ringbearers: []
    };
  }
  static {
    this.EXABASE_MANAGERS = {};
  }
  static {
    this.packr = new Packr();
  }
  static {
    //? Regularity Cache Tank or whatever.
    this.RCT = {
      none: false
      //? none is default for use with identifiers that has no need to cache
    };
  }
};
var ExabaseError = class _ExabaseError extends Error {
  constructor(...err) {
    const message = _ExabaseError.geterr(err);
    super(message);
  }
  static geterr(err) {
    return String(err.join(""));
  }
};
var Schema = class {
  //! maybe add pre & post processing hooks
  constructor(options) {
    this.columns = {};
    this.relationship = {};
    this._unique_field = {};
    this._foreign_field = void 0;
    this.tableName = options.tableName.trim().toUpperCase();
    if (options.tableName) {
      this._unique_field = {};
      this.relationship = options.relationship;
      this.searchIndexOptions = options.searchIndexOptions;
      this.RCT = options.RCT;
      this.migrationFN = options.migrationFN;
      this.columns = { ...options?.columns || {} };
      this.columns._id = { type: String };
      for (const key in options.columns) {
        if (options.columns[key].type === Date) {
          options.columns[key].type = (d) => new Date(d).toString().includes("Inval") === false;
        }
        if (options.columns[key].default) {
          if (typeof options.columns[key].default !== typeof options.columns[key].type()) {
            throw new ExabaseError(
              " schema property default value '",
              options.columns[key].default,
              "' for ",
              key,
              " on the ",
              this.tableName,
              " tableName has a wrong type"
            );
          }
        }
        if (options.columns[key].type === JSON) {
          options.columns[key].type = (d) => typeof d === "string";
        }
        if (options.columns[key].unique) {
          this._unique_field[key] = true;
        }
      }
      if (Object.keys(this._unique_field).length === 0) {
        this._unique_field = void 0;
      }
      if (options.relationship) {
        this.relationship = options.relationship;
      }
    }
  }
};
var Transaction = class {
  constructor(Manager2) {
    this._query = [];
    this._Manager = Manager2;
  }
  /**
   * Exabase query
   * Get the timestamp this data was inserted into the database
   * @param data
   * @returns Date
   */
  static getTimestamp(data) {
    return data._id && new Date(parseInt(this.toString().slice(0, 8), 16) * 1e3);
  }
  /**
   * Exabase query
   * find items on the database,
   * field can be _id string or unique props object
   * @param field
   * @param options
   * @returns
   */
  find(field, options) {
    const query = {
      select: typeof field === "string" ? field : "*"
    };
    if (typeof field === "object") {
      query.select = void 0;
      let key = "", value;
      for (const k in field) {
        key = k;
        value = field[k];
        break;
      }
      const fieldT = this._Manager._schema.columns[key];
      if (fieldT && fieldT.unique) {
        query["unique"] = {
          [key]: value
        };
      } else {
        throw new ExabaseError(
          `column field ${key} is not unique, please try searching instead`
        );
      }
    }
    if (typeof options === "object") {
      query.populate = {};
      query.skip = options.skip;
      query.take = options.take;
      const fields = this._Manager._schema._foreign_field;
      if (options.populate === true) {
        for (const lab in fields) {
          query.populate[lab] = fields[lab];
        }
      } else {
        if (Array.isArray(options.populate)) {
          for (let i = 0; i < options.populate.length; i++) {
            const lab = options.populate[0];
            const relaName = fields[lab];
            if (relaName) {
              query.populate[lab] = fields[lab];
            } else {
              throw new ExabaseError(
                "can't POPULATE missing realtionship " + lab
              );
            }
          }
        }
      }
    }
    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    });
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
    if (typeof options === "object") {
      query.skip = options.skip;
      query.take = options.take;
      query.populate = {};
      const fields = this._Manager._schema._foreign_field;
      if (options.populate === true) {
        for (const lab in fields) {
          query.populate[lab] = fields[lab];
        }
      } else {
        if (Array.isArray(options.populate)) {
          for (let i = 0; i < options.populate.length; i++) {
            const lab = options.populate[0];
            const relaName = fields[lab];
            if (relaName) {
              query.populate[lab] = fields[lab];
            } else {
              throw new ExabaseError(
                "can't POPULATE missing realtionship " + lab
              );
            }
          }
        }
      }
    }
    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    });
  }
  /**
   * Exabase query
   * insert or update items on the database,
   * @param data
   * @returns
   */
  save(data) {
    let query;
    if (data._id) {
      query = {
        update: this._Manager._validate(data, "UPDATE")
      };
    } else {
      query = {
        insert: this._Manager._validate(data, "INSERT")
      };
    }
    return new Promise((r) => {
      this._Manager._run(query, r, "m");
    });
  }
  /**
   * Exabase query
   * delete items on the database,
   * @param _id
   * @returns
   */
  delete(_id) {
    if (typeof _id !== "string") {
      throw new ExabaseError(
        "cannot continue with delete query '",
        _id,
        "' is not a valid Exabase _id value"
      );
    }
    const query = {
      delete: _id
    };
    return new Promise((r) => {
      this._Manager._run(query, r, "m");
    });
  }
  /**
   * Exabase query
   * count items on the database
   * @returns
   */
  count(pops) {
    const query = {
      count: pops || true
    };
    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    });
  }
  /**
   * Exabase query
   * clear the wal of the table on the database
   */
  flush() {
    return this._Manager._partition_wal_compiler();
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
      throw new ExabaseError(
        "No relationship definition called ",
        options.relationship,
        " on ",
        this._Manager._schema.tableName,
        " schema"
      );
    }
    if (typeof options.foreign_id !== "string") {
      throw new ExabaseError("foreign_id field is invalid.");
    }
    const query = {
      reference: {
        _id: options._id,
        _new: true,
        type: rela.type,
        foreign_id: options.foreign_id,
        relationship: options.relationship,
        foreign_table: rela.target
      }
    };
    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    });
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
      throw new ExabaseError(
        "No relationship definition called ",
        options.relationship,
        " on ",
        this._Manager._schema.tableName,
        " schema"
      );
    }
    const query = {
      reference: {
        _id: options._id,
        _new: false,
        type: rela.type,
        foreign_id: options.foreign_id,
        relationship: options.relationship,
        foreign_table: rela.target
      }
    };
    return new Promise((r) => {
      this._Manager._run(query, r, "nm");
    });
  }
  /**
   * Exabase query
   * batch write operations on the database
   * @param data
   * @param type
   */
  batch(data, type) {
    if (Array.isArray(data) && "INSERT-UPDATE-DELETE".includes(type)) {
      return this._prepare_for(data, type);
    } else {
      throw new ExabaseError(
        `Invalid inputs for .batch method, data should be array and type should be any of  "INSERT", "UPDATE",  "DELETE" .`
      );
    }
  }
  async _prepare_for(data, type) {
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      if (type === "DELETE") {
        if (item._id) {
          item = item._id;
          if (typeof item !== "string") {
            throw new ExabaseError(
              "cannot continue with delete query '",
              item,
              "' is not a valid Exabase _id value"
            );
          }
          this._query.push({
            [type.toLowerCase()]: item
          });
        }
      } else {
        this._query.push({
          [type.toLowerCase()]: this._Manager._validate(item, type)
        });
      }
    }
  }
  /**
   * Exabase query
   * execute a batch operation on the database
   */
  exec() {
    if (this._query.length !== 0) {
      return new Promise((r) => {
        this._Manager._run(this._query.splice(0), r, "m");
      });
    }
    return [];
  }
};
var Manager = class {
  constructor(schema, usablemManagerMem) {
    this.wQueue = [];
    this.tableDir = "";
    this._LogFiles = {};
    this.logging = false;
    this._schema = schema;
    this._transaction = new Transaction(this);
    this._full_lv_bytesize = Math.round(
      usablemManagerMem / (Object.keys(schema.columns || []).length * 20)
    );
    this.RCT_KEY = this._schema.tableName;
  }
  async _setup(init) {
    this._constructRelationships(init.schemas);
    this.tableDir = init._exabaseDirectory + "/" + this._schema.tableName + "/";
    this.wDir = this.tableDir + "WAL/";
    this.logging = init.logging;
    this.SearchManager = new XTree({ persitKey: this.tableDir + "XINDEX" });
    Utils.RCT[this.RCT_KEY] = this._schema.RCT ? {} : false;
    if (!existsSync(this.tableDir)) {
      mkdirSync(this.tableDir);
      mkdirSync(this.wDir);
    } else {
      await this._sync_logs();
    }
    return true;
  }
  async _sync_logs() {
    const dir = await opendir(this.tableDir);
    let size = 0;
    for await (const dirent of dir) {
      if (dirent.name.includes("-SYNC")) {
        await unlink(this.tableDir + dirent.name);
        continue;
      }
      if (dirent.isFile()) {
        const fn = dirent.name;
        if ("FINDEX-UINDEX-XINDEX".includes(fn)) {
          continue;
        }
        const LOG = await readDataFromFile(
          this.RCT_KEY,
          this.tableDir + dirent.name
        );
        const last_id = LOG.at(-1)?._id || "";
        this._LogFiles[fn] = { last_id, size: LOG.length };
        size += LOG.length;
        if (!this._LsLogFile) {
          this._LsLogFile = fn;
        } else {
          if (Number(fn.split("-")[1]) > Number(this._LsLogFile.split("-")[1])) {
            this._LsLogFile = fn;
          }
        }
      }
    }
    await this._startup_run_wal_sync();
    await this._sync_searchindex(size);
  }
  async _startup_run_wal_sync() {
    if (!existsSync(this.wDir)) {
      mkdirSync(this.wDir);
      return;
    }
    const dir = await opendir(this.wDir);
    let isThereSomeThingToFlush = false;
    for await (const dirent of dir) {
      if (dirent.isFile()) {
        if (!isThereSomeThingToFlush) {
          isThereSomeThingToFlush = true;
          console.log(
            "Exabase is flushing uncommitted transactions after last shutdown"
          );
        }
        const trs = await readDataFromFile(
          this.RCT_KEY,
          this.wDir + dirent.name
        );
        this.wQueue.push([dirent.name, trs]);
      }
    }
    if (isThereSomeThingToFlush) {
      await this._partition_wal_compiler();
    }
  }
  async _sync_searchindex(size) {
    if (this._schema.tableName) {
      if (this._schema.searchIndexOptions) {
        for (const key in this._schema.searchIndexOptions) {
          if (!this._schema.columns[key]) {
            throw new ExabaseError(
              " tableName:",
              key,
              " not found on table",
              this._schema.tableName,
              ", please recheck the defined columns!"
            );
          }
        }
      }
    }
    if (!this.SearchManager.confirmLength(size)) {
      console.log("Re-calculating search index due to changes in log size");
      this.SearchManager.restart();
      for (const file in this._LogFiles) {
        const LOG = await readDataFromFile(this.RCT_KEY, this.tableDir + file);
        this.SearchManager.bulkInsert(LOG);
      }
    }
  }
  async _run_wal_sync(transactions) {
    const degrees = {};
    const usedWalFiles = [];
    const walers = transactions.map(async ([key, transaction]) => {
      usedWalFiles.push(key);
      if (Array.isArray(transaction)) {
        for (let i = 0; i < transaction.length; i++) {
          const d = transaction[i];
          if (!d._wal_flag) {
            throw new ExabaseError(d, " has not wal flag");
          }
          const fn = this.getLog(d._id);
          if (!degrees[fn]) {
            degrees[fn] = await readDataFromFile(
              this.RCT_KEY,
              this.tableDir + fn
            );
          }
          if (d._wal_flag === "i") {
            degrees[fn] = await binarysorted_insert(d, degrees[fn]);
          } else {
            degrees[fn] = await binarysearch_mutate(d, degrees[fn]);
          }
        }
      } else {
        const fn = this.getLog(transaction._id);
        if (!degrees[fn]) {
          degrees[fn] = await readDataFromFile(
            this.RCT_KEY,
            this.tableDir + fn
          );
        }
        if (transaction._wal_flag === "i") {
          degrees[fn] = await binarysorted_insert(transaction, degrees[fn]);
        } else {
          degrees[fn] = await binarysearch_mutate(transaction, degrees[fn]);
        }
      }
    });
    await Promise.all(walers);
    await Promise.all(
      Object.keys(degrees).map((key) => this._commit(key, degrees[key]))
    );
    await Promise.all(usedWalFiles.map((file) => unlink(this.wDir + file)));
  }
  async _commit(fn, messages) {
    this.setLog(fn, messages.at(-1)?._id, messages.length);
    if (Utils.RCT[this.RCT_KEY] !== false) {
      Utils.RCT[this.RCT_KEY][fn] = messages;
    }
    const fnl = this.tableDir + fn;
    const sylog = fnl + "-SYNC";
    if (existsSync(fnl)) {
      await copyFile(fnl, sylog);
    }
    this.setLog(fn, messages.at(-1)?._id, messages.length);
    await writeDataToFile(sylog, messages);
    if (await rename(sylog, fnl) !== void 0) ;
  }
  async _partition_wal_compiler() {
    if (this.wQueue.length === 0) {
      return;
    }
    const transactions = [];
    const trxQ = [];
    for (; this.wQueue.length !== 0; ) {
      const transaction = this.wQueue.shift();
      if (Array.isArray(transaction[1])) {
        transactions.push([transaction]);
      } else {
        trxQ.push(transaction);
        if (trxQ.length === 10) {
          transactions.push([...trxQ.splice(0)]);
        }
      }
    }
    if (trxQ.length) {
      transactions.push([...trxQ.splice(0)]);
    }
    let i = 0;
    const runner = async () => {
      await this._run_wal_sync(transactions[i]);
      i += 1;
      if (i === transactions.length) {
        return;
      }
      setImmediate(runner);
    };
    await runner();
  }
  getLog(logId) {
    const size = this._full_lv_bytesize;
    if (logId === "*") {
      return "LOG-1";
    }
    for (const filename in this._LogFiles) {
      const logFile = this._LogFiles[filename];
      if (logFile.size < size) {
        return filename;
      }
    }
    const cln = Number((this._LsLogFile || "LOG-0").split("-")[1]);
    const nln = cln + 1;
    const lfid = "LOG-" + nln;
    this._LogFiles[lfid] = { last_id: lfid, size: 0 };
    this._LsLogFile = lfid;
    return lfid;
  }
  setLog(fn, last_id, size) {
    this._LogFiles[fn] = { last_id, size };
  }
  _constructRelationships(allSchemas) {
    if (this._schema.tableName) {
      if (this._schema.relationship) {
        this._schema._foreign_field = {};
        for (const key in this._schema.relationship) {
          if (typeof this._schema.relationship[key].target === "string") {
            const namee = this._schema.relationship[key].target.toUpperCase();
            const findschema = allSchemas.find(
              (schema) => schema.tableName === namee
            );
            if (findschema) {
              this._schema._foreign_field[key] = namee;
            } else {
              throw new ExabaseError(
                " tableName:",
                namee,
                " not found on any schema, please recheck the relationship definition of the ",
                this._schema.tableName,
                " schema"
              );
            }
          } else {
            throw new ExabaseError(
              " Error on schema ",
              this._schema.tableName,
              " relationship target must be a string "
            );
          }
        }
      }
    }
  }
  _validate(data, type) {
    const v = validateData(data, this._schema.columns);
    if (typeof v === "string") {
      throw new ExabaseError(
        type,
        " on table :",
        this._schema.tableName,
        " aborted, reason - ",
        v
      );
    }
    if (!data._id && type === "UPDATE") {
      throw new ExabaseError(
        type + " on table :",
        this._schema.tableName,
        " aborted, reason - _id is required"
      );
    }
    return v;
  }
  _select_(query) {
    if (Array.isArray(query.select.relationship)) {
      const rela = {};
      for (let i = 0; i < query.select.relationship.length; i++) {
        const r = query.select.relationship;
        rela[r] = this._schema.relationship[r].target;
      }
      query.select.relationship = rela;
    }
    const file = this.getLog(query.select);
    return findMessage(
      this.RCT_KEY,
      this.tableDir + file,
      query
    );
  }
  _trx_runner(query, tableDir) {
    if (query["select"]) {
      if (Array.isArray(query.select.relationship)) {
        const rela = {};
        for (let i = 0; i < query.select.relationship.length; i++) {
          const r = query.select.relationship;
          rela[r] = this._schema.relationship[r].target;
        }
        query.select.relationship = rela;
      }
      const file = this.getLog(query.select);
      return findMessages(this.RCT_KEY, tableDir + file, query);
    }
    if (query["insert"]) {
      return insertMessage(tableDir, this._schema._unique_field, query.insert);
    }
    if (query["update"]) {
      return updateMessage(tableDir, this._schema._unique_field, query.update);
    }
    if (query["search"]) {
      const indexes = this.SearchManager.search(query.search, query.take);
      const searches = indexes.map(
        (idx) => this._select_({ select: idx, populate: query.populate })
      );
      return Promise.all(searches);
    }
    if (query["unique"]) {
      return new Promise(async (r) => {
        const select = await findMessageByUnique(
          tableDir + "UINDEX",
          this._schema._unique_field,
          query.unique
        );
        if (select) {
          const file = this.getLog(select);
          r(
            await findMessage(this.RCT_KEY, tableDir + file, {
              select,
              populate: query.populate
            })
          );
        } else {
          r([]);
        }
      });
    }
    if (query["count"]) {
      if (query["count"] === true) {
        let size = 0;
        const obj = Object.values(this._LogFiles);
        for (let c = 0; c < obj.length; c++) {
          const element = obj[c];
          size += element.size || 0;
        }
        return size;
      } else {
        return this.SearchManager.count(query["count"]);
      }
    }
    if (query["delete"]) {
      const file = this.getLog(query.delete);
      return deleteMessage(
        query.delete,
        tableDir,
        this._schema._unique_field,
        this.RCT_KEY,
        file
      );
    }
    if (query["reference"] && query["reference"]._new) {
      const file = this.getLog(query.reference._id);
      return addForeignKeys(this.RCT_KEY, tableDir + file, query.reference);
    }
    if (query["reference"]) {
      const file = this.getLog(query.reference._id);
      return removeForeignKeys(tableDir + file, query.reference);
    }
  }
  async _run(query, r, type) {
    const trx = async () => {
      let trs;
      if (!Array.isArray(query)) {
        trs = await this._trx_runner(query, this.tableDir);
      } else {
        trs = await Promise.all(
          query.map((q) => this._trx_runner(q, this.tableDir))
        );
      }
      if (type !== "nm") {
        if (typeof trs === "object") {
          const wid = generate_id();
          await writeDataToFile(this.wDir + wid, trs);
          this.wQueue.push([wid, trs]);
          await this.SearchManager?.manage(trs);
        }
      }
      return trs;
    };
    if (type === "nm") {
      await this._partition_wal_compiler();
    }
    r(trx());
    if (this.logging) {
      console.log({ query, table: this._schema.tableName, type });
    }
  }
};
var XNode = class {
  constructor(keys) {
    this.keys = [];
    this.keys = keys || [];
  }
  insert(value, index2) {
    let low = 0;
    let high = this.keys.length - 1;
    for (; low <= high; ) {
      const mid = Math.floor((low + high) / 2);
      const current = this.keys[mid].value;
      if (current === value) {
        this.keys[mid].indexes.push(index2);
        return;
      }
      if (current < value) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    this.keys.splice(low, 0, { value, indexes: [index2] });
  }
  disert(value, index2) {
    let left = 0;
    let right = this.keys.length - 1;
    for (; left <= right; ) {
      const mid = Math.floor((left + right) / 2);
      const current = this.keys[mid].value;
      if (current === value) {
        this.keys[mid].indexes = this.keys[mid].indexes.filter(
          (a) => a !== index2
        );
        break;
      } else if (current < value) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
  }
  upsert(value, index2) {
    this.disert(value, index2);
    this.insert(value, index2);
  }
  search(value) {
    let left = 0;
    let right = this.keys.length - 1;
    for (; left <= right; ) {
      const mid = Math.floor((left + right) / 2);
      const current = this.keys[mid].value;
      if (current === value || typeof current === "string" && current.includes(value)) {
        return this.keys[mid].indexes;
      } else if (current < value) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return;
  }
};
var XTree = class _XTree {
  constructor(init) {
    this.base = [];
    this.mutatingBase = false;
    this.tree = {};
    this.persitKey = init.persitKey;
    const [base, tree] = _XTree.restore(init.persitKey);
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
    for (; left <= right; ) {
      const mid = Math.floor((left + right) / 2);
      const current = this.base[mid];
      if (current === _id) {
        return mid;
      } else if (current < _id) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    return;
  }
  async count(search) {
    let resultsCount = 0;
    for (const key in search) {
      if (this.tree[key]) {
        resultsCount += this.tree[key].search(search[key])?.length || 0;
      }
    }
    return resultsCount;
  }
  confirmLength(size) {
    return this.base.length === size;
  }
  manage(trx) {
    if (Array.isArray(trx)) {
      switch (trx[0]._wal_flag) {
        case "i":
          return this.bulkInsert(trx);
        case "u":
          return this.bulkUpsert(trx);
        case "d":
          return this.bulkDisert(trx);
      }
    } else {
      switch (trx._wal_flag) {
        case "i":
          return this.insert(trx);
        case "u":
          return this.upsert(trx);
        case "d":
          return this.disert(trx);
      }
    }
    return;
  }
  async insert(data, bulk = false) {
    if (!data._id)
      throw new Error("bad insert");
    if (!this.mutatingBase) {
      this.mutatingBase = true;
    } else {
      setImmediate(() => {
        this.insert(data);
      });
      return;
    }
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const key in data) {
        if (key === "_id" || key === "_wal_flag")
          continue;
        if (!this.tree[key]) {
          this.tree[key] = new XNode();
        }
        this.tree[key].insert(data[key], this.base.length);
      }
      this.base.push(data._id);
    }
    if (!bulk)
      await this.persit();
    this.mutatingBase = false;
  }
  async disert(data, bulk = false) {
    if (!data._id)
      throw new Error("bad insert");
    if (!this.mutatingBase) {
      this.mutatingBase = true;
    } else {
      setImmediate(() => {
        this.disert(data);
      });
      return;
    }
    const index2 = this.searchBase(data._id);
    if (!index2)
      return;
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const key in data) {
        if (key === "_id" || !this.tree[key])
          continue;
        this.tree[key].disert(data[key], index2);
      }
      this.base.splice(index2, 1);
    }
    if (!bulk)
      await this.persit();
    this.mutatingBase = false;
  }
  async upsert(data, bulk = false) {
    if (!data._id)
      throw new Error("bad insert");
    if (!this.mutatingBase) {
      this.mutatingBase = true;
    } else {
      setImmediate(() => {
        this.disert(data);
      });
      return;
    }
    const index2 = this.searchBase(data._id);
    if (index2 === void 0)
      return;
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const key in data) {
        if (key === "_id")
          continue;
        if (!this.tree[key]) {
          this.tree[key] = new XNode();
        }
        this.tree[key].upsert(data[key], index2);
      }
    }
    if (!bulk)
      await this.persit();
    this.mutatingBase = false;
  }
  async bulkInsert(dataset) {
    if (Array.isArray(dataset)) {
      for (let i = 0; i < dataset.length; i++) {
        this.insert(dataset[i], true);
      }
      await this.persit();
    }
  }
  async bulkDisert(dataset) {
    if (Array.isArray(dataset)) {
      for (let i = 0; i < dataset.length; i++) {
        this.disert(dataset[i], true);
      }
      await this.persit();
    }
  }
  async bulkUpsert(dataset) {
    if (Array.isArray(dataset)) {
      for (let i = 0; i < dataset.length; i++) {
        this.upsert(dataset[i], true);
      }
      await this.persit();
    }
  }
  persit() {
    const obj = {};
    const keys = Object.keys(this.tree);
    for (let index2 = 0; index2 < keys.length; index2++) {
      obj[keys[index2]] = this.tree[keys[index2]].keys;
    }
    return FileLockTable.write(this.persitKey, {
      base: this.base,
      tree: obj
    });
  }
  static restore(persitKey) {
    const data = readDataFromFileSync(persitKey);
    const tree = {};
    if (data.tree) {
      for (const key in data.tree) {
        tree[key] = new XNode(data.tree[key]);
      }
    }
    return [data.base, tree];
  }
};

// src/primitives/http-functions.ts
var _ExabaseRingInterface = async (ctx) => {
  const data = await ctx.json();
  switch (data.type) {
    case "app":
      app(data.query);
      break;
    case "authorise":
      authorise(data.query);
      break;
    case "save":
      save(data.query);
      break;
    case "hydrate":
      hydrate(data.query);
      break;
    default:
      ctx.reply("pong");
      break;
  }
};
var _AccessRingInterfaces = async () => {
  const ringbearerResponses = Utils.MANIFEST.ringbearers.map(
    (r) => fetch(r + "/exabase", {})
  );
  for await (const ringbearerResponse of ringbearerResponses) {
    const data = await ringbearerResponse.json();
    if (data.status !== "OK") {
      throw new ExabaseError(
        "Failed Exabase Auth! - connecting to a ring bearer at ",
        ringbearerResponse.url
      );
    }
  }
  return true;
};
var app = async (ctx) => {
  await ctx.body.json();
  ctx.reply({ status: "OK" });
};
var authorise = async (ctx) => {
  const req = await ctx.body.json();
  Utils.MANIFEST.ringbearers.push(req.url);
  ctx.reply({ status: "OK" });
};
var hydrate = async (ctx) => {
  await ctx.body.json();
  try {
    ctx.reply({ status: "OK" });
  } catch (error) {
    ctx.statusCode = 401;
    ctx.reply({ status: "FAILED" });
  }
};
var save = async (ctx) => {
  await ctx.body.json();
  try {
    ctx.reply({ status: "OK" });
  } catch (error) {
    ctx.statusCode = 401;
    ctx.reply({ status: "FAILED" });
  }
};

// src/index.ts
var Exabase = class {
  constructor(init) {
    this._ready = false;
    this._conn = void 0;
    this._exabaseDirectory = (init.name || "EXABASE_DB").trim().toUpperCase();
    const usableManagerGB = getComputedUsage(
      init.EXABASE_MEMORY_PERCENT,
      init.schemas.length
    );
    try {
      mkdirSync(this._exabaseDirectory);
      Object.assign(Utils.MANIFEST, {
        name: init.name?.toUpperCase(),
        schemas: void 0,
        EXABASE_SECRET: init.EXABASE_SECRET || "example"
      });
      console.log("Exabase initialised!");
    } catch (e) {
      if ({ e }.e.code === "EEXIST") {
        Object.assign(
          {
            name: init.name?.toUpperCase(),
            schemas: void 0,
            EXABASE_SECRET: init.EXABASE_SECRET
          },
          Utils.MANIFEST
        );
      }
    }
    init.schemas.forEach((schema) => {
      Utils.EXABASE_MANAGERS[schema?.tableName] = new Manager(
        schema,
        usableManagerGB
      );
    });
    Promise.allSettled(
      Object.values(Utils.EXABASE_MANAGERS).map(
        (manager) => manager._setup({
          _exabaseDirectory: this._exabaseDirectory,
          logging: init.logging || false,
          schemas: init.schemas
        })
      )
    ).then((_all) => {
      this._ready = true;
      console.log("Exabase: connected!");
      this._conn && this._conn(true);
    }).catch((e) => {
      console.log(e);
    });
  }
  connect() {
    if (!this._ready) {
      console.log("Exabase: connecting...");
      return new Promise((r) => {
        this._conn = r;
      });
    }
    return void 0;
  }
  getTransaction(schema) {
    if (this._ready) {
      if (Utils.EXABASE_MANAGERS[schema?.tableName]) {
        return Utils.EXABASE_MANAGERS[schema.tableName]._transaction;
      } else {
        throw new ExabaseError(
          "The given schema - " + (schema?.tableName || "undefined") + " is not connected to the Eaxbase Instance"
        );
      }
    } else {
      throw new ExabaseError("Exabase not ready!");
    }
  }
  async expose() {
    if (this._ready === true) {
      await _AccessRingInterfaces();
      return _ExabaseRingInterface;
    } else {
      throw new ExabaseError("Exabase not ready!");
    }
  }
  async executeQuery(query) {
    try {
      if (typeof query !== "string")
        throw new Error();
      const parsedQuery = JSON.parse(query);
      const table = Utils.EXABASE_MANAGERS[parsedQuery.table];
      if (!table)
        throw new Error();
      return new Promise((r) => {
        table._run(parsedQuery.query, r, parsedQuery.type || "nm");
      });
    } catch (error) {
      throw new ExabaseError("Invalid query: ", query);
    }
  }
};

export { Exabase, ExabaseError, Schema };
