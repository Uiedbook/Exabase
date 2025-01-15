/**
 * Interface for Exabase init  */
export type ExabaseOptions = {
  // accessKeyId: string;
  // region: string;
  // bucketName: string;
  secretAccessKey: string;
  endpoint: string;
};

/**
 * Interface for schema metadata mappings  */
export interface SchemaOptions {
  /**
   * Table name.
   */
  table: Uppercase<string>;
}

export type searchQuery<Model> =
  | Partial<Model>
  | Record<"$eq" | "$ne" | "$gt" | "$gte" | "$lt" | "$lte", Partial<Model>>;

export type QueryType<Model> = {
  table: string;
  execute?: {
    dropTable?: boolean;
    createTable?: boolean;
    addIndex?: boolean;
    removeIndex?: boolean;
  };
  sort?: {
    [x in keyof Partial<Model>]: "ASC" | "DESC";
  };
  where?: {
    [field: string]:
      | {
          eq?: any;
          lt?: any;
          gt?: any;
          lte?: any;
          gte?: any;
          like?: string;
        }
      | any;
  };
  insert?: Record<string, any>;
  update?: Partial<Model>;
  delete?: boolean;
  get?: boolean;
  count?: boolean;
  skip?: number;
  take?: number;
  aggregate?: {
    [field: string]: "sum" | "avg" | "min" | "max" | "count";
  };
  consistency?: "strong" | "eventual";
};

export type Msg = {
  _id: string;
  [x: string]: string | string[] | number | boolean | Msg | Msg[];
};

export type LOG_file = Record<string, { size: number; length: number }>;

export interface Struct {
  base: Map<string, Msg>;
  nodes: Map<
    string,
    {
      attribute: string;
      valueMap: Map<any, Set<string>>;
    }
  >;
}
