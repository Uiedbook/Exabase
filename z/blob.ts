// ? https://github.com/sentienhq/ultralight-s3

"use strict";

// Constants
const AWS_ALGORITHM = "AWS4-HMAC-SHA256";
const AWS_REQUEST_TYPE = "aws4_request";
const S3_SERVICE = "s3";
const LIST_TYPE = "2";
const UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
const JSON_CONTENT_TYPE = "application/json";
const MIN_MAX_REQUEST_SIZE_IN_BYTES = 5 * 1024 * 1024;

// Headers
const HEADER_AMZ_CONTENT_SHA256 = "x-amz-content-sha256";
const HEADER_AMZ_DATE = "x-amz-date";
const HEADER_HOST = "host";
const HEADER_AUTHORIZATION = "Authorization";
const HEADER_CONTENT_TYPE = "Content-Type";
const HEADER_CONTENT_LENGTH = "Content-Length";
const HEADER_ETAG = "etag";
const HEADER_LAST_MODIFIED = "last-modified";

// Error messages
const ERROR_PREFIX = "ultralight-s3 Module: ";
const ERROR_ACCESS_KEY_REQUIRED = `${ERROR_PREFIX}accessKeyId must be a non-empty string`;
const ERROR_SECRET_KEY_REQUIRED = `${ERROR_PREFIX}secretAccessKey must be a non-empty string`;
const ERROR_ENDPOINT_REQUIRED = `${ERROR_PREFIX}endpoint must be a non-empty string`;
const ERROR_BUCKET_NAME_REQUIRED = `${ERROR_PREFIX}bucketName must be a non-empty string`;
const ERROR_KEY_REQUIRED = `${ERROR_PREFIX}key must be a non-empty string`;
const ERROR_DATA_BUFFER_REQUIRED = `${ERROR_PREFIX}data must be a Buffer or string`;
const ERROR_PREFIX_TYPE = `${ERROR_PREFIX}prefix must be a string`;
const ERROR_MAX_KEYS_TYPE = `${ERROR_PREFIX}maxKeys must be a positive integer`;
const ERROR_DELIMITER_REQUIRED = `${ERROR_PREFIX}delimiter must be a string`;

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucketName: string;
  region?: string;
  maxRequestSizeInBytes?: number;
  requestAbortTimeout?: number;
}

declare global {
  interface Crypto {
    createHmac: (
      algorithm: string,
      key: string | Buffer
    ) => {
      update: (data: string | Buffer) => void;
      digest: (encoding?: "hex" | "base64" | "latin1") => string;
    };
    createHash: (algorithm: string) => {
      update: (data: string | Buffer) => void;
      digest: (encoding?: "hex" | "base64" | "latin1") => string;
    };
  }
}

type HttpMethod = "POST" | "GET" | "HEAD" | "PUT" | "DELETE";

type ExistResponseCode = false | true | null;

let _createHmac = crypto.createHmac || (await import("node:crypto")).createHmac;
let _createHash = crypto.createHash || (await import("node:crypto")).createHash;

if (typeof _createHmac === "undefined" && typeof _createHash === "undefined") {
  console.error(
    "ultralight-S3 Module: Crypto functions are not available, please report the issue with necessary description: https://github.com/sentienhq/ultralight-s3/issues"
  );
}

const expectArray: { [key: string]: boolean } = {
  contents: true,
};

const encodeAsHex = (c: string): string =>
  `%${c.charCodeAt(0).toString(16).toUpperCase()}`;

const uriEscape = (uriStr: string): string => {
  return encodeURIComponent(uriStr).replace(/[!'()*]/g, encodeAsHex);
};

const uriResourceEscape = (string: string): string => {
  return uriEscape(string).replace(/%2F/g, "/");
};

export class S3 {
  private accessKeyId: string;
  private secretAccessKey: string;
  private endpoint: string;
  private bucketName: string;
  private region: string;
  private maxRequestSizeInBytes: number;
  private requestAbortTimeout?: number;
  constructor({
    accessKeyId,
    secretAccessKey,
    endpoint,
    bucketName,
    region = "auto",
    requestAbortTimeout = undefined,
  }: S3Config) {
    this._validateConstructorParams(
      accessKeyId,
      secretAccessKey,
      endpoint,
      bucketName
    );
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.endpoint = endpoint;
    this.bucketName = bucketName;
    this.region = region;
    this.requestAbortTimeout = requestAbortTimeout;
  }

  private _validateConstructorParams(
    accessKeyId: string,
    secretAccessKey: string,
    endpoint: string,
    bucketName: string
  ): void {
    if (typeof accessKeyId !== "string" || accessKeyId.trim().length === 0)
      throw new TypeError(ERROR_ACCESS_KEY_REQUIRED);
    if (
      typeof secretAccessKey !== "string" ||
      secretAccessKey.trim().length === 0
    )
      throw new TypeError(ERROR_SECRET_KEY_REQUIRED);
    if (typeof endpoint !== "string" || endpoint.trim().length === 0)
      throw new TypeError(ERROR_ENDPOINT_REQUIRED);
    if (typeof bucketName !== "string" || bucketName.trim().length === 0)
      throw new TypeError(ERROR_BUCKET_NAME_REQUIRED);
  }

  private _checkMethodHeadnGet(method: string): void {
    if (method !== "GET" && method !== "HEAD") {
      throw new Error("method must be either GET or HEAD");
    }
  }

  private _checkKey(key: string): void {
    if (typeof key !== "string" || key.trim().length === 0) {
      throw new TypeError(ERROR_KEY_REQUIRED);
    }
  }

  private _checkDelimiter(delimiter: string): void {
    if (typeof delimiter !== "string" || delimiter.trim().length === 0) {
      throw new TypeError(ERROR_DELIMITER_REQUIRED);
    }
  }

  private _checkPrefix(prefix: string): void {
    if (typeof prefix !== "string") {
      throw new TypeError(ERROR_PREFIX_TYPE);
    }
  }

  private _checkMaxKeys(maxKeys: number): void {
    if (typeof maxKeys !== "number" || maxKeys <= 0) {
      throw new TypeError(ERROR_MAX_KEYS_TYPE);
    }
  }

  private _checkOpts(opts: Record<string, any>): void {
    if (typeof opts !== "object") {
      throw new TypeError(`${ERROR_PREFIX}opts must be an object`);
    }
  }

  getBucketName = () => this.bucketName;
  setBucketName = (bucketName: string) => {
    this.bucketName = bucketName;
  };
  getRegion = () => this.region;
  setRegion = (region: string) => {
    this.region = region;
  };
  getEndpoint = () => this.endpoint;
  setEndpoint = (endpoint: string) => {
    this.endpoint = endpoint;
  };
  getMaxRequestSizeInBytes = () => this.maxRequestSizeInBytes;
  setMaxRequestSizeInBytes = (maxRequestSizeInBytes: number) => {
    this.maxRequestSizeInBytes = maxRequestSizeInBytes;
  };
  sanitizeETag = (etag: string): string => sanitizeETag(etag);

  getProps = () => ({
    accessKeyId: this.accessKeyId,
    secretAccessKey: this.secretAccessKey,
    region: this.region,
    bucket: this.bucketName,
    endpoint: this.endpoint,
    maxRequestSizeInBytes: this.maxRequestSizeInBytes,
    requestAbortTimeout: this.requestAbortTimeout,
  });
  setProps = (props: S3Config) => {
    this._validateConstructorParams(
      props.accessKeyId,
      props.secretAccessKey,
      props.bucketName,
      props.endpoint
    );
    this.accessKeyId = props.accessKeyId;
    this.secretAccessKey = props.secretAccessKey;
    this.region = props.region || "auto";
    this.bucketName = props.bucketName;
    this.endpoint = props.endpoint;
    this.maxRequestSizeInBytes =
      props.maxRequestSizeInBytes || MIN_MAX_REQUEST_SIZE_IN_BYTES;
    this.requestAbortTimeout = props.requestAbortTimeout;
  };

  /**
   * Get the content length of an object.
   * @param {string} key - The key of the object.
   * @returns {Promise<number>} The content length of the object in bytes.
   * @throws {TypeError} If the key is not a non-empty string.
   */
  async getContentLength(key: string): Promise<number> {
    this._checkKey(key);
    const headers = {
      [HEADER_AMZ_CONTENT_SHA256]: UNSIGNED_PAYLOAD,
    };
    const encodedKey = uriResourceEscape(key);
    const { url, headers: signedHeaders } = await this._sign(
      "HEAD",
      encodedKey,
      {},
      headers,
      ""
    );
    const res = await this._sendRequest(url, "HEAD", signedHeaders);
    const contentLength = res.headers.get(HEADER_CONTENT_LENGTH);
    return contentLength ? parseInt(contentLength, 10) : 0;
  }

  async fileExists(
    key: string,
    opts: Record<string, any> = {}
  ): Promise<ExistResponseCode> {
    this._checkKey(key);
    const { filteredOpts, conditionalHeaders } = this._filterIfHeaders(opts);
    const headers = {
      [HEADER_AMZ_CONTENT_SHA256]: UNSIGNED_PAYLOAD,
      ...conditionalHeaders,
    };
    const encodedKey = uriResourceEscape(key);
    const { url, headers: signedHeaders } = await this._sign(
      "HEAD",
      encodedKey,
      filteredOpts,
      headers,
      ""
    );
    try {
      const res = await this._sendRequest(
        url,
        "HEAD",
        signedHeaders,
        "",
        [200, 404, 412, 304]
      );
      if (res.status === 404) {
        return false;
      }
      if (res.status === 412 || res.status === 304) {
        return null;
      }
      if (res.ok && res.status === 200) return true;
      else this._handleErrorResponse(res);
      return false; // should never happen
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      throw new Error(
        `${ERROR_PREFIX}Failed to check if file exists: ${errorMessage}`
      );
    }
  }
  private async _sign(
    method: HttpMethod,
    keyPath: string,
    query: Object = {},
    headers: Record<string, string | number>,
    body: string | Buffer
  ): Promise<{ url: string; headers: Record<string, any> }> {
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const url =
      typeof keyPath === "string" && keyPath.length > 0
        ? new URL(keyPath, this.endpoint)
        : new URL(this.endpoint);
    url.pathname = `/${encodeURI(this.bucketName)}${url.pathname}`;
    headers[HEADER_AMZ_CONTENT_SHA256] = body
      ? await _hash(body)
      : UNSIGNED_PAYLOAD;
    headers[HEADER_AMZ_DATE] = datetime;
    headers[HEADER_HOST] = url.host;
    const canonicalHeaders = this._buildCanonicalHeaders(headers);
    const signedHeaders = Object.keys(headers)
      .map((key) => key.toLowerCase())
      .sort()
      .join(";");

    const canonicalRequest = await this._buildCanonicalRequest(
      method,
      url,
      query,
      canonicalHeaders,
      signedHeaders,
      body
    );
    const stringToSign = await this._buildStringToSign(
      datetime,
      canonicalRequest
    );
    const signature = await this._calculateSignature(datetime, stringToSign);
    const authorizationHeader = this._buildAuthorizationHeader(
      datetime,
      signedHeaders,
      signature
    );
    headers[HEADER_AUTHORIZATION] = authorizationHeader;
    return { url: url.toString(), headers };
  }

  private _buildCanonicalHeaders(
    headers: Record<string, string | number>
  ): string {
    return Object.entries(headers)
      .map(([key, value]) => `${key.toLowerCase()}:${String(value).trim()}`)
      .sort()
      .join("\n");
  }

  async _buildCanonicalRequest(
    method: HttpMethod,
    url: URL,
    query: Object,
    canonicalHeaders: string,
    signedHeaders: string,
    body: string | Buffer
  ): Promise<string> {
    return [
      method,
      url.pathname,
      this._buildCanonicalQueryString(query),
      `${canonicalHeaders}\n`,
      signedHeaders,
      body ? await _hash(body) : UNSIGNED_PAYLOAD,
    ].join("\n");
  }

  async _buildStringToSign(
    datetime: string,
    canonicalRequest: string
  ): Promise<string> {
    const credentialScope = [
      datetime.slice(0, 8),
      this.region,
      S3_SERVICE,
      AWS_REQUEST_TYPE,
    ].join("/");
    return [
      AWS_ALGORITHM,
      datetime,
      credentialScope,
      await _hash(canonicalRequest),
    ].join("\n");
  }

  async _calculateSignature(
    datetime: string,
    stringToSign: string
  ): Promise<string> {
    const signingKey = await this._getSignatureKey(datetime.slice(0, 8));
    return _hmac(signingKey, stringToSign, "hex");
  }

  private _buildAuthorizationHeader(
    datetime: string,
    signedHeaders: string,
    signature: string
  ): string {
    const credentialScope = [
      datetime.slice(0, 8),
      this.region,
      S3_SERVICE,
      AWS_REQUEST_TYPE,
    ].join("/");
    return [
      `${AWS_ALGORITHM} Credential=${this.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(", ");
  }

  private _filterIfHeaders(opts: Record<string, any>): {
    filteredOpts: Record<string, any>;
    conditionalHeaders: Record<string, string>;
  } {
    const filteredOpts: Record<string, any> = {};
    const conditionalHeaders: Record<string, string> = {};
    const ifHeaders = [
      "if-match",
      "if-none-match",
      "if-modified-since",
      "if-unmodified-since",
    ];

    for (const [key, value] of Object.entries(opts)) {
      if (ifHeaders.includes(key)) {
        conditionalHeaders[key] = value;
      } else {
        filteredOpts[key] = value;
      }
    }

    return { filteredOpts, conditionalHeaders };
  }
  /**
   * List objects in the bucket.
   * @param {string} [delimiter='/'] - The delimiter to use for grouping objects in specific path.
   * @param {string} [prefix=''] - The prefix to filter objects in specific path.
   * @param {number} [maxKeys=1000] - The maximum number of keys to return.
   * @param {string} [method='GET'] - The HTTP method to use (GET or HEAD).
   * @param {Object} [opts={}] - Additional options for the list operation.
   * @returns {Promise<Object|Array>} The list of objects or object metadata.
   * @throws {TypeError} If any of the parameters are of incorrect type.
   */
  async list(
    delimiter: string = "/",
    prefix: string = "",
    maxKeys: number = 1000,
    method: HttpMethod = "GET",
    opts: Object = {}
  ): Promise<Object | Array<Object>> {
    this._checkDelimiter(delimiter);
    this._checkPrefix(prefix);
    this._checkMaxKeys(maxKeys);
    this._checkMethodHeadnGet(method);
    this._checkOpts(opts);

    const query = {
      "list-type": LIST_TYPE,
      "max-keys": String(maxKeys),
      ...opts,
    } as { [key: string]: any };
    if (prefix.length > 0) {
      query["prefix"] = prefix;
    }
    const headers = {
      [HEADER_CONTENT_TYPE]: JSON_CONTENT_TYPE,
      [HEADER_AMZ_CONTENT_SHA256]: UNSIGNED_PAYLOAD,
    };
    const encodedKey = delimiter === "/" ? delimiter : uriEscape(delimiter);
    const { url, headers: signedHeaders } = await this._sign(
      "GET",
      encodedKey,
      query,
      headers,
      ""
    );
    const urlWithQuery = `${url}?${new URLSearchParams(query)}`;
    const res = await this._sendRequest(urlWithQuery, "GET", signedHeaders);
    const responseBody = await res.text();

    if (method === "HEAD") {
      const contentLength = res.headers.get(HEADER_CONTENT_LENGTH);
      const lastModified = res.headers.get(HEADER_LAST_MODIFIED);
      const etag = res.headers.get(HEADER_ETAG);

      return {
        size: contentLength ? +contentLength : undefined,
        mtime: lastModified ? new Date(lastModified) : undefined,
        ETag: etag || undefined,
      };
    }

    const data = _parseXml(responseBody);
    const output = data.listBucketResult || data.error || data;
    return output.contents || output;
  }

  /**
   * Get an object from the bucket.
   * @param {string} key - The key of the object to get.
   * @param {Object} [opts={}] - Additional options for the get operation.
   * @returns {Promise<Response | null>} The response of the object. If the object does not exist, null will be returned.
   */
  async get(
    key: string,
    opts: Record<string, any> = {}
  ): Promise<Response | null> {
    this._checkKey(key);
    const { filteredOpts, conditionalHeaders } = this._filterIfHeaders(opts);
    const headers = {
      [HEADER_CONTENT_TYPE]: JSON_CONTENT_TYPE,
      [HEADER_AMZ_CONTENT_SHA256]: UNSIGNED_PAYLOAD,
      ...conditionalHeaders,
    };
    const encodedKey = uriResourceEscape(key);
    const { url, headers: signedHeaders } = await this._sign(
      "GET",
      encodedKey,
      filteredOpts,
      headers,
      ""
    );
    const res = await this._sendRequest(
      url,
      "GET",
      signedHeaders,
      "",
      [200, 404, 412, 304]
    );
    if (res.status === 404 || res.status === 412 || res.status === 304) {
      return null;
    }
    if (!res.ok) {
      throw new Error(`Failed to get object. Status: ${res.status}`);
    }
    return res;
  }

  /**
   *
   * @param {string} key - The key of the object to get.
   * @param {Object} [opts={}] - Additional options for the get operation.
   * @returns {Promise<{ etag: string|null; data: string|null }>} The content of the object. If the object does not exist, etag and data will be null.
   */
  async getObjectWithETag(
    key: string,
    opts: Record<string, any> = {}
  ): Promise<{ etag: string | null; data: string | null }> {
    this._checkKey(key);
    const { filteredOpts, conditionalHeaders } = this._filterIfHeaders(opts);
    const headers = {
      [HEADER_CONTENT_TYPE]: JSON_CONTENT_TYPE,
      [HEADER_AMZ_CONTENT_SHA256]: UNSIGNED_PAYLOAD,
      ...conditionalHeaders,
    };
    const encodedKey = uriResourceEscape(key);
    const { url, headers: signedHeaders } = await this._sign(
      "GET",
      encodedKey,
      filteredOpts,
      headers,
      ""
    );
    try {
      const res = await this._sendRequest(
        url,
        "GET",
        signedHeaders,
        "",
        [200, 404, 412, 304]
      );
      if (res.status === 404 || res.status === 412 || res.status === 304) {
        return { etag: null, data: null };
      }
      if (!res.ok) {
        throw new Error(`Failed to get object. Status: ${res.status}`);
      }

      const etag = res.headers.get("etag");
      if (!etag) {
        throw new Error("ETag not found in response headers");
      }
      const data = await res.text();
      return { etag: sanitizeETag(etag), data };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get the ETag of an object.
   * @param {string} key - The key of the object to get.
   * @param {Object} [opts={}] - Additional options for the get operation.
   * @returns {Promise<string|null>} The ETag of the object or null if the object etag does not match.
   */
  async getEtag(
    key: string,
    opts: Record<string, any> = {}
  ): Promise<string | null> {
    this._checkKey(key);
    const { filteredOpts, conditionalHeaders } = this._filterIfHeaders(opts);
    const headers = {
      [HEADER_CONTENT_TYPE]: JSON_CONTENT_TYPE,
      [HEADER_AMZ_CONTENT_SHA256]: UNSIGNED_PAYLOAD,
      ...conditionalHeaders,
    };
    const encodedKey = uriResourceEscape(key);
    const { url, headers: signedHeaders } = await this._sign(
      "HEAD",
      encodedKey,
      filteredOpts,
      headers,
      ""
    );

    const res = await this._sendRequest(
      url,
      "HEAD",
      signedHeaders,
      "",
      [200, 412, 304]
    );
    // etag does not match
    if (res.status === 412 || res.status === 304) {
      return null;
    }

    const etag = res.headers.get("etag");
    if (!etag) {
      throw new Error(`ETag not found in response headers`);
    }
    return sanitizeETag(etag);
  }

  /**
   * Get a response of an object from the bucket.
   * @param {string} key - The key of the object to get.
   * @param {boolean} [wholeFile=true] - Whether to get the whole file or a part.
   * @param {number} [rangeFrom=0] - The range from to get if not getting the whole file.
   * @param {number} [rangeTo=this.maxRequestSizeInBytes] - The range to to get if not getting the whole file. Note: rangeTo is inclusive.
   * @param {Object} [opts={}] - Additional options for the get operation.
   * @returns {Promise<Response>} Response of the object content. Use readableStream() to get the stream from .body.
   */
  async getResponse(
    key: string,
    wholeFile: boolean = true,
    rangeFrom: number = 0,
    rangeTo: number = this.maxRequestSizeInBytes,
    opts: Record<string, any> = {}
  ): Promise<Response> {
    this._checkKey(key);
    const { filteredOpts, conditionalHeaders } = this._filterIfHeaders({
      ...opts,
    });
    const headers = {
      [HEADER_CONTENT_TYPE]: JSON_CONTENT_TYPE,
      [HEADER_AMZ_CONTENT_SHA256]: UNSIGNED_PAYLOAD,
      ...(wholeFile ? {} : { range: `bytes=${rangeFrom}-${rangeTo - 1}` }),
      ...conditionalHeaders,
    };
    const encodedKey = uriResourceEscape(key);
    const { url, headers: signedHeaders } = await this._sign(
      "GET",
      encodedKey,
      filteredOpts,
      headers,
      ""
    );
    const urlWithQuery = `${url}?${new URLSearchParams(filteredOpts)}`;

    return this._sendRequest(urlWithQuery, "GET", signedHeaders);
  }

  /**
   * Put an object into the bucket.
   * @param {string} key - The key of the object to put. To create a folder, include a trailing slash.
   * @param {Buffer|string} data - The content of the object to put.
   * @returns {Promise<Response>} The response from the put operation.
   * @throws {TypeError} If the key is not a non-empty string or data is not a Buffer or string.
   */
  async put(key: string, data: string | Buffer): Promise<Response> {
    this._checkKey(key);
    if (!(data instanceof Buffer || typeof data === "string")) {
      throw new TypeError(ERROR_DATA_BUFFER_REQUIRED);
    }
    // const encodedKey = encodeURIComponent(key);
    const contentLength =
      typeof data === "string" ? Buffer.byteLength(data) : data.length;
    const headers = {
      [HEADER_CONTENT_LENGTH]: contentLength,
    };
    const encodedKey = uriResourceEscape(key);
    const { url, headers: signedHeaders } = await this._sign(
      "PUT",
      encodedKey,
      {},
      headers,
      data
    );
    return this._sendRequest(url, "PUT", signedHeaders, data, [200]);
  }

  /**
   * Delete an object from the bucket.
   * @param {string} key - The key of the object to delete.
   * @returns {Promise<boolean>} The response from the delete operation. True if the delete operation was successful, false otherwise. Note: The delete operation may return a 204 status code even if the object was not found.
   */
  async delete(key: string): Promise<boolean> {
    this._checkKey(key);
    const headers = {
      [HEADER_CONTENT_TYPE]: JSON_CONTENT_TYPE,
      [HEADER_AMZ_CONTENT_SHA256]: UNSIGNED_PAYLOAD,
    };
    const encodedKey = uriResourceEscape(key);
    const { url, headers: signedHeaders } = await this._sign(
      "DELETE",
      encodedKey,
      {},
      headers,
      ""
    );
    const res = await this._sendRequest(url, "DELETE", signedHeaders);
    if (res.status === 204 || res.status === 200) {
      return true;
    }
    return false;
  }

  async _sendRequest(
    url: string,
    method: HttpMethod,
    headers: Record<string, string | any>,
    body?: string | Buffer,
    toleratedStatusCodes: number[] = []
  ): Promise<Response> {
    const res = await fetch(url, {
      method,
      headers,
      body: ["GET", "HEAD"].includes(method) ? undefined : body,
      signal:
        this.requestAbortTimeout !== undefined
          ? AbortSignal.timeout(this.requestAbortTimeout)
          : undefined,
    });
    if (!res.ok && !toleratedStatusCodes.includes(res.status)) {
      await this._handleErrorResponse(res);
    }
    return res;
  }

  async _handleErrorResponse(res: Response) {
    const errorBody = await res.text();
    const errorCode = res.headers.get("x-amz-error-code") || "Unknown";
    const errorMessage =
      res.headers.get("x-amz-error-message") || res.statusText;

    throw new Error(
      `${ERROR_PREFIX}Request failed with status ${res.status}: ${errorCode} - ${errorMessage}, err body: ${errorBody}`
    );
  }

  _buildCanonicalQueryString(queryParams: Object): string {
    if (Object.keys(queryParams).length < 1) {
      return "";
    }

    return Object.keys(queryParams)
      .sort()
      .map(
        (key) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(
            (queryParams as Record<string, any>)[key]
          )}`
      )
      .join("&");
  }
  async _getSignatureKey(dateStamp: string): Promise<string> {
    const kDate = await _hmac(`AWS4${this.secretAccessKey}`, dateStamp);
    const kRegion = await _hmac(kDate, this.region);
    const kService = await _hmac(kRegion, S3_SERVICE);
    return _hmac(kService, AWS_REQUEST_TYPE);
  }
}

const _hash = async (content: string | Buffer): Promise<string> => {
  const hashSum = _createHash("sha256");
  hashSum.update(content);
  return hashSum.digest("hex");
};

const _hmac = async (
  key: string | Buffer,
  content: string,
  encoding?: "hex"
): Promise<string> => {
  const hmacSum = _createHmac("sha256", key);
  hmacSum.update(content);
  return hmacSum.digest(encoding);
};
export const sanitizeETag = (etag: string): string => {
  const replaceChars: Record<string, string> = {
    '"': "",
    "&quot;": "",
    "&#34;": "",
    "&QUOT;": "",
    "&#x00022": "",
  };
  return etag.replace(
    /^("|&quot;|&#34;)|("|&quot;|&#34;)$/g,
    (m) => replaceChars[m] as string
  );
};

const _parseXml = (str: string): string | object | any => {
  const unescapeXml = (value: string): string => {
    return value
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  };

  const json = {};
  const re = /<(\w)([-\w]+)(?:\/|[^>]*>((?:(?!<\1)[\s\S])*)<\/\1\2)>/gm;
  let match;

  while ((match = re.exec(str))) {
    const [, prefix, key, value] = match;
    const fullKey = prefix.toLowerCase() + key;
    const parsedValue = value != null ? _parseXml(value) : true;

    if (typeof parsedValue === "string") {
      (json as { [key: string]: any })[fullKey] = sanitizeETag(
        unescapeXml(parsedValue)
      );
    } else if (Array.isArray((json as { [key: string]: any })[fullKey])) {
      (json as { [key: string]: any })[fullKey].push(parsedValue);
    } else {
      (json as { [key: string]: any })[fullKey] =
        (json as { [key: string]: any })[fullKey] != null
          ? [(json as { [key: string]: any })[fullKey], parsedValue]
          : expectArray[fullKey]
          ? [parsedValue]
          : parsedValue;
    }
  }

  return Object.keys(json).length ? json : unescapeXml(str);
};
