/**
 * Interface for Exabase init  */
export type ExabaseOptions = {
  // accessKeyId: string;
  // region: string;
  // bucketName: string;
  // writeWindow: number;
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
  table?: string;
  operation?: {
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
export type Msgs = Msg[];

export interface iTable {
  [x: string]: { [x: string]: string };
}

export type LOG_file_type = Record<string, { size: number; length: number }>;
export type Xtree_flag = "i" | "u" | "d" | "n";
export type wTrainType = [(value: unknown) => void, Msg, Xtree_flag];

export type xPersistType = {
  maps: Record<string, Record<string, number[]>>;
  keys: string[];
};

interface XNode {
  map: Record<string, number[]>;
  // constructor(map?: Record<string, number[]>);
  create(val: string, idk: number): void;
  drop(val: string, idk: number): void;
}

export type xTreeType = {
  tree: Record<string, XNode>;
  keys: string[];
};
