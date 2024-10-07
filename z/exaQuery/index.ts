// export class Query<Model> {
//   private _Manager: Manager;
//   //? avaible immidiately connected
//   _table: string = "";
//   premature: boolean = true;
//   constructor(Manager: Manager) {
//     this._Manager = Manager;
//     if (Manager) {
//       this.premature = false;
//       this._table = Manager.name;
//     }
//   }

//   /**
//    * Exabase query
//    * find items on the database,
//    * field can be _id string or unique props object
//    * @param field
//    * @param options
//    * @returns
//    */
//   many(options?: {
//     populate?: string[] | boolean;
//     take?: number;
//     skip?: number;
//     sort?: {
//       [x in keyof Partial<Model>]: "ASC" | "DESC";
//     };
//     logIndex?: number;
//   }) {
//     // ? creating query payload
//     const query: QueryType<Model> = {
//       many: true,
//       table: this._table,
//     };
//     // ? populate options
//     if (typeof options === "object") {
//       query.skip = options.skip;
//       query.take = options.take;
//       query.sort = options.sort;
//       query.populate = options.populate as any;
//     }

//     return this._Manager._trx_runner(query) as Promise<ExaDoc<Model>[]>;
//   }
//   /**
//    * Exabase query
//    * find items on the database,
//    * field can be _id string or unique props object
//    * @param field
//    * @param options
//    * @returns
//    */
//   one(
//     field: Partial<Model> | string,
//     options?: {
//       populate?: string[] | boolean;
//     }
//   ) {
//     // ? creating query payload
//     const query: QueryType<Model> = {
//       one: field as string,
//       table: this._table,
//     };
//     // ? inputting relationship payload
//     if (typeof field === "object") {
//       query.one = undefined;
//       const key: string = Object.keys(field)[0];
//       const value = field[key as keyof typeof field];
//       const fieldT = (this._Manager.schema.columns as any)[key as string];
//       if (fieldT && fieldT.unique) {
//         query["unique"] = {
//           [key]: value,
//         };
//       } else {
//         throw new ExaError(
//           `column field ${key} is not unique, please try searching instead`
//         );
//       }
//     }
//     // ? populate options
//     if (typeof options === "object") {
//       query.populate = options.populate as any;
//     }

//     return this._Manager._trx_runner(query) as Promise<ExaDoc<Model>>;
//   }
//   /**
//    * Exabase query
//    * search items on the database,
//    * @param searchQuery
//    * @param options
//    * @returns
//    */
//   search(
//     searchQuery: searchQuery<Model>,
//     options?: {
//       populate?: string[] | boolean;
//       take?: number;
//       sort?: {
//         [x in keyof Partial<Model>]: "ASC" | "DESC";
//       };
//     }
//   ) {
//     if (typeof searchQuery !== "object" && !Array.isArray(searchQuery))
//       throw new ExaError("invalid search query ", searchQuery);
//     const query: QueryType<Model> = { search: searchQuery, table: this._table };
//     // ? populate options
//     if (typeof options === "object") {
//       query.take = options.take;
//       query.sort = options.sort;
//       query.populate = options.populate as any;
//     }
//     return this._Manager._trx_runner(query) as Promise<ExaDoc<Model>[]>;
//   }
//   /**
//    * Exabase query
//    * insert or update items on the database
//    * @param data
//    * @returns
//    */
//   save(data: Partial<ExaDoc<Model>>) {
//     const query: QueryType<Model> = {
//       [typeof data?._id === "string" ? "update" : "insert"]: data,
//       table: this._table,
//     };
//     return this._Manager._trx_runner(query) as Promise<ExaDoc<Model>>;
//   }
//   /**
//    * Exabase query
//    * delete items on the database,
//    * @returns
//    */
//   delete(del: string) {
//     const query: QueryType<Model> = {
//       delete: del,
//       table: this._table,
//     };
//     return this._Manager._trx_runner(query) as Promise<ExaDoc<Model>>;
//   }
//   /**
//    * Exabase query
//    * count items on the database
//    * @returns
//    */
//   count(pops?: Partial<Model>) {
//     const query: QueryType<Model> = {
//       count: pops || true,
//       table: this._table,
//     };
//     return this._Manager._trx_runner(query) as Promise<number>;
//   }
//   /**
//    * Exabase query
//    * count the number for log files availble in the Table
//    * each log file store 16kb of data
//    * @returns
//    */
//   logCount() {
//     return Object.keys(this._Manager.LogFiles).length;
//   }
// }
