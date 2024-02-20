import {createRequire} from "node:module";
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = createRequire(import.meta.url);

// node_modules/node-gyp-build-optional-packages/index.js
var require_node_gyp_build_optional_packages = __commonJS((exports, module) => {
  var load = function(dir) {
    if (typeof __webpack_require__ === "function")
      return __non_webpack_require__(load.path(dir));
    else
      return __require(load.path(dir));
  };
  var readdirSync = function(dir) {
    try {
      return fs.readdirSync(dir);
    } catch (err) {
      return [];
    }
  };
  var getFirst = function(dir, filter) {
    var files = readdirSync(dir).filter(filter);
    return files[0] && path.join(dir, files[0]);
  };
  var matchBuild = function(name) {
    return /\.node$/.test(name);
  };
  var parseTuple = function(name) {
    var arr = name.split("-");
    if (arr.length !== 2)
      return;
    var platform2 = arr[0];
    var architectures = arr[1].split("+");
    if (!platform2)
      return;
    if (!architectures.length)
      return;
    if (!architectures.every(Boolean))
      return;
    return { name, platform: platform2, architectures };
  };
  var matchTuple = function(platform2, arch2) {
    return function(tuple) {
      if (tuple == null)
        return false;
      if (tuple.platform !== platform2)
        return false;
      return tuple.architectures.includes(arch2);
    };
  };
  var compareTuples = function(a, b) {
    return a.architectures.length - b.architectures.length;
  };
  var parseTags = function(file) {
    var arr = file.split(".");
    var extension = arr.pop();
    var tags = { file, specificity: 0 };
    if (extension !== "node")
      return;
    for (var i = 0;i < arr.length; i++) {
      var tag = arr[i];
      if (tag === "node" || tag === "electron" || tag === "node-webkit") {
        tags.runtime = tag;
      } else if (tag === "napi") {
        tags.napi = true;
      } else if (tag.slice(0, 3) === "abi") {
        tags.abi = tag.slice(3);
      } else if (tag.slice(0, 2) === "uv") {
        tags.uv = tag.slice(2);
      } else if (tag.slice(0, 4) === "armv") {
        tags.armv = tag.slice(4);
      } else if (tag === "glibc" || tag === "musl") {
        tags.libc = tag;
      } else {
        continue;
      }
      tags.specificity++;
    }
    return tags;
  };
  var matchTags = function(runtime2, abi2) {
    return function(tags) {
      if (tags == null)
        return false;
      if (tags.runtime !== runtime2 && !runtimeAgnostic(tags))
        return false;
      if (tags.abi !== abi2 && !tags.napi)
        return false;
      if (tags.uv && tags.uv !== uv)
        return false;
      if (tags.armv && tags.armv !== armv)
        return false;
      if (tags.libc && tags.libc !== libc)
        return false;
      return true;
    };
  };
  var runtimeAgnostic = function(tags) {
    return tags.runtime === "node" && tags.napi;
  };
  var compareTags = function(runtime2) {
    return function(a, b) {
      if (a.runtime !== b.runtime) {
        return a.runtime === runtime2 ? -1 : 1;
      } else if (a.abi !== b.abi) {
        return a.abi ? -1 : 1;
      } else if (a.specificity !== b.specificity) {
        return a.specificity > b.specificity ? -1 : 1;
      } else {
        return 0;
      }
    };
  };
  var isElectron = function() {
    if (process.versions && process.versions.electron)
      return true;
    if (process.env.ELECTRON_RUN_AS_NODE)
      return true;
    return typeof window !== "undefined" && window.process && window.process.type === "renderer";
  };
  var isAlpine = function(platform2) {
    return platform2 === "linux" && fs.existsSync("/etc/alpine-release");
  };
  var fs = __require("fs");
  var path = __require("path");
  var url = __require("url");
  var vars = process.config && process.config.variables || {};
  var prebuildsOnly = !!process.env.PREBUILDS_ONLY;
  var versions = process.versions;
  var abi = versions.modules;
  if (versions.deno || process.isBun) {
    abi = "unsupported";
  }
  var runtime = isElectron() ? "electron" : "node";
  var arch = process.arch;
  var platform = process.platform;
  var libc = process.env.LIBC || (isAlpine(platform) ? "musl" : "glibc");
  var armv = process.env.ARM_VERSION || (arch === "arm64" ? "8" : vars.arm_version) || "";
  var uv = (versions.uv || "").split(".")[0];
  module.exports = load;
  load.path = function(dir) {
    dir = path.resolve(dir || ".");
    var packageName;
    try {
      if (typeof __webpack_require__ === "function")
        packageName = __non_webpack_require__(path.join(dir, "package.json")).name;
      else
        packageName = __require(path.join(dir, "package.json")).name;
      var varName = packageName.toUpperCase().replace(/-/g, "_") + "_PREBUILD";
      if (process.env[varName])
        dir = process.env[varName];
    } catch (err) {
    }
    if (!prebuildsOnly) {
      var release = getFirst(path.join(dir, "build/Release"), matchBuild);
      if (release)
        return release;
      var debug = getFirst(path.join(dir, "build/Debug"), matchBuild);
      if (debug)
        return debug;
    }
    var prebuild = resolve(dir);
    if (prebuild)
      return prebuild;
    var nearby = resolve(path.dirname(process.execPath));
    if (nearby)
      return nearby;
    var platformPackage = (packageName[0] == "@" ? "" : "@" + packageName + "/") + packageName + "-" + platform + "-" + arch;
    try {
      var prebuildPackage = path.dirname(__require("module").createRequire(url.pathToFileURL(path.join(dir, "package.json"))).resolve(platformPackage));
      return resolveFile(prebuildPackage);
    } catch (error) {
    }
    var target2 = [
      "platform=" + platform,
      "arch=" + arch,
      "runtime=" + runtime,
      "abi=" + abi,
      "uv=" + uv,
      armv ? "armv=" + armv : "",
      "libc=" + libc,
      "node=" + process.versions.node,
      process.versions.electron ? "electron=" + process.versions.electron : "",
      typeof __webpack_require__ === "function" ? "webpack=true" : ""
    ].filter(Boolean).join(" ");
    throw new Error("No native build was found for " + target2 + "\n    loaded from: " + dir + " and package: " + platformPackage + "\n");
    function resolve(dir2) {
      var tuples = readdirSync(path.join(dir2, "prebuilds")).map(parseTuple);
      var tuple = tuples.filter(matchTuple(platform, arch)).sort(compareTuples)[0];
      if (!tuple)
        return;
      return resolveFile(path.join(dir2, "prebuilds", tuple.name));
    }
    function resolveFile(prebuilds) {
      var parsed = readdirSync(prebuilds).map(parseTags);
      var candidates = parsed.filter(matchTags(runtime, abi));
      var winner = candidates.sort(compareTags(runtime))[0];
      if (winner)
        return path.join(prebuilds, winner.file);
    }
  };
  load.parseTags = parseTags;
  load.matchTags = matchTags;
  load.compareTags = compareTags;
  load.parseTuple = parseTuple;
  load.matchTuple = matchTuple;
  load.compareTuples = compareTuples;
});

// node_modules/msgpackr-extract/index.js
var require_msgpackr_extract = __commonJS((exports, module) => {
  var __dirname = "/home/friday/dev/Exabase/node_modules/msgpackr-extract";
  module.exports = require_node_gyp_build_optional_packages()(__dirname);
});

// src/index.ts
import {mkdirSync as mkdirSync2} from "node:fs";

// src/primitives/classes.ts
import {opendir, unlink as unlink2} from "node:fs/promises";
import {existsSync, mkdirSync} from "node:fs";

// node_modules/msgpackr/unpack.js
function checkedRead(options) {
  try {
    if (!currentUnpackr.trusted && !sequentialMode) {
      let sharedLength = currentStructures.sharedLength || 0;
      if (sharedLength < currentStructures.length)
        currentStructures.length = sharedLength;
    }
    let result;
    if (currentUnpackr.randomAccessStructure && src[position] < 64 && src[position] >= 32 && readStruct) {
      result = readStruct(src, position, srcEnd, currentUnpackr);
      src = null;
      if (!(options && options.lazy) && result)
        result = result.toJSON();
      position = srcEnd;
    } else
      result = read();
    if (bundledStrings) {
      position = bundledStrings.postBundlePosition;
      bundledStrings = null;
    }
    if (sequentialMode)
      currentStructures.restoreStructures = null;
    if (position == srcEnd) {
      if (currentStructures && currentStructures.restoreStructures)
        restoreStructures();
      currentStructures = null;
      src = null;
      if (referenceMap)
        referenceMap = null;
    } else if (position > srcEnd) {
      throw new Error("Unexpected end of MessagePack data");
    } else if (!sequentialMode) {
      let jsonView;
      try {
        jsonView = JSON.stringify(result, (_, value) => typeof value === "bigint" ? `${value}n` : value).slice(0, 100);
      } catch (error) {
        jsonView = "(JSON view not available " + error + ")";
      }
      throw new Error("Data read, but end of buffer not reached " + jsonView);
    }
    return result;
  } catch (error) {
    if (currentStructures && currentStructures.restoreStructures)
      restoreStructures();
    clearSource();
    if (error instanceof RangeError || error.message.startsWith("Unexpected end of buffer") || position > srcEnd) {
      error.incomplete = true;
    }
    throw error;
  }
}
var restoreStructures = function() {
  for (let id in currentStructures.restoreStructures) {
    currentStructures[id] = currentStructures.restoreStructures[id];
  }
  currentStructures.restoreStructures = null;
};
function read() {
  let token = src[position++];
  if (token < 160) {
    if (token < 128) {
      if (token < 64)
        return token;
      else {
        let structure = currentStructures[token & 63] || currentUnpackr.getStructures && loadStructures()[token & 63];
        if (structure) {
          if (!structure.read) {
            structure.read = createStructureReader(structure, token & 63);
          }
          return structure.read();
        } else
          return token;
      }
    } else if (token < 144) {
      token -= 128;
      if (currentUnpackr.mapsAsObjects) {
        let object = {};
        for (let i = 0;i < token; i++) {
          let key = readKey();
          if (key === "__proto__")
            key = "__proto_";
          object[key] = read();
        }
        return object;
      } else {
        let map = new Map;
        for (let i = 0;i < token; i++) {
          map.set(read(), read());
        }
        return map;
      }
    } else {
      token -= 144;
      let array = new Array(token);
      for (let i = 0;i < token; i++) {
        array[i] = read();
      }
      if (currentUnpackr.freezeData)
        return Object.freeze(array);
      return array;
    }
  } else if (token < 192) {
    let length = token - 160;
    if (srcStringEnd >= position) {
      return srcString.slice(position - srcStringStart, (position += length) - srcStringStart);
    }
    if (srcStringEnd == 0 && srcEnd < 140) {
      let string = length < 16 ? shortStringInJS(length) : longStringInJS(length);
      if (string != null)
        return string;
    }
    return readFixedString(length);
  } else {
    let value;
    switch (token) {
      case 192:
        return null;
      case 193:
        if (bundledStrings) {
          value = read();
          if (value > 0)
            return bundledStrings[1].slice(bundledStrings.position1, bundledStrings.position1 += value);
          else
            return bundledStrings[0].slice(bundledStrings.position0, bundledStrings.position0 -= value);
        }
        return C1;
      case 194:
        return false;
      case 195:
        return true;
      case 196:
        value = src[position++];
        if (value === undefined)
          throw new Error("Unexpected end of buffer");
        return readBin(value);
      case 197:
        value = dataView.getUint16(position);
        position += 2;
        return readBin(value);
      case 198:
        value = dataView.getUint32(position);
        position += 4;
        return readBin(value);
      case 199:
        return readExt(src[position++]);
      case 200:
        value = dataView.getUint16(position);
        position += 2;
        return readExt(value);
      case 201:
        value = dataView.getUint32(position);
        position += 4;
        return readExt(value);
      case 202:
        value = dataView.getFloat32(position);
        if (currentUnpackr.useFloat32 > 2) {
          let multiplier = mult10[(src[position] & 127) << 1 | src[position + 1] >> 7];
          position += 4;
          return (multiplier * value + (value > 0 ? 0.5 : -0.5) >> 0) / multiplier;
        }
        position += 4;
        return value;
      case 203:
        value = dataView.getFloat64(position);
        position += 8;
        return value;
      case 204:
        return src[position++];
      case 205:
        value = dataView.getUint16(position);
        position += 2;
        return value;
      case 206:
        value = dataView.getUint32(position);
        position += 4;
        return value;
      case 207:
        if (currentUnpackr.int64AsType === "number") {
          value = dataView.getUint32(position) * 4294967296;
          value += dataView.getUint32(position + 4);
        } else if (currentUnpackr.int64AsType === "string") {
          value = dataView.getBigUint64(position).toString();
        } else if (currentUnpackr.int64AsType === "auto") {
          value = dataView.getBigUint64(position);
          if (value <= BigInt(2) << BigInt(52))
            value = Number(value);
        } else
          value = dataView.getBigUint64(position);
        position += 8;
        return value;
      case 208:
        return dataView.getInt8(position++);
      case 209:
        value = dataView.getInt16(position);
        position += 2;
        return value;
      case 210:
        value = dataView.getInt32(position);
        position += 4;
        return value;
      case 211:
        if (currentUnpackr.int64AsType === "number") {
          value = dataView.getInt32(position) * 4294967296;
          value += dataView.getUint32(position + 4);
        } else if (currentUnpackr.int64AsType === "string") {
          value = dataView.getBigInt64(position).toString();
        } else if (currentUnpackr.int64AsType === "auto") {
          value = dataView.getBigInt64(position);
          if (value >= BigInt(-2) << BigInt(52) && value <= BigInt(2) << BigInt(52))
            value = Number(value);
        } else
          value = dataView.getBigInt64(position);
        position += 8;
        return value;
      case 212:
        value = src[position++];
        if (value == 114) {
          return recordDefinition(src[position++] & 63);
        } else {
          let extension = currentExtensions[value];
          if (extension) {
            if (extension.read) {
              position++;
              return extension.read(read());
            } else if (extension.noBuffer) {
              position++;
              return extension();
            } else
              return extension(src.subarray(position, ++position));
          } else
            throw new Error("Unknown extension " + value);
        }
      case 213:
        value = src[position];
        if (value == 114) {
          position++;
          return recordDefinition(src[position++] & 63, src[position++]);
        } else
          return readExt(2);
      case 214:
        return readExt(4);
      case 215:
        return readExt(8);
      case 216:
        return readExt(16);
      case 217:
        value = src[position++];
        if (srcStringEnd >= position) {
          return srcString.slice(position - srcStringStart, (position += value) - srcStringStart);
        }
        return readString8(value);
      case 218:
        value = dataView.getUint16(position);
        position += 2;
        if (srcStringEnd >= position) {
          return srcString.slice(position - srcStringStart, (position += value) - srcStringStart);
        }
        return readString16(value);
      case 219:
        value = dataView.getUint32(position);
        position += 4;
        if (srcStringEnd >= position) {
          return srcString.slice(position - srcStringStart, (position += value) - srcStringStart);
        }
        return readString32(value);
      case 220:
        value = dataView.getUint16(position);
        position += 2;
        return readArray(value);
      case 221:
        value = dataView.getUint32(position);
        position += 4;
        return readArray(value);
      case 222:
        value = dataView.getUint16(position);
        position += 2;
        return readMap(value);
      case 223:
        value = dataView.getUint32(position);
        position += 4;
        return readMap(value);
      default:
        if (token >= 224)
          return token - 256;
        if (token === undefined) {
          let error = new Error("Unexpected end of MessagePack data");
          error.incomplete = true;
          throw error;
        }
        throw new Error("Unknown MessagePack token " + token);
    }
  }
}
var createStructureReader = function(structure, firstId) {
  function readObject() {
    if (readObject.count++ > inlineObjectReadThreshold) {
      let readObject2 = structure.read = new Function("r", "return function(){return " + (currentUnpackr.freezeData ? "Object.freeze" : "") + "({" + structure.map((key) => key === "__proto__" ? "__proto_:r()" : validName.test(key) ? key + ":r()" : "[" + JSON.stringify(key) + "]:r()").join(",") + "})}")(read);
      if (structure.highByte === 0)
        structure.read = createSecondByteReader(firstId, structure.read);
      return readObject2();
    }
    let object = {};
    for (let i = 0, l = structure.length;i < l; i++) {
      let key = structure[i];
      if (key === "__proto__")
        key = "__proto_";
      object[key] = read();
    }
    if (currentUnpackr.freezeData)
      return Object.freeze(object);
    return object;
  }
  readObject.count = 0;
  if (structure.highByte === 0) {
    return createSecondByteReader(firstId, readObject);
  }
  return readObject;
};
function loadStructures() {
  let loadedStructures = saveState(() => {
    src = null;
    return currentUnpackr.getStructures();
  });
  return currentStructures = currentUnpackr._mergeStructures(loadedStructures, currentStructures);
}
function setExtractor(extractStrings) {
  isNativeAccelerationEnabled = true;
  readFixedString = readString(1);
  readString8 = readString(2);
  readString16 = readString(3);
  readString32 = readString(5);
  function readString(headerLength) {
    return function readString(length) {
      let string = strings[stringPosition++];
      if (string == null) {
        if (bundledStrings)
          return readStringJS(length);
        let byteOffset = src.byteOffset;
        let extraction = extractStrings(position - headerLength + byteOffset, srcEnd + byteOffset, src.buffer);
        if (typeof extraction == "string") {
          string = extraction;
          strings = EMPTY_ARRAY;
        } else {
          strings = extraction;
          stringPosition = 1;
          srcStringEnd = 1;
          string = strings[0];
          if (string === undefined)
            throw new Error("Unexpected end of buffer");
        }
      }
      let srcStringLength = string.length;
      if (srcStringLength <= length) {
        position += length;
        return string;
      }
      srcString = string;
      srcStringStart = position;
      srcStringEnd = position + srcStringLength;
      position += length;
      return string.slice(0, length);
    };
  }
}
var readStringJS = function(length) {
  let result;
  if (length < 16) {
    if (result = shortStringInJS(length))
      return result;
  }
  if (length > 64 && decoder)
    return decoder.decode(src.subarray(position, position += length));
  const end = position + length;
  const units = [];
  result = "";
  while (position < end) {
    const byte1 = src[position++];
    if ((byte1 & 128) === 0) {
      units.push(byte1);
    } else if ((byte1 & 224) === 192) {
      const byte2 = src[position++] & 63;
      units.push((byte1 & 31) << 6 | byte2);
    } else if ((byte1 & 240) === 224) {
      const byte2 = src[position++] & 63;
      const byte3 = src[position++] & 63;
      units.push((byte1 & 31) << 12 | byte2 << 6 | byte3);
    } else if ((byte1 & 248) === 240) {
      const byte2 = src[position++] & 63;
      const byte3 = src[position++] & 63;
      const byte4 = src[position++] & 63;
      let unit = (byte1 & 7) << 18 | byte2 << 12 | byte3 << 6 | byte4;
      if (unit > 65535) {
        unit -= 65536;
        units.push(unit >>> 10 & 1023 | 55296);
        unit = 56320 | unit & 1023;
      }
      units.push(unit);
    } else {
      units.push(byte1);
    }
    if (units.length >= 4096) {
      result += fromCharCode.apply(String, units);
      units.length = 0;
    }
  }
  if (units.length > 0) {
    result += fromCharCode.apply(String, units);
  }
  return result;
};
function readString(source, start, length) {
  let existingSrc = src;
  src = source;
  position = start;
  try {
    return readStringJS(length);
  } finally {
    src = existingSrc;
  }
}
var readArray = function(length) {
  let array = new Array(length);
  for (let i = 0;i < length; i++) {
    array[i] = read();
  }
  if (currentUnpackr.freezeData)
    return Object.freeze(array);
  return array;
};
var readMap = function(length) {
  if (currentUnpackr.mapsAsObjects) {
    let object = {};
    for (let i = 0;i < length; i++) {
      let key = readKey();
      if (key === "__proto__")
        key = "__proto_";
      object[key] = read();
    }
    return object;
  } else {
    let map = new Map;
    for (let i = 0;i < length; i++) {
      map.set(read(), read());
    }
    return map;
  }
};
var longStringInJS = function(length) {
  let start = position;
  let bytes = new Array(length);
  for (let i = 0;i < length; i++) {
    const byte = src[position++];
    if ((byte & 128) > 0) {
      position = start;
      return;
    }
    bytes[i] = byte;
  }
  return fromCharCode.apply(String, bytes);
};
var shortStringInJS = function(length) {
  if (length < 4) {
    if (length < 2) {
      if (length === 0)
        return "";
      else {
        let a = src[position++];
        if ((a & 128) > 1) {
          position -= 1;
          return;
        }
        return fromCharCode(a);
      }
    } else {
      let a = src[position++];
      let b = src[position++];
      if ((a & 128) > 0 || (b & 128) > 0) {
        position -= 2;
        return;
      }
      if (length < 3)
        return fromCharCode(a, b);
      let c = src[position++];
      if ((c & 128) > 0) {
        position -= 3;
        return;
      }
      return fromCharCode(a, b, c);
    }
  } else {
    let a = src[position++];
    let b = src[position++];
    let c = src[position++];
    let d = src[position++];
    if ((a & 128) > 0 || (b & 128) > 0 || (c & 128) > 0 || (d & 128) > 0) {
      position -= 4;
      return;
    }
    if (length < 6) {
      if (length === 4)
        return fromCharCode(a, b, c, d);
      else {
        let e = src[position++];
        if ((e & 128) > 0) {
          position -= 5;
          return;
        }
        return fromCharCode(a, b, c, d, e);
      }
    } else if (length < 8) {
      let e = src[position++];
      let f = src[position++];
      if ((e & 128) > 0 || (f & 128) > 0) {
        position -= 6;
        return;
      }
      if (length < 7)
        return fromCharCode(a, b, c, d, e, f);
      let g = src[position++];
      if ((g & 128) > 0) {
        position -= 7;
        return;
      }
      return fromCharCode(a, b, c, d, e, f, g);
    } else {
      let e = src[position++];
      let f = src[position++];
      let g = src[position++];
      let h = src[position++];
      if ((e & 128) > 0 || (f & 128) > 0 || (g & 128) > 0 || (h & 128) > 0) {
        position -= 8;
        return;
      }
      if (length < 10) {
        if (length === 8)
          return fromCharCode(a, b, c, d, e, f, g, h);
        else {
          let i = src[position++];
          if ((i & 128) > 0) {
            position -= 9;
            return;
          }
          return fromCharCode(a, b, c, d, e, f, g, h, i);
        }
      } else if (length < 12) {
        let i = src[position++];
        let j = src[position++];
        if ((i & 128) > 0 || (j & 128) > 0) {
          position -= 10;
          return;
        }
        if (length < 11)
          return fromCharCode(a, b, c, d, e, f, g, h, i, j);
        let k = src[position++];
        if ((k & 128) > 0) {
          position -= 11;
          return;
        }
        return fromCharCode(a, b, c, d, e, f, g, h, i, j, k);
      } else {
        let i = src[position++];
        let j = src[position++];
        let k = src[position++];
        let l = src[position++];
        if ((i & 128) > 0 || (j & 128) > 0 || (k & 128) > 0 || (l & 128) > 0) {
          position -= 12;
          return;
        }
        if (length < 14) {
          if (length === 12)
            return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l);
          else {
            let m = src[position++];
            if ((m & 128) > 0) {
              position -= 13;
              return;
            }
            return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m);
          }
        } else {
          let m = src[position++];
          let n = src[position++];
          if ((m & 128) > 0 || (n & 128) > 0) {
            position -= 14;
            return;
          }
          if (length < 15)
            return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n);
          let o = src[position++];
          if ((o & 128) > 0) {
            position -= 15;
            return;
          }
          return fromCharCode(a, b, c, d, e, f, g, h, i, j, k, l, m, n, o);
        }
      }
    }
  }
};
var readOnlyJSString = function() {
  let token = src[position++];
  let length;
  if (token < 192) {
    length = token - 160;
  } else {
    switch (token) {
      case 217:
        length = src[position++];
        break;
      case 218:
        length = dataView.getUint16(position);
        position += 2;
        break;
      case 219:
        length = dataView.getUint32(position);
        position += 4;
        break;
      default:
        throw new Error("Expected string");
    }
  }
  return readStringJS(length);
};
var readBin = function(length) {
  return currentUnpackr.copyBuffers ? Uint8Array.prototype.slice.call(src, position, position += length) : src.subarray(position, position += length);
};
var readExt = function(length) {
  let type = src[position++];
  if (currentExtensions[type]) {
    let end;
    return currentExtensions[type](src.subarray(position, end = position += length), (readPosition) => {
      position = readPosition;
      try {
        return read();
      } finally {
        position = end;
      }
    });
  } else
    throw new Error("Unknown extension type " + type);
};
var readKey = function() {
  let length = src[position++];
  if (length >= 160 && length < 192) {
    length = length - 160;
    if (srcStringEnd >= position)
      return srcString.slice(position - srcStringStart, (position += length) - srcStringStart);
    else if (!(srcStringEnd == 0 && srcEnd < 180))
      return readFixedString(length);
  } else {
    position--;
    return asSafeString(read());
  }
  let key = (length << 5 ^ (length > 1 ? dataView.getUint16(position) : length > 0 ? src[position] : 0)) & 4095;
  let entry = keyCache[key];
  let checkPosition = position;
  let end = position + length - 3;
  let chunk;
  let i = 0;
  if (entry && entry.bytes == length) {
    while (checkPosition < end) {
      chunk = dataView.getUint32(checkPosition);
      if (chunk != entry[i++]) {
        checkPosition = 1879048192;
        break;
      }
      checkPosition += 4;
    }
    end += 3;
    while (checkPosition < end) {
      chunk = src[checkPosition++];
      if (chunk != entry[i++]) {
        checkPosition = 1879048192;
        break;
      }
    }
    if (checkPosition === end) {
      position = checkPosition;
      return entry.string;
    }
    end -= 3;
    checkPosition = position;
  }
  entry = [];
  keyCache[key] = entry;
  entry.bytes = length;
  while (checkPosition < end) {
    chunk = dataView.getUint32(checkPosition);
    entry.push(chunk);
    checkPosition += 4;
  }
  end += 3;
  while (checkPosition < end) {
    chunk = src[checkPosition++];
    entry.push(chunk);
  }
  let string = length < 16 ? shortStringInJS(length) : longStringInJS(length);
  if (string != null)
    return entry.string = string;
  return entry.string = readFixedString(length);
};
var asSafeString = function(property) {
  if (typeof property === "string")
    return property;
  if (typeof property === "number")
    return property.toString();
  throw new Error("Invalid property type for record", typeof property);
};
var saveState = function(callback) {
  if (onSaveState)
    onSaveState();
  let savedSrcEnd = srcEnd;
  let savedPosition = position;
  let savedStringPosition = stringPosition;
  let savedSrcStringStart = srcStringStart;
  let savedSrcStringEnd = srcStringEnd;
  let savedSrcString = srcString;
  let savedStrings = strings;
  let savedReferenceMap = referenceMap;
  let savedBundledStrings = bundledStrings;
  let savedSrc = new Uint8Array(src.slice(0, srcEnd));
  let savedStructures = currentStructures;
  let savedStructuresContents = currentStructures.slice(0, currentStructures.length);
  let savedPackr = currentUnpackr;
  let savedSequentialMode = sequentialMode;
  let value = callback();
  srcEnd = savedSrcEnd;
  position = savedPosition;
  stringPosition = savedStringPosition;
  srcStringStart = savedSrcStringStart;
  srcStringEnd = savedSrcStringEnd;
  srcString = savedSrcString;
  strings = savedStrings;
  referenceMap = savedReferenceMap;
  bundledStrings = savedBundledStrings;
  src = savedSrc;
  sequentialMode = savedSequentialMode;
  currentStructures = savedStructures;
  currentStructures.splice(0, currentStructures.length, ...savedStructuresContents);
  currentUnpackr = savedPackr;
  dataView = new DataView(src.buffer, src.byteOffset, src.byteLength);
  return value;
};
function clearSource() {
  src = null;
  referenceMap = null;
  currentStructures = null;
}
function setReadStruct(updatedReadStruct, loadedStructs, saveState2) {
  readStruct = updatedReadStruct;
  onLoadedStructures = loadedStructs;
  onSaveState = saveState2;
}
var decoder;
try {
  decoder = new TextDecoder;
} catch (error) {
}
var src;
var srcEnd;
var position = 0;
var EMPTY_ARRAY = [];
var strings = EMPTY_ARRAY;
var stringPosition = 0;
var currentUnpackr = {};
var currentStructures;
var srcString;
var srcStringStart = 0;
var srcStringEnd = 0;
var bundledStrings;
var referenceMap;
var currentExtensions = [];
var dataView;
var defaultOptions = {
  useRecords: false,
  mapsAsObjects: true
};

class C1Type {
}
var C1 = new C1Type;
C1.name = "MessagePack 0xC1";
var sequentialMode = false;
var inlineObjectReadThreshold = 2;
var readStruct;
var onLoadedStructures;
var onSaveState;
try {
  new Function("");
} catch (error) {
  inlineObjectReadThreshold = Infinity;
}

class Unpackr {
  constructor(options) {
    if (options) {
      if (options.useRecords === false && options.mapsAsObjects === undefined)
        options.mapsAsObjects = true;
      if (options.sequential && options.trusted !== false) {
        options.trusted = true;
        if (!options.structures && options.useRecords != false) {
          options.structures = [];
          if (!options.maxSharedStructures)
            options.maxSharedStructures = 0;
        }
      }
      if (options.structures)
        options.structures.sharedLength = options.structures.length;
      else if (options.getStructures) {
        (options.structures = []).uninitialized = true;
        options.structures.sharedLength = 0;
      }
      if (options.int64AsNumber) {
        options.int64AsType = "number";
      }
    }
    Object.assign(this, options);
  }
  unpack(source, options) {
    if (src) {
      return saveState(() => {
        clearSource();
        return this ? this.unpack(source, options) : Unpackr.prototype.unpack.call(defaultOptions, source, options);
      });
    }
    if (!source.buffer && source.constructor === ArrayBuffer)
      source = typeof Buffer !== "undefined" ? Buffer.from(source) : new Uint8Array(source);
    if (typeof options === "object") {
      srcEnd = options.end || source.length;
      position = options.start || 0;
    } else {
      position = 0;
      srcEnd = options > -1 ? options : source.length;
    }
    stringPosition = 0;
    srcStringEnd = 0;
    srcString = null;
    strings = EMPTY_ARRAY;
    bundledStrings = null;
    src = source;
    try {
      dataView = source.dataView || (source.dataView = new DataView(source.buffer, source.byteOffset, source.byteLength));
    } catch (error) {
      src = null;
      if (source instanceof Uint8Array)
        throw error;
      throw new Error("Source must be a Uint8Array or Buffer but was a " + (source && typeof source == "object" ? source.constructor.name : typeof source));
    }
    if (this instanceof Unpackr) {
      currentUnpackr = this;
      if (this.structures) {
        currentStructures = this.structures;
        return checkedRead(options);
      } else if (!currentStructures || currentStructures.length > 0) {
        currentStructures = [];
      }
    } else {
      currentUnpackr = defaultOptions;
      if (!currentStructures || currentStructures.length > 0)
        currentStructures = [];
    }
    return checkedRead(options);
  }
  unpackMultiple(source, forEach) {
    let values, lastPosition = 0;
    try {
      sequentialMode = true;
      let size = source.length;
      let value = this ? this.unpack(source, size) : defaultUnpackr.unpack(source, size);
      if (forEach) {
        if (forEach(value, lastPosition, position) === false)
          return;
        while (position < size) {
          lastPosition = position;
          if (forEach(checkedRead(), lastPosition, position) === false) {
            return;
          }
        }
      } else {
        values = [value];
        while (position < size) {
          lastPosition = position;
          values.push(checkedRead());
        }
        return values;
      }
    } catch (error) {
      error.lastPosition = lastPosition;
      error.values = values;
      throw error;
    } finally {
      sequentialMode = false;
      clearSource();
    }
  }
  _mergeStructures(loadedStructures, existingStructures) {
    if (onLoadedStructures)
      loadedStructures = onLoadedStructures.call(this, loadedStructures);
    loadedStructures = loadedStructures || [];
    if (Object.isFrozen(loadedStructures))
      loadedStructures = loadedStructures.map((structure) => structure.slice(0));
    for (let i = 0, l = loadedStructures.length;i < l; i++) {
      let structure = loadedStructures[i];
      if (structure) {
        structure.isShared = true;
        if (i >= 32)
          structure.highByte = i - 32 >> 5;
      }
    }
    loadedStructures.sharedLength = loadedStructures.length;
    for (let id in existingStructures || []) {
      if (id >= 0) {
        let structure = loadedStructures[id];
        let existing = existingStructures[id];
        if (existing) {
          if (structure)
            (loadedStructures.restoreStructures || (loadedStructures.restoreStructures = []))[id] = structure;
          loadedStructures[id] = existing;
        }
      }
    }
    return this.structures = loadedStructures;
  }
  decode(source, options) {
    return this.unpack(source, options);
  }
}
var validName = /^[a-zA-Z_$][a-zA-Z\d_$]*$/;
var createSecondByteReader = (firstId, read0) => {
  return function() {
    let highByte = src[position++];
    if (highByte === 0)
      return read0();
    let id = firstId < 32 ? -(firstId + (highByte << 5)) : firstId + (highByte << 5);
    let structure = currentStructures[id] || loadStructures()[id];
    if (!structure) {
      throw new Error("Record id is not defined for " + id);
    }
    if (!structure.read)
      structure.read = createStructureReader(structure, firstId);
    return structure.read();
  };
};
var readFixedString = readStringJS;
var readString8 = readStringJS;
var readString16 = readStringJS;
var readString32 = readStringJS;
var isNativeAccelerationEnabled = false;
var fromCharCode = String.fromCharCode;
var keyCache = new Array(4096);
var recordDefinition = (id, highByte) => {
  let structure = read().map(asSafeString);
  let firstByte = id;
  if (highByte !== undefined) {
    id = id < 32 ? -((highByte << 5) + id) : (highByte << 5) + id;
    structure.highByte = highByte;
  }
  let existingStructure = currentStructures[id];
  if (existingStructure && (existingStructure.isShared || sequentialMode)) {
    (currentStructures.restoreStructures || (currentStructures.restoreStructures = []))[id] = existingStructure;
  }
  currentStructures[id] = structure;
  structure.read = createStructureReader(structure, firstByte);
  return structure.read();
};
currentExtensions[0] = () => {
};
currentExtensions[0].noBuffer = true;
currentExtensions[66] = (data) => {
  let length = data.length;
  let value = BigInt(data[0] & 128 ? data[0] - 256 : data[0]);
  for (let i = 1;i < length; i++) {
    value <<= 8n;
    value += BigInt(data[i]);
  }
  return value;
};
var errors = { Error, TypeError, ReferenceError };
currentExtensions[101] = () => {
  let data = read();
  return (errors[data[0]] || Error)(data[1]);
};
currentExtensions[105] = (data) => {
  if (currentUnpackr.structuredClone === false)
    throw new Error("Structured clone extension is disabled");
  let id = dataView.getUint32(position - 4);
  if (!referenceMap)
    referenceMap = new Map;
  let token = src[position];
  let target;
  if (token >= 144 && token < 160 || token == 220 || token == 221)
    target = [];
  else
    target = {};
  let refEntry = { target };
  referenceMap.set(id, refEntry);
  let targetProperties = read();
  if (refEntry.used)
    return Object.assign(target, targetProperties);
  refEntry.target = targetProperties;
  return targetProperties;
};
currentExtensions[112] = (data) => {
  if (currentUnpackr.structuredClone === false)
    throw new Error("Structured clone extension is disabled");
  let id = dataView.getUint32(position - 4);
  let refEntry = referenceMap.get(id);
  refEntry.used = true;
  return refEntry.target;
};
currentExtensions[115] = () => new Set(read());
var typedArrays = ["Int8", "Uint8", "Uint8Clamped", "Int16", "Uint16", "Int32", "Uint32", "Float32", "Float64", "BigInt64", "BigUint64"].map((type) => type + "Array");
var glbl = typeof globalThis === "object" ? globalThis : window;
currentExtensions[116] = (data) => {
  let typeCode = data[0];
  let typedArrayName = typedArrays[typeCode];
  if (!typedArrayName)
    throw new Error("Could not find typed array for code " + typeCode);
  return new glbl[typedArrayName](Uint8Array.prototype.slice.call(data, 1).buffer);
};
currentExtensions[120] = () => {
  let data = read();
  return new RegExp(data[0], data[1]);
};
var TEMP_BUNDLE = [];
currentExtensions[98] = (data) => {
  let dataSize = (data[0] << 24) + (data[1] << 16) + (data[2] << 8) + data[3];
  let dataPosition = position;
  position += dataSize - data.length;
  bundledStrings = TEMP_BUNDLE;
  bundledStrings = [readOnlyJSString(), readOnlyJSString()];
  bundledStrings.position0 = 0;
  bundledStrings.position1 = 0;
  bundledStrings.postBundlePosition = position;
  position = dataPosition;
  return read();
};
currentExtensions[255] = (data) => {
  if (data.length == 4)
    return new Date((data[0] * 16777216 + (data[1] << 16) + (data[2] << 8) + data[3]) * 1000);
  else if (data.length == 8)
    return new Date(((data[0] << 22) + (data[1] << 14) + (data[2] << 6) + (data[3] >> 2)) / 1e6 + ((data[3] & 3) * 4294967296 + data[4] * 16777216 + (data[5] << 16) + (data[6] << 8) + data[7]) * 1000);
  else if (data.length == 12)
    return new Date(((data[0] << 24) + (data[1] << 16) + (data[2] << 8) + data[3]) / 1e6 + ((data[4] & 128 ? -281474976710656 : 0) + data[6] * 1099511627776 + data[7] * 4294967296 + data[8] * 16777216 + (data[9] << 16) + (data[10] << 8) + data[11]) * 1000);
  else
    return new Date("invalid");
};
var mult10 = new Array(147);
for (let i = 0;i < 256; i++) {
  mult10[i] = +("1e" + Math.floor(45.15 - i * 0.30103));
}
var defaultUnpackr = new Unpackr({ useRecords: false });
var unpack = defaultUnpackr.unpack;
var unpackMultiple = defaultUnpackr.unpackMultiple;
var decode = defaultUnpackr.unpack;
var f32Array = new Float32Array(1);
var u8Array = new Uint8Array(f32Array.buffer, 0, 4);

// node_modules/msgpackr/pack.js
var writeExtBuffer = function(typedArray, type, allocateForWrite, encode) {
  let length = typedArray.byteLength;
  if (length + 1 < 256) {
    var { target, position: position2 } = allocateForWrite(4 + length);
    target[position2++] = 199;
    target[position2++] = length + 1;
  } else if (length + 1 < 65536) {
    var { target, position: position2 } = allocateForWrite(5 + length);
    target[position2++] = 200;
    target[position2++] = length + 1 >> 8;
    target[position2++] = length + 1 & 255;
  } else {
    var { target, position: position2, targetView } = allocateForWrite(7 + length);
    target[position2++] = 201;
    targetView.setUint32(position2, length + 1);
    position2 += 4;
  }
  target[position2++] = 116;
  target[position2++] = type;
  target.set(new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength), position2);
};
var writeBuffer = function(buffer, allocateForWrite) {
  let length = buffer.byteLength;
  var target, position2;
  if (length < 256) {
    var { target, position: position2 } = allocateForWrite(length + 2);
    target[position2++] = 196;
    target[position2++] = length;
  } else if (length < 65536) {
    var { target, position: position2 } = allocateForWrite(length + 3);
    target[position2++] = 197;
    target[position2++] = length >> 8;
    target[position2++] = length & 255;
  } else {
    var { target, position: position2, targetView } = allocateForWrite(length + 5);
    target[position2++] = 198;
    targetView.setUint32(position2, length);
    position2 += 4;
  }
  target.set(buffer, position2);
};
var writeExtensionData = function(result, target, position2, type) {
  let length = result.length;
  switch (length) {
    case 1:
      target[position2++] = 212;
      break;
    case 2:
      target[position2++] = 213;
      break;
    case 4:
      target[position2++] = 214;
      break;
    case 8:
      target[position2++] = 215;
      break;
    case 16:
      target[position2++] = 216;
      break;
    default:
      if (length < 256) {
        target[position2++] = 199;
        target[position2++] = length;
      } else if (length < 65536) {
        target[position2++] = 200;
        target[position2++] = length >> 8;
        target[position2++] = length & 255;
      } else {
        target[position2++] = 201;
        target[position2++] = length >> 24;
        target[position2++] = length >> 16 & 255;
        target[position2++] = length >> 8 & 255;
        target[position2++] = length & 255;
      }
  }
  target[position2++] = type;
  target.set(result, position2);
  position2 += length;
  return position2;
};
var insertIds = function(serialized, idsToInsert) {
  let nextId;
  let distanceToMove = idsToInsert.length * 6;
  let lastEnd = serialized.length - distanceToMove;
  while (nextId = idsToInsert.pop()) {
    let offset = nextId.offset;
    let id = nextId.id;
    serialized.copyWithin(offset + distanceToMove, offset, lastEnd);
    distanceToMove -= 6;
    let position2 = offset + distanceToMove;
    serialized[position2++] = 214;
    serialized[position2++] = 105;
    serialized[position2++] = id >> 24;
    serialized[position2++] = id >> 16 & 255;
    serialized[position2++] = id >> 8 & 255;
    serialized[position2++] = id & 255;
    lastEnd = offset;
  }
  return serialized;
};
var writeBundles = function(start, pack, incrementPosition) {
  if (bundledStrings2.length > 0) {
    targetView.setUint32(bundledStrings2.position + start, position2 + incrementPosition - bundledStrings2.position - start);
    bundledStrings2.stringsPosition = position2 - start;
    let writeStrings = bundledStrings2;
    bundledStrings2 = null;
    pack(writeStrings[0]);
    pack(writeStrings[1]);
  }
};
var prepareStructures = function(structures, packr) {
  structures.isCompatible = (existingStructures) => {
    let compatible = !existingStructures || (packr.lastNamedStructuresLength || 0) === existingStructures.length;
    if (!compatible)
      packr._mergeStructures(existingStructures);
    return compatible;
  };
  return structures;
};
function setWriteStructSlots(writeSlots, makeStructures) {
  writeStructSlots = writeSlots;
  prepareStructures = makeStructures;
}
var textEncoder;
try {
  textEncoder = new TextEncoder;
} catch (error) {
}
var extensions;
var extensionClasses;
var hasNodeBuffer = typeof Buffer !== "undefined";
var ByteArrayAllocate = hasNodeBuffer ? function(length) {
  return Buffer.allocUnsafeSlow(length);
} : Uint8Array;
var ByteArray = hasNodeBuffer ? Buffer : Uint8Array;
var MAX_BUFFER_SIZE = hasNodeBuffer ? 4294967296 : 2144337920;
var target;
var keysTarget;
var targetView;
var position2 = 0;
var safeEnd;
var bundledStrings2 = null;
var writeStructSlots;
var MAX_BUNDLE_SIZE = 21760;
var hasNonLatin = /[\u0080-\uFFFF]/;
var RECORD_SYMBOL = Symbol("record-id");

class Packr extends Unpackr {
  constructor(options) {
    super(options);
    this.offset = 0;
    let typeBuffer;
    let start;
    let hasSharedUpdate;
    let structures;
    let referenceMap2;
    let encodeUtf8 = ByteArray.prototype.utf8Write ? function(string, position3) {
      return target.utf8Write(string, position3, 4294967295);
    } : textEncoder && textEncoder.encodeInto ? function(string, position3) {
      return textEncoder.encodeInto(string, target.subarray(position3)).written;
    } : false;
    let packr = this;
    if (!options)
      options = {};
    let isSequential = options && options.sequential;
    let hasSharedStructures = options.structures || options.saveStructures;
    let maxSharedStructures = options.maxSharedStructures;
    if (maxSharedStructures == null)
      maxSharedStructures = hasSharedStructures ? 32 : 0;
    if (maxSharedStructures > 8160)
      throw new Error("Maximum maxSharedStructure is 8160");
    if (options.structuredClone && options.moreTypes == undefined) {
      this.moreTypes = true;
    }
    let maxOwnStructures = options.maxOwnStructures;
    if (maxOwnStructures == null)
      maxOwnStructures = hasSharedStructures ? 32 : 64;
    if (!this.structures && options.useRecords != false)
      this.structures = [];
    let useTwoByteRecords = maxSharedStructures > 32 || maxOwnStructures + maxSharedStructures > 64;
    let sharedLimitId = maxSharedStructures + 64;
    let maxStructureId = maxSharedStructures + maxOwnStructures + 64;
    if (maxStructureId > 8256) {
      throw new Error("Maximum maxSharedStructure + maxOwnStructure is 8192");
    }
    let recordIdsToRemove = [];
    let transitionsCount = 0;
    let serializationsSinceTransitionRebuild = 0;
    this.pack = this.encode = function(value, encodeOptions) {
      if (!target) {
        target = new ByteArrayAllocate(8192);
        targetView = target.dataView || (target.dataView = new DataView(target.buffer, 0, 8192));
        position2 = 0;
      }
      safeEnd = target.length - 10;
      if (safeEnd - position2 < 2048) {
        target = new ByteArrayAllocate(target.length);
        targetView = target.dataView || (target.dataView = new DataView(target.buffer, 0, target.length));
        safeEnd = target.length - 10;
        position2 = 0;
      } else
        position2 = position2 + 7 & 2147483640;
      start = position2;
      if (encodeOptions & RESERVE_START_SPACE)
        position2 += encodeOptions & 255;
      referenceMap2 = packr.structuredClone ? new Map : null;
      if (packr.bundleStrings && typeof value !== "string") {
        bundledStrings2 = [];
        bundledStrings2.size = Infinity;
      } else
        bundledStrings2 = null;
      structures = packr.structures;
      if (structures) {
        if (structures.uninitialized)
          structures = packr._mergeStructures(packr.getStructures());
        let sharedLength = structures.sharedLength || 0;
        if (sharedLength > maxSharedStructures) {
          throw new Error("Shared structures is larger than maximum shared structures, try increasing maxSharedStructures to " + structures.sharedLength);
        }
        if (!structures.transitions) {
          structures.transitions = Object.create(null);
          for (let i = 0;i < sharedLength; i++) {
            let keys = structures[i];
            if (!keys)
              continue;
            let nextTransition, transition = structures.transitions;
            for (let j = 0, l = keys.length;j < l; j++) {
              let key = keys[j];
              nextTransition = transition[key];
              if (!nextTransition) {
                nextTransition = transition[key] = Object.create(null);
              }
              transition = nextTransition;
            }
            transition[RECORD_SYMBOL] = i + 64;
          }
          this.lastNamedStructuresLength = sharedLength;
        }
        if (!isSequential) {
          structures.nextId = sharedLength + 64;
        }
      }
      if (hasSharedUpdate)
        hasSharedUpdate = false;
      let encodingError;
      try {
        if (packr.randomAccessStructure && value && value.constructor && value.constructor === Object)
          writeStruct(value);
        else
          pack(value);
        let lastBundle = bundledStrings2;
        if (bundledStrings2)
          writeBundles(start, pack, 0);
        if (referenceMap2 && referenceMap2.idsToInsert) {
          let idsToInsert = referenceMap2.idsToInsert.sort((a, b) => a.offset > b.offset ? 1 : -1);
          let i = idsToInsert.length;
          let incrementPosition = -1;
          while (lastBundle && i > 0) {
            let insertionPoint = idsToInsert[--i].offset + start;
            if (insertionPoint < lastBundle.stringsPosition + start && incrementPosition === -1)
              incrementPosition = 0;
            if (insertionPoint > lastBundle.position + start) {
              if (incrementPosition >= 0)
                incrementPosition += 6;
            } else {
              if (incrementPosition >= 0) {
                targetView.setUint32(lastBundle.position + start, targetView.getUint32(lastBundle.position + start) + incrementPosition);
                incrementPosition = -1;
              }
              lastBundle = lastBundle.previous;
              i++;
            }
          }
          if (incrementPosition >= 0 && lastBundle) {
            targetView.setUint32(lastBundle.position + start, targetView.getUint32(lastBundle.position + start) + incrementPosition);
          }
          position2 += idsToInsert.length * 6;
          if (position2 > safeEnd)
            makeRoom(position2);
          packr.offset = position2;
          let serialized = insertIds(target.subarray(start, position2), idsToInsert);
          referenceMap2 = null;
          return serialized;
        }
        packr.offset = position2;
        if (encodeOptions & REUSE_BUFFER_MODE) {
          target.start = start;
          target.end = position2;
          return target;
        }
        return target.subarray(start, position2);
      } catch (error) {
        encodingError = error;
        throw error;
      } finally {
        if (structures) {
          resetStructures();
          if (hasSharedUpdate && packr.saveStructures) {
            let sharedLength = structures.sharedLength || 0;
            let returnBuffer = target.subarray(start, position2);
            let newSharedData = prepareStructures(structures, packr);
            if (!encodingError) {
              if (packr.saveStructures(newSharedData, newSharedData.isCompatible) === false) {
                return packr.pack(value, encodeOptions);
              }
              packr.lastNamedStructuresLength = sharedLength;
              return returnBuffer;
            }
          }
        }
        if (encodeOptions & RESET_BUFFER_MODE)
          position2 = start;
      }
    };
    const resetStructures = () => {
      if (serializationsSinceTransitionRebuild < 10)
        serializationsSinceTransitionRebuild++;
      let sharedLength = structures.sharedLength || 0;
      if (structures.length > sharedLength && !isSequential)
        structures.length = sharedLength;
      if (transitionsCount > 1e4) {
        structures.transitions = null;
        serializationsSinceTransitionRebuild = 0;
        transitionsCount = 0;
        if (recordIdsToRemove.length > 0)
          recordIdsToRemove = [];
      } else if (recordIdsToRemove.length > 0 && !isSequential) {
        for (let i = 0, l = recordIdsToRemove.length;i < l; i++) {
          recordIdsToRemove[i][RECORD_SYMBOL] = 0;
        }
        recordIdsToRemove = [];
      }
    };
    const packArray = (value) => {
      var length = value.length;
      if (length < 16) {
        target[position2++] = 144 | length;
      } else if (length < 65536) {
        target[position2++] = 220;
        target[position2++] = length >> 8;
        target[position2++] = length & 255;
      } else {
        target[position2++] = 221;
        targetView.setUint32(position2, length);
        position2 += 4;
      }
      for (let i = 0;i < length; i++) {
        pack(value[i]);
      }
    };
    const pack = (value) => {
      if (position2 > safeEnd)
        target = makeRoom(position2);
      var type = typeof value;
      var length;
      if (type === "string") {
        let strLength = value.length;
        if (bundledStrings2 && strLength >= 4 && strLength < 4096) {
          if ((bundledStrings2.size += strLength) > MAX_BUNDLE_SIZE) {
            let extStart;
            let maxBytes2 = (bundledStrings2[0] ? bundledStrings2[0].length * 3 + bundledStrings2[1].length : 0) + 10;
            if (position2 + maxBytes2 > safeEnd)
              target = makeRoom(position2 + maxBytes2);
            let lastBundle;
            if (bundledStrings2.position) {
              lastBundle = bundledStrings2;
              target[position2] = 200;
              position2 += 3;
              target[position2++] = 98;
              extStart = position2 - start;
              position2 += 4;
              writeBundles(start, pack, 0);
              targetView.setUint16(extStart + start - 3, position2 - start - extStart);
            } else {
              target[position2++] = 214;
              target[position2++] = 98;
              extStart = position2 - start;
              position2 += 4;
            }
            bundledStrings2 = ["", ""];
            bundledStrings2.previous = lastBundle;
            bundledStrings2.size = 0;
            bundledStrings2.position = extStart;
          }
          let twoByte = hasNonLatin.test(value);
          bundledStrings2[twoByte ? 0 : 1] += value;
          target[position2++] = 193;
          pack(twoByte ? -strLength : strLength);
          return;
        }
        let headerSize;
        if (strLength < 32) {
          headerSize = 1;
        } else if (strLength < 256) {
          headerSize = 2;
        } else if (strLength < 65536) {
          headerSize = 3;
        } else {
          headerSize = 5;
        }
        let maxBytes = strLength * 3;
        if (position2 + maxBytes > safeEnd)
          target = makeRoom(position2 + maxBytes);
        if (strLength < 64 || !encodeUtf8) {
          let i, c1, c2, strPosition = position2 + headerSize;
          for (i = 0;i < strLength; i++) {
            c1 = value.charCodeAt(i);
            if (c1 < 128) {
              target[strPosition++] = c1;
            } else if (c1 < 2048) {
              target[strPosition++] = c1 >> 6 | 192;
              target[strPosition++] = c1 & 63 | 128;
            } else if ((c1 & 64512) === 55296 && ((c2 = value.charCodeAt(i + 1)) & 64512) === 56320) {
              c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
              i++;
              target[strPosition++] = c1 >> 18 | 240;
              target[strPosition++] = c1 >> 12 & 63 | 128;
              target[strPosition++] = c1 >> 6 & 63 | 128;
              target[strPosition++] = c1 & 63 | 128;
            } else {
              target[strPosition++] = c1 >> 12 | 224;
              target[strPosition++] = c1 >> 6 & 63 | 128;
              target[strPosition++] = c1 & 63 | 128;
            }
          }
          length = strPosition - position2 - headerSize;
        } else {
          length = encodeUtf8(value, position2 + headerSize);
        }
        if (length < 32) {
          target[position2++] = 160 | length;
        } else if (length < 256) {
          if (headerSize < 2) {
            target.copyWithin(position2 + 2, position2 + 1, position2 + 1 + length);
          }
          target[position2++] = 217;
          target[position2++] = length;
        } else if (length < 65536) {
          if (headerSize < 3) {
            target.copyWithin(position2 + 3, position2 + 2, position2 + 2 + length);
          }
          target[position2++] = 218;
          target[position2++] = length >> 8;
          target[position2++] = length & 255;
        } else {
          if (headerSize < 5) {
            target.copyWithin(position2 + 5, position2 + 3, position2 + 3 + length);
          }
          target[position2++] = 219;
          targetView.setUint32(position2, length);
          position2 += 4;
        }
        position2 += length;
      } else if (type === "number") {
        if (value >>> 0 === value) {
          if (value < 32 || value < 128 && this.useRecords === false || value < 64 && !this.randomAccessStructure) {
            target[position2++] = value;
          } else if (value < 256) {
            target[position2++] = 204;
            target[position2++] = value;
          } else if (value < 65536) {
            target[position2++] = 205;
            target[position2++] = value >> 8;
            target[position2++] = value & 255;
          } else {
            target[position2++] = 206;
            targetView.setUint32(position2, value);
            position2 += 4;
          }
        } else if (value >> 0 === value) {
          if (value >= -32) {
            target[position2++] = 256 + value;
          } else if (value >= -128) {
            target[position2++] = 208;
            target[position2++] = value + 256;
          } else if (value >= -32768) {
            target[position2++] = 209;
            targetView.setInt16(position2, value);
            position2 += 2;
          } else {
            target[position2++] = 210;
            targetView.setInt32(position2, value);
            position2 += 4;
          }
        } else {
          let useFloat32;
          if ((useFloat32 = this.useFloat32) > 0 && value < 4294967296 && value >= -2147483648) {
            target[position2++] = 202;
            targetView.setFloat32(position2, value);
            let xShifted;
            if (useFloat32 < 4 || (xShifted = value * mult10[(target[position2] & 127) << 1 | target[position2 + 1] >> 7]) >> 0 === xShifted) {
              position2 += 4;
              return;
            } else
              position2--;
          }
          target[position2++] = 203;
          targetView.setFloat64(position2, value);
          position2 += 8;
        }
      } else if (type === "object" || type === "function") {
        if (!value)
          target[position2++] = 192;
        else {
          if (referenceMap2) {
            let referee = referenceMap2.get(value);
            if (referee) {
              if (!referee.id) {
                let idsToInsert = referenceMap2.idsToInsert || (referenceMap2.idsToInsert = []);
                referee.id = idsToInsert.push(referee);
              }
              target[position2++] = 214;
              target[position2++] = 112;
              targetView.setUint32(position2, referee.id);
              position2 += 4;
              return;
            } else
              referenceMap2.set(value, { offset: position2 - start });
          }
          let constructor = value.constructor;
          if (constructor === Object) {
            writeObject(value, true);
          } else if (constructor === Array) {
            packArray(value);
          } else if (constructor === Map) {
            if (this.mapAsEmptyObject)
              target[position2++] = 128;
            else {
              length = value.size;
              if (length < 16) {
                target[position2++] = 128 | length;
              } else if (length < 65536) {
                target[position2++] = 222;
                target[position2++] = length >> 8;
                target[position2++] = length & 255;
              } else {
                target[position2++] = 223;
                targetView.setUint32(position2, length);
                position2 += 4;
              }
              for (let [key, entryValue] of value) {
                pack(key);
                pack(entryValue);
              }
            }
          } else {
            for (let i = 0, l = extensions.length;i < l; i++) {
              let extensionClass = extensionClasses[i];
              if (value instanceof extensionClass) {
                let extension = extensions[i];
                if (extension.write) {
                  if (extension.type) {
                    target[position2++] = 212;
                    target[position2++] = extension.type;
                    target[position2++] = 0;
                  }
                  let writeResult = extension.write.call(this, value);
                  if (writeResult === value) {
                    if (Array.isArray(value)) {
                      packArray(value);
                    } else {
                      writeObject(value);
                    }
                  } else {
                    pack(writeResult);
                  }
                  return;
                }
                let currentTarget = target;
                let currentTargetView = targetView;
                let currentPosition = position2;
                target = null;
                let result;
                try {
                  result = extension.pack.call(this, value, (size) => {
                    target = currentTarget;
                    currentTarget = null;
                    position2 += size;
                    if (position2 > safeEnd)
                      makeRoom(position2);
                    return {
                      target,
                      targetView,
                      position: position2 - size
                    };
                  }, pack);
                } finally {
                  if (currentTarget) {
                    target = currentTarget;
                    targetView = currentTargetView;
                    position2 = currentPosition;
                    safeEnd = target.length - 10;
                  }
                }
                if (result) {
                  if (result.length + position2 > safeEnd)
                    makeRoom(result.length + position2);
                  position2 = writeExtensionData(result, target, position2, extension.type);
                }
                return;
              }
            }
            if (Array.isArray(value)) {
              packArray(value);
            } else {
              if (value.toJSON) {
                const json = value.toJSON();
                if (json !== value)
                  return pack(json);
              }
              if (type === "function")
                return pack(this.writeFunction && this.writeFunction(value));
              writeObject(value, !value.hasOwnProperty);
            }
          }
        }
      } else if (type === "boolean") {
        target[position2++] = value ? 195 : 194;
      } else if (type === "bigint") {
        if (value < BigInt(1) << BigInt(63) && value >= -(BigInt(1) << BigInt(63))) {
          target[position2++] = 211;
          targetView.setBigInt64(position2, value);
        } else if (value < BigInt(1) << BigInt(64) && value > 0) {
          target[position2++] = 207;
          targetView.setBigUint64(position2, value);
        } else {
          if (this.largeBigIntToFloat) {
            target[position2++] = 203;
            targetView.setFloat64(position2, Number(value));
          } else if (this.useBigIntExtension && value < 2n ** 1023n && value > -(2n ** 1023n)) {
            target[position2++] = 199;
            position2++;
            target[position2++] = 66;
            let bytes = [];
            let alignedSign;
            do {
              let byte = value & 0xffn;
              alignedSign = (byte & 0x80n) === (value < 0n ? 0x80n : 0n);
              bytes.push(byte);
              value >>= 8n;
            } while (!((value === 0n || value === -1n) && alignedSign));
            target[position2 - 2] = bytes.length;
            for (let i = bytes.length;i > 0; ) {
              target[position2++] = Number(bytes[--i]);
            }
            return;
          } else {
            throw new RangeError(value + " was too large to fit in MessagePack 64-bit integer format, use useBigIntExtension or set largeBigIntToFloat to convert to float-64");
          }
        }
        position2 += 8;
      } else if (type === "undefined") {
        if (this.encodeUndefinedAsNil)
          target[position2++] = 192;
        else {
          target[position2++] = 212;
          target[position2++] = 0;
          target[position2++] = 0;
        }
      } else {
        throw new Error("Unknown type: " + type);
      }
    };
    const writePlainObject = this.variableMapSize || this.coercibleKeyAsNumber ? (object) => {
      let keys = Object.keys(object);
      let length = keys.length;
      if (length < 16) {
        target[position2++] = 128 | length;
      } else if (length < 65536) {
        target[position2++] = 222;
        target[position2++] = length >> 8;
        target[position2++] = length & 255;
      } else {
        target[position2++] = 223;
        targetView.setUint32(position2, length);
        position2 += 4;
      }
      let key;
      if (this.coercibleKeyAsNumber) {
        for (let i = 0;i < length; i++) {
          key = keys[i];
          let num = Number(key);
          pack(isNaN(num) ? key : num);
          pack(object[key]);
        }
      } else {
        for (let i = 0;i < length; i++) {
          pack(key = keys[i]);
          pack(object[key]);
        }
      }
    } : (object, safePrototype) => {
      target[position2++] = 222;
      let objectOffset = position2 - start;
      position2 += 2;
      let size = 0;
      for (let key in object) {
        if (safePrototype || object.hasOwnProperty(key)) {
          pack(key);
          pack(object[key]);
          size++;
        }
      }
      target[objectOffset++ + start] = size >> 8;
      target[objectOffset + start] = size & 255;
    };
    const writeRecord = this.useRecords === false ? writePlainObject : options.progressiveRecords && !useTwoByteRecords ? (object, safePrototype) => {
      let nextTransition, transition = structures.transitions || (structures.transitions = Object.create(null));
      let objectOffset = position2++ - start;
      let wroteKeys;
      for (let key in object) {
        if (safePrototype || object.hasOwnProperty(key)) {
          nextTransition = transition[key];
          if (nextTransition)
            transition = nextTransition;
          else {
            let keys = Object.keys(object);
            let lastTransition = transition;
            transition = structures.transitions;
            let newTransitions = 0;
            for (let i = 0, l = keys.length;i < l; i++) {
              let key2 = keys[i];
              nextTransition = transition[key2];
              if (!nextTransition) {
                nextTransition = transition[key2] = Object.create(null);
                newTransitions++;
              }
              transition = nextTransition;
            }
            if (objectOffset + start + 1 == position2) {
              position2--;
              newRecord(transition, keys, newTransitions);
            } else
              insertNewRecord(transition, keys, objectOffset, newTransitions);
            wroteKeys = true;
            transition = lastTransition[key];
          }
          pack(object[key]);
        }
      }
      if (!wroteKeys) {
        let recordId = transition[RECORD_SYMBOL];
        if (recordId)
          target[objectOffset + start] = recordId;
        else
          insertNewRecord(transition, Object.keys(object), objectOffset, 0);
      }
    } : (object, safePrototype) => {
      let nextTransition, transition = structures.transitions || (structures.transitions = Object.create(null));
      let newTransitions = 0;
      for (let key in object)
        if (safePrototype || object.hasOwnProperty(key)) {
          nextTransition = transition[key];
          if (!nextTransition) {
            nextTransition = transition[key] = Object.create(null);
            newTransitions++;
          }
          transition = nextTransition;
        }
      let recordId = transition[RECORD_SYMBOL];
      if (recordId) {
        if (recordId >= 96 && useTwoByteRecords) {
          target[position2++] = ((recordId -= 96) & 31) + 96;
          target[position2++] = recordId >> 5;
        } else
          target[position2++] = recordId;
      } else {
        newRecord(transition, transition.__keys__ || Object.keys(object), newTransitions);
      }
      for (let key in object)
        if (safePrototype || object.hasOwnProperty(key)) {
          pack(object[key]);
        }
    };
    const checkUseRecords = typeof this.useRecords == "function" && this.useRecords;
    const writeObject = checkUseRecords ? (object, safePrototype) => {
      checkUseRecords(object) ? writeRecord(object, safePrototype) : writePlainObject(object, safePrototype);
    } : writeRecord;
    const makeRoom = (end) => {
      let newSize;
      if (end > 16777216) {
        if (end - start > MAX_BUFFER_SIZE)
          throw new Error("Packed buffer would be larger than maximum buffer size");
        newSize = Math.min(MAX_BUFFER_SIZE, Math.round(Math.max((end - start) * (end > 67108864 ? 1.25 : 2), 4194304) / 4096) * 4096);
      } else
        newSize = (Math.max(end - start << 2, target.length - 1) >> 12) + 1 << 12;
      let newBuffer = new ByteArrayAllocate(newSize);
      targetView = newBuffer.dataView || (newBuffer.dataView = new DataView(newBuffer.buffer, 0, newSize));
      end = Math.min(end, target.length);
      if (target.copy)
        target.copy(newBuffer, 0, start, end);
      else
        newBuffer.set(target.slice(start, end));
      position2 -= start;
      start = 0;
      safeEnd = newBuffer.length - 10;
      return target = newBuffer;
    };
    const newRecord = (transition, keys, newTransitions) => {
      let recordId = structures.nextId;
      if (!recordId)
        recordId = 64;
      if (recordId < sharedLimitId && this.shouldShareStructure && !this.shouldShareStructure(keys)) {
        recordId = structures.nextOwnId;
        if (!(recordId < maxStructureId))
          recordId = sharedLimitId;
        structures.nextOwnId = recordId + 1;
      } else {
        if (recordId >= maxStructureId)
          recordId = sharedLimitId;
        structures.nextId = recordId + 1;
      }
      let highByte = keys.highByte = recordId >= 96 && useTwoByteRecords ? recordId - 96 >> 5 : -1;
      transition[RECORD_SYMBOL] = recordId;
      transition.__keys__ = keys;
      structures[recordId - 64] = keys;
      if (recordId < sharedLimitId) {
        keys.isShared = true;
        structures.sharedLength = recordId - 63;
        hasSharedUpdate = true;
        if (highByte >= 0) {
          target[position2++] = (recordId & 31) + 96;
          target[position2++] = highByte;
        } else {
          target[position2++] = recordId;
        }
      } else {
        if (highByte >= 0) {
          target[position2++] = 213;
          target[position2++] = 114;
          target[position2++] = (recordId & 31) + 96;
          target[position2++] = highByte;
        } else {
          target[position2++] = 212;
          target[position2++] = 114;
          target[position2++] = recordId;
        }
        if (newTransitions)
          transitionsCount += serializationsSinceTransitionRebuild * newTransitions;
        if (recordIdsToRemove.length >= maxOwnStructures)
          recordIdsToRemove.shift()[RECORD_SYMBOL] = 0;
        recordIdsToRemove.push(transition);
        pack(keys);
      }
    };
    const insertNewRecord = (transition, keys, insertionOffset, newTransitions) => {
      let mainTarget = target;
      let mainPosition = position2;
      let mainSafeEnd = safeEnd;
      let mainStart = start;
      target = keysTarget;
      position2 = 0;
      start = 0;
      if (!target)
        keysTarget = target = new ByteArrayAllocate(8192);
      safeEnd = target.length - 10;
      newRecord(transition, keys, newTransitions);
      keysTarget = target;
      let keysPosition = position2;
      target = mainTarget;
      position2 = mainPosition;
      safeEnd = mainSafeEnd;
      start = mainStart;
      if (keysPosition > 1) {
        let newEnd = position2 + keysPosition - 1;
        if (newEnd > safeEnd)
          makeRoom(newEnd);
        let insertionPosition = insertionOffset + start;
        target.copyWithin(insertionPosition + keysPosition, insertionPosition + 1, position2);
        target.set(keysTarget.slice(0, keysPosition), insertionPosition);
        position2 = newEnd;
      } else {
        target[insertionOffset + start] = keysTarget[0];
      }
    };
    const writeStruct = (object, safePrototype) => {
      let newPosition = writeStructSlots(object, target, start, position2, structures, makeRoom, (value, newPosition2, notifySharedUpdate) => {
        if (notifySharedUpdate)
          return hasSharedUpdate = true;
        position2 = newPosition2;
        let startTarget = target;
        pack(value);
        resetStructures();
        if (startTarget !== target) {
          return { position: position2, targetView, target };
        }
        return position2;
      }, this);
      if (newPosition === 0)
        return writeObject(object, true);
      position2 = newPosition;
    };
  }
  useBuffer(buffer) {
    target = buffer;
    targetView = new DataView(target.buffer, target.byteOffset, target.byteLength);
    position2 = 0;
  }
  clearSharedData() {
    if (this.structures)
      this.structures = [];
    if (this.typedStructs)
      this.typedStructs = [];
  }
}
extensionClasses = [Date, Set, Error, RegExp, ArrayBuffer, Object.getPrototypeOf(Uint8Array.prototype).constructor, C1Type];
extensions = [{
  pack(date, allocateForWrite, pack) {
    let seconds = date.getTime() / 1000;
    if ((this.useTimestamp32 || date.getMilliseconds() === 0) && seconds >= 0 && seconds < 4294967296) {
      let { target: target2, targetView: targetView2, position: position3 } = allocateForWrite(6);
      target2[position3++] = 214;
      target2[position3++] = 255;
      targetView2.setUint32(position3, seconds);
    } else if (seconds > 0 && seconds < 4294967296) {
      let { target: target2, targetView: targetView2, position: position3 } = allocateForWrite(10);
      target2[position3++] = 215;
      target2[position3++] = 255;
      targetView2.setUint32(position3, date.getMilliseconds() * 4000000 + (seconds / 1000 / 4294967296 >> 0));
      targetView2.setUint32(position3 + 4, seconds);
    } else if (isNaN(seconds)) {
      if (this.onInvalidDate) {
        allocateForWrite(0);
        return pack(this.onInvalidDate());
      }
      let { target: target2, targetView: targetView2, position: position3 } = allocateForWrite(3);
      target2[position3++] = 212;
      target2[position3++] = 255;
      target2[position3++] = 255;
    } else {
      let { target: target2, targetView: targetView2, position: position3 } = allocateForWrite(15);
      target2[position3++] = 199;
      target2[position3++] = 12;
      target2[position3++] = 255;
      targetView2.setUint32(position3, date.getMilliseconds() * 1e6);
      targetView2.setBigInt64(position3 + 4, BigInt(Math.floor(seconds)));
    }
  }
}, {
  pack(set, allocateForWrite, pack) {
    if (this.setAsEmptyObject) {
      allocateForWrite(0);
      return pack({});
    }
    let array = Array.from(set);
    let { target: target2, position: position3 } = allocateForWrite(this.moreTypes ? 3 : 0);
    if (this.moreTypes) {
      target2[position3++] = 212;
      target2[position3++] = 115;
      target2[position3++] = 0;
    }
    pack(array);
  }
}, {
  pack(error, allocateForWrite, pack) {
    let { target: target2, position: position3 } = allocateForWrite(this.moreTypes ? 3 : 0);
    if (this.moreTypes) {
      target2[position3++] = 212;
      target2[position3++] = 101;
      target2[position3++] = 0;
    }
    pack([error.name, error.message]);
  }
}, {
  pack(regex, allocateForWrite, pack) {
    let { target: target2, position: position3 } = allocateForWrite(this.moreTypes ? 3 : 0);
    if (this.moreTypes) {
      target2[position3++] = 212;
      target2[position3++] = 120;
      target2[position3++] = 0;
    }
    pack([regex.source, regex.flags]);
  }
}, {
  pack(arrayBuffer, allocateForWrite) {
    if (this.moreTypes)
      writeExtBuffer(arrayBuffer, 16, allocateForWrite);
    else
      writeBuffer(hasNodeBuffer ? Buffer.from(arrayBuffer) : new Uint8Array(arrayBuffer), allocateForWrite);
  }
}, {
  pack(typedArray, allocateForWrite) {
    let constructor = typedArray.constructor;
    if (constructor !== ByteArray && this.moreTypes)
      writeExtBuffer(typedArray, typedArrays.indexOf(constructor.name), allocateForWrite);
    else
      writeBuffer(typedArray, allocateForWrite);
  }
}, {
  pack(c1, allocateForWrite) {
    let { target: target2, position: position3 } = allocateForWrite(1);
    target2[position3] = 193;
  }
}];
var defaultPackr = new Packr({ useRecords: false });
var pack = defaultPackr.pack;
var encode = defaultPackr.pack;
var REUSE_BUFFER_MODE = 512;
var RESET_BUFFER_MODE = 1024;
var RESERVE_START_SPACE = 2048;
// node_modules/msgpackr/struct.js
var writeStruct = function(object, target2, encodingStart, position3, structures, makeRoom, pack3, packr) {
  let typedStructs = packr.typedStructs || (packr.typedStructs = []);
  let targetView2 = target2.dataView;
  let refsStartPosition = (typedStructs.lastStringStart || 100) + position3;
  let safeEnd2 = target2.length - 10;
  let start = position3;
  if (position3 > safeEnd2) {
    target2 = makeRoom(position3);
    targetView2 = target2.dataView;
    position3 -= encodingStart;
    start -= encodingStart;
    refsStartPosition -= encodingStart;
    encodingStart = 0;
    safeEnd2 = target2.length - 10;
  }
  let refOffset, refPosition = refsStartPosition;
  let transition = typedStructs.transitions || (typedStructs.transitions = Object.create(null));
  let nextId = typedStructs.nextId || typedStructs.length;
  let headerSize = nextId < 15 ? 1 : nextId < 240 ? 2 : nextId < 61440 ? 3 : nextId < 15728640 ? 4 : 0;
  if (headerSize === 0)
    return 0;
  position3 += headerSize;
  let queuedReferences = [];
  let usedAscii0;
  let keyIndex = 0;
  for (let key in object) {
    let value = object[key];
    let nextTransition = transition[key];
    if (!nextTransition) {
      transition[key] = nextTransition = {
        key,
        parent: transition,
        enumerationOffset: 0,
        ascii0: null,
        ascii8: null,
        num8: null,
        string16: null,
        object16: null,
        num32: null,
        float64: null,
        date64: null
      };
    }
    if (position3 > safeEnd2) {
      target2 = makeRoom(position3);
      targetView2 = target2.dataView;
      position3 -= encodingStart;
      start -= encodingStart;
      refsStartPosition -= encodingStart;
      refPosition -= encodingStart;
      encodingStart = 0;
      safeEnd2 = target2.length - 10;
    }
    switch (typeof value) {
      case "number":
        let number = value;
        if (nextId < 200 || !nextTransition.num64) {
          if (number >> 0 === number && number < 536870912 && number > -520093696) {
            if (number < 246 && number >= 0 && (nextTransition.num8 && !(nextId > 200 && nextTransition.num32) || number < 32 && !nextTransition.num32)) {
              transition = nextTransition.num8 || createTypeTransition(nextTransition, NUMBER, 1);
              target2[position3++] = number;
            } else {
              transition = nextTransition.num32 || createTypeTransition(nextTransition, NUMBER, 4);
              targetView2.setUint32(position3, number, true);
              position3 += 4;
            }
            break;
          } else if (number < 4294967296 && number >= -2147483648) {
            targetView2.setFloat32(position3, number, true);
            if (float32Headers[target2[position3 + 3] >>> 5]) {
              let xShifted;
              if ((xShifted = number * mult10[(target2[position3 + 3] & 127) << 1 | target2[position3 + 2] >> 7]) >> 0 === xShifted) {
                transition = nextTransition.num32 || createTypeTransition(nextTransition, NUMBER, 4);
                position3 += 4;
                break;
              }
            }
          }
        }
        transition = nextTransition.num64 || createTypeTransition(nextTransition, NUMBER, 8);
        targetView2.setFloat64(position3, number, true);
        position3 += 8;
        break;
      case "string":
        let strLength = value.length;
        refOffset = refPosition - refsStartPosition;
        if ((strLength << 2) + refPosition > safeEnd2) {
          target2 = makeRoom((strLength << 2) + refPosition);
          targetView2 = target2.dataView;
          position3 -= encodingStart;
          start -= encodingStart;
          refsStartPosition -= encodingStart;
          refPosition -= encodingStart;
          encodingStart = 0;
          safeEnd2 = target2.length - 10;
        }
        if (strLength > 65280 + refOffset >> 2) {
          queuedReferences.push(key, value, position3 - start);
          break;
        }
        let isNotAscii;
        let strStart = refPosition;
        if (strLength < 64) {
          let i, c1, c2;
          for (i = 0;i < strLength; i++) {
            c1 = value.charCodeAt(i);
            if (c1 < 128) {
              target2[refPosition++] = c1;
            } else if (c1 < 2048) {
              isNotAscii = true;
              target2[refPosition++] = c1 >> 6 | 192;
              target2[refPosition++] = c1 & 63 | 128;
            } else if ((c1 & 64512) === 55296 && ((c2 = value.charCodeAt(i + 1)) & 64512) === 56320) {
              isNotAscii = true;
              c1 = 65536 + ((c1 & 1023) << 10) + (c2 & 1023);
              i++;
              target2[refPosition++] = c1 >> 18 | 240;
              target2[refPosition++] = c1 >> 12 & 63 | 128;
              target2[refPosition++] = c1 >> 6 & 63 | 128;
              target2[refPosition++] = c1 & 63 | 128;
            } else {
              isNotAscii = true;
              target2[refPosition++] = c1 >> 12 | 224;
              target2[refPosition++] = c1 >> 6 & 63 | 128;
              target2[refPosition++] = c1 & 63 | 128;
            }
          }
        } else {
          refPosition += encodeUtf8(target2, value, refPosition);
          isNotAscii = refPosition - strStart > strLength;
        }
        if (refOffset < 160 || refOffset < 246 && (nextTransition.ascii8 || nextTransition.string8)) {
          if (isNotAscii) {
            if (!(transition = nextTransition.string8)) {
              if (typedStructs.length > 10 && (transition = nextTransition.ascii8)) {
                transition.__type = UTF8;
                nextTransition.ascii8 = null;
                nextTransition.string8 = transition;
                pack3(null, 0, true);
              } else {
                transition = createTypeTransition(nextTransition, UTF8, 1);
              }
            }
          } else if (refOffset === 0 && !usedAscii0) {
            usedAscii0 = true;
            transition = nextTransition.ascii0 || createTypeTransition(nextTransition, ASCII, 0);
            break;
          } else if (!(transition = nextTransition.ascii8) && !(typedStructs.length > 10 && (transition = nextTransition.string8)))
            transition = createTypeTransition(nextTransition, ASCII, 1);
          target2[position3++] = refOffset;
        } else {
          transition = nextTransition.string16 || createTypeTransition(nextTransition, UTF8, 2);
          targetView2.setUint16(position3, refOffset, true);
          position3 += 2;
        }
        break;
      case "object":
        if (value) {
          if (value.constructor === Date) {
            transition = nextTransition.date64 || createTypeTransition(nextTransition, DATE, 8);
            targetView2.setFloat64(position3, value.getTime(), true);
            position3 += 8;
          } else {
            queuedReferences.push(key, value, keyIndex);
          }
          break;
        } else {
          nextTransition = anyType(nextTransition, position3, targetView2, -10);
          if (nextTransition) {
            transition = nextTransition;
            position3 = updatedPosition;
          } else
            queuedReferences.push(key, value, keyIndex);
        }
        break;
      case "boolean":
        transition = nextTransition.num8 || nextTransition.ascii8 || createTypeTransition(nextTransition, NUMBER, 1);
        target2[position3++] = value ? 249 : 248;
        break;
      case "undefined":
        nextTransition = anyType(nextTransition, position3, targetView2, -9);
        if (nextTransition) {
          transition = nextTransition;
          position3 = updatedPosition;
        } else
          queuedReferences.push(key, value, keyIndex);
        break;
      default:
        queuedReferences.push(key, value, keyIndex);
    }
    keyIndex++;
  }
  for (let i = 0, l = queuedReferences.length;i < l; ) {
    let key = queuedReferences[i++];
    let value = queuedReferences[i++];
    let propertyIndex = queuedReferences[i++];
    let nextTransition = transition[key];
    if (!nextTransition) {
      transition[key] = nextTransition = {
        key,
        parent: transition,
        enumerationOffset: propertyIndex - keyIndex,
        ascii0: null,
        ascii8: null,
        num8: null,
        string16: null,
        object16: null,
        num32: null,
        float64: null
      };
    }
    let newPosition;
    if (value) {
      let size;
      refOffset = refPosition - refsStartPosition;
      if (refOffset < 65280) {
        transition = nextTransition.object16;
        if (transition)
          size = 2;
        else if (transition = nextTransition.object32)
          size = 4;
        else {
          transition = createTypeTransition(nextTransition, OBJECT_DATA, 2);
          size = 2;
        }
      } else {
        transition = nextTransition.object32 || createTypeTransition(nextTransition, OBJECT_DATA, 4);
        size = 4;
      }
      newPosition = pack3(value, refPosition);
      if (typeof newPosition === "object") {
        refPosition = newPosition.position;
        targetView2 = newPosition.targetView;
        target2 = newPosition.target;
        refsStartPosition -= encodingStart;
        position3 -= encodingStart;
        start -= encodingStart;
        encodingStart = 0;
      } else
        refPosition = newPosition;
      if (size === 2) {
        targetView2.setUint16(position3, refOffset, true);
        position3 += 2;
      } else {
        targetView2.setUint32(position3, refOffset, true);
        position3 += 4;
      }
    } else {
      transition = nextTransition.object16 || createTypeTransition(nextTransition, OBJECT_DATA, 2);
      targetView2.setInt16(position3, value === null ? -10 : -9, true);
      position3 += 2;
    }
    keyIndex++;
  }
  let recordId = transition[RECORD_SYMBOL];
  if (recordId == null) {
    recordId = packr.typedStructs.length;
    let structure = [];
    let nextTransition = transition;
    let key, type;
    while ((type = nextTransition.__type) !== undefined) {
      let size = nextTransition.__size;
      nextTransition = nextTransition.__parent;
      key = nextTransition.key;
      let property = [type, size, key];
      if (nextTransition.enumerationOffset)
        property.push(nextTransition.enumerationOffset);
      structure.push(property);
      nextTransition = nextTransition.parent;
    }
    structure.reverse();
    transition[RECORD_SYMBOL] = recordId;
    packr.typedStructs[recordId] = structure;
    pack3(null, 0, true);
  }
  switch (headerSize) {
    case 1:
      if (recordId >= 16)
        return 0;
      target2[start] = recordId + 32;
      break;
    case 2:
      if (recordId >= 256)
        return 0;
      target2[start] = 56;
      target2[start + 1] = recordId;
      break;
    case 3:
      if (recordId >= 65536)
        return 0;
      target2[start] = 57;
      targetView2.setUint16(start + 1, recordId, true);
      break;
    case 4:
      if (recordId >= 16777216)
        return 0;
      targetView2.setUint32(start, (recordId << 8) + 58, true);
      break;
  }
  if (position3 < refsStartPosition) {
    if (refsStartPosition === refPosition)
      return position3;
    target2.copyWithin(position3, refsStartPosition, refPosition);
    refPosition += position3 - refsStartPosition;
    typedStructs.lastStringStart = position3 - start;
  } else if (position3 > refsStartPosition) {
    if (refsStartPosition === refPosition)
      return position3;
    typedStructs.lastStringStart = position3 - start;
    return writeStruct(object, target2, encodingStart, start, structures, makeRoom, pack3, packr);
  }
  return refPosition;
};
var anyType = function(transition, position3, targetView2, value) {
  let nextTransition;
  if (nextTransition = transition.ascii8 || transition.num8) {
    targetView2.setInt8(position3, value, true);
    updatedPosition = position3 + 1;
    return nextTransition;
  }
  if (nextTransition = transition.string16 || transition.object16) {
    targetView2.setInt16(position3, value, true);
    updatedPosition = position3 + 2;
    return nextTransition;
  }
  if (nextTransition = transition.num32) {
    targetView2.setUint32(position3, 3758096640 + value, true);
    updatedPosition = position3 + 4;
    return nextTransition;
  }
  if (nextTransition = transition.num64) {
    targetView2.setFloat64(position3, NaN, true);
    targetView2.setInt8(position3, value);
    updatedPosition = position3 + 8;
    return nextTransition;
  }
  updatedPosition = position3;
  return;
};
var createTypeTransition = function(transition, type, size) {
  let typeName = TYPE_NAMES[type] + (size << 3);
  let newTransition = transition[typeName] || (transition[typeName] = Object.create(null));
  newTransition.__type = type;
  newTransition.__size = size;
  newTransition.__parent = transition;
  return newTransition;
};
var onLoadedStructures2 = function(sharedData) {
  if (!(sharedData instanceof Map))
    return sharedData;
  let typed = sharedData.get("typed") || [];
  if (Object.isFrozen(typed))
    typed = typed.map((structure) => structure.slice(0));
  let named = sharedData.get("named");
  let transitions = Object.create(null);
  for (let i = 0, l = typed.length;i < l; i++) {
    let structure = typed[i];
    let transition = transitions;
    for (let [type, size, key] of structure) {
      let nextTransition = transition[key];
      if (!nextTransition) {
        transition[key] = nextTransition = {
          key,
          parent: transition,
          enumerationOffset: 0,
          ascii0: null,
          ascii8: null,
          num8: null,
          string16: null,
          object16: null,
          num32: null,
          float64: null,
          date64: null
        };
      }
      transition = createTypeTransition(nextTransition, type, size);
    }
    transition[RECORD_SYMBOL] = i;
  }
  typed.transitions = transitions;
  this.typedStructs = typed;
  this.lastTypedStructuresLength = typed.length;
  return named;
};
var readStruct2 = function(src2, position3, srcEnd2, unpackr) {
  let recordId = src2[position3++] - 32;
  if (recordId >= 24) {
    switch (recordId) {
      case 24:
        recordId = src2[position3++];
        break;
      case 25:
        recordId = src2[position3++] + (src2[position3++] << 8);
        break;
      case 26:
        recordId = src2[position3++] + (src2[position3++] << 8) + (src2[position3++] << 16);
        break;
      case 27:
        recordId = src2[position3++] + (src2[position3++] << 8) + (src2[position3++] << 16) + (src2[position3++] << 24);
        break;
    }
  }
  let structure = unpackr.typedStructs && unpackr.typedStructs[recordId];
  if (!structure) {
    src2 = Uint8Array.prototype.slice.call(src2, position3, srcEnd2);
    srcEnd2 -= position3;
    position3 = 0;
    unpackr._mergeStructures(unpackr.getStructures());
    if (!unpackr.typedStructs)
      throw new Error("Could not find any shared typed structures");
    unpackr.lastTypedStructuresLength = unpackr.typedStructs.length;
    structure = unpackr.typedStructs[recordId];
    if (!structure)
      throw new Error("Could not find typed structure " + recordId);
  }
  var construct = structure.construct;
  if (!construct) {
    construct = structure.construct = function LazyObject() {
    };
    var prototype = construct.prototype;
    let properties = [];
    let currentOffset = 0;
    let lastRefProperty;
    for (let i = 0, l = structure.length;i < l; i++) {
      let definition = structure[i];
      let [type, size, key, enumerationOffset] = definition;
      if (key === "__proto__")
        key = "__proto_";
      let property = {
        key,
        offset: currentOffset
      };
      if (enumerationOffset)
        properties.splice(i + enumerationOffset, 0, property);
      else
        properties.push(property);
      let getRef;
      switch (size) {
        case 0:
          getRef = () => 0;
          break;
        case 1:
          getRef = (source, position4) => {
            let ref = source.bytes[position4 + property.offset];
            return ref >= 246 ? toConstant(ref) : ref;
          };
          break;
        case 2:
          getRef = (source, position4) => {
            let src3 = source.bytes;
            let dataView2 = src3.dataView || (src3.dataView = new DataView(src3.buffer, src3.byteOffset, src3.byteLength));
            let ref = dataView2.getUint16(position4 + property.offset, true);
            return ref >= 65280 ? toConstant(ref & 255) : ref;
          };
          break;
        case 4:
          getRef = (source, position4) => {
            let src3 = source.bytes;
            let dataView2 = src3.dataView || (src3.dataView = new DataView(src3.buffer, src3.byteOffset, src3.byteLength));
            let ref = dataView2.getUint32(position4 + property.offset, true);
            return ref >= 4294967040 ? toConstant(ref & 255) : ref;
          };
          break;
      }
      property.getRef = getRef;
      currentOffset += size;
      let get;
      switch (type) {
        case ASCII:
          if (lastRefProperty && !lastRefProperty.next)
            lastRefProperty.next = property;
          lastRefProperty = property;
          property.multiGetCount = 0;
          get = function(source) {
            let src3 = source.bytes;
            let position4 = source.position;
            let refStart = currentOffset + position4;
            let ref = getRef(source, position4);
            if (typeof ref !== "number")
              return ref;
            let end, next = property.next;
            while (next) {
              end = next.getRef(source, position4);
              if (typeof end === "number")
                break;
              else
                end = null;
              next = next.next;
            }
            if (end == null)
              end = source.bytesEnd - refStart;
            if (source.srcString) {
              return source.srcString.slice(ref, end);
            }
            return readString(src3, ref + refStart, end - ref);
          };
          break;
        case UTF8:
        case OBJECT_DATA:
          if (lastRefProperty && !lastRefProperty.next)
            lastRefProperty.next = property;
          lastRefProperty = property;
          get = function(source) {
            let position4 = source.position;
            let refStart = currentOffset + position4;
            let ref = getRef(source, position4);
            if (typeof ref !== "number")
              return ref;
            let src3 = source.bytes;
            let end, next = property.next;
            while (next) {
              end = next.getRef(source, position4);
              if (typeof end === "number")
                break;
              else
                end = null;
              next = next.next;
            }
            if (end == null)
              end = source.bytesEnd - refStart;
            if (type === UTF8) {
              return src3.toString("utf8", ref + refStart, end + refStart);
            } else {
              currentSource = source;
              try {
                return unpackr.unpack(src3, { start: ref + refStart, end: end + refStart });
              } finally {
                currentSource = null;
              }
            }
          };
          break;
        case NUMBER:
          switch (size) {
            case 4:
              get = function(source) {
                let src3 = source.bytes;
                let dataView2 = src3.dataView || (src3.dataView = new DataView(src3.buffer, src3.byteOffset, src3.byteLength));
                let position4 = source.position + property.offset;
                let value = dataView2.getInt32(position4, true);
                if (value < 536870912) {
                  if (value > -520093696)
                    return value;
                  if (value > -536870912)
                    return toConstant(value & 255);
                }
                let fValue = dataView2.getFloat32(position4, true);
                let multiplier = mult10[(src3[position4 + 3] & 127) << 1 | src3[position4 + 2] >> 7];
                return (multiplier * fValue + (fValue > 0 ? 0.5 : -0.5) >> 0) / multiplier;
              };
              break;
            case 8:
              get = function(source) {
                let src3 = source.bytes;
                let dataView2 = src3.dataView || (src3.dataView = new DataView(src3.buffer, src3.byteOffset, src3.byteLength));
                let value = dataView2.getFloat64(source.position + property.offset, true);
                if (isNaN(value)) {
                  let byte = src3[source.position + property.offset];
                  if (byte >= 246)
                    return toConstant(byte);
                }
                return value;
              };
              break;
            case 1:
              get = function(source) {
                let src3 = source.bytes;
                let value = src3[source.position + property.offset];
                return value < 246 ? value : toConstant(value);
              };
              break;
          }
          break;
        case DATE:
          get = function(source) {
            let src3 = source.bytes;
            let dataView2 = src3.dataView || (src3.dataView = new DataView(src3.buffer, src3.byteOffset, src3.byteLength));
            return new Date(dataView2.getFloat64(source.position + property.offset, true));
          };
          break;
      }
      property.get = get;
    }
    if (evalSupported) {
      let objectLiteralProperties = [];
      let args = [];
      let i = 0;
      let hasInheritedProperties;
      for (let property of properties) {
        if (unpackr.alwaysLazyProperty && unpackr.alwaysLazyProperty(property.key)) {
          hasInheritedProperties = true;
          continue;
        }
        Object.defineProperty(prototype, property.key, { get: withSource(property.get), enumerable: true });
        let valueFunction = "v" + i++;
        args.push(valueFunction);
        objectLiteralProperties.push("[" + JSON.stringify(property.key) + "]:" + valueFunction + "(s)");
      }
      if (hasInheritedProperties) {
        objectLiteralProperties.push("__proto__:this");
      }
      let toObject = new Function(...args, "return function(s){return{" + objectLiteralProperties.join(",") + "}}").apply(null, properties.map((prop) => prop.get));
      Object.defineProperty(prototype, "toJSON", {
        value(omitUnderscoredProperties) {
          return toObject.call(this, this[sourceSymbol]);
        }
      });
    } else {
      Object.defineProperty(prototype, "toJSON", {
        value(omitUnderscoredProperties) {
          let resolved = {};
          for (let i = 0, l = properties.length;i < l; i++) {
            let key = properties[i].key;
            resolved[key] = this[key];
          }
          return resolved;
        }
      });
    }
  }
  var instance = new construct;
  instance[sourceSymbol] = {
    bytes: src2,
    position: position3,
    srcString: "",
    bytesEnd: srcEnd2
  };
  return instance;
};
var toConstant = function(code) {
  switch (code) {
    case 246:
      return null;
    case 247:
      return;
    case 248:
      return false;
    case 249:
      return true;
  }
  throw new Error("Unknown constant");
};
var withSource = function(get) {
  return function() {
    return get(this[sourceSymbol]);
  };
};
var saveState2 = function() {
  if (currentSource) {
    currentSource.bytes = Uint8Array.prototype.slice.call(currentSource.bytes, currentSource.position, currentSource.bytesEnd);
    currentSource.position = 0;
    currentSource.bytesEnd = currentSource.bytes.length;
  }
};
var prepareStructures2 = function(structures, packr) {
  if (packr.typedStructs) {
    let structMap = new Map;
    structMap.set("named", structures);
    structMap.set("typed", packr.typedStructs);
    structures = structMap;
  }
  let lastTypedStructuresLength = packr.lastTypedStructuresLength || 0;
  structures.isCompatible = (existing) => {
    let compatible = true;
    if (existing instanceof Map) {
      let named = existing.get("named") || [];
      if (named.length !== (packr.lastNamedStructuresLength || 0))
        compatible = false;
      let typed = existing.get("typed") || [];
      if (typed.length !== lastTypedStructuresLength)
        compatible = false;
    } else if (existing instanceof Array || Array.isArray(existing)) {
      if (existing.length !== (packr.lastNamedStructuresLength || 0))
        compatible = false;
    }
    if (!compatible)
      packr._mergeStructures(existing);
    return compatible;
  };
  packr.lastTypedStructuresLength = packr.typedStructs && packr.typedStructs.length;
  return structures;
};
var ASCII = 3;
var NUMBER = 0;
var UTF8 = 2;
var OBJECT_DATA = 1;
var DATE = 16;
var TYPE_NAMES = ["num", "object", "string", "ascii"];
TYPE_NAMES[DATE] = "date";
var float32Headers = [false, true, true, false, false, true, true, false];
var evalSupported;
try {
  new Function("");
  evalSupported = true;
} catch (error) {
}
var updatedPosition;
var hasNodeBuffer2 = typeof Buffer !== "undefined";
var textEncoder2;
var currentSource;
try {
  textEncoder2 = new TextEncoder;
} catch (error) {
}
var encodeUtf8 = hasNodeBuffer2 ? function(target2, string, position3) {
  return target2.utf8Write(string, position3, 4294967295);
} : textEncoder2 && textEncoder2.encodeInto ? function(target2, string, position3) {
  return textEncoder2.encodeInto(string, target2.subarray(position3)).written;
} : false;
var TYPE = Symbol("type");
var PARENT = Symbol("parent");
setWriteStructSlots(writeStruct, prepareStructures2);
var sourceSymbol = Symbol.for("source");
setReadStruct(readStruct2, onLoadedStructures2, saveState2);
// node_modules/msgpackr/node-index.js
import {createRequire as createRequire2} from "module";
var nativeAccelerationDisabled = process.env.MSGPACKR_NATIVE_ACCELERATION_DISABLED !== undefined && process.env.MSGPACKR_NATIVE_ACCELERATION_DISABLED.toLowerCase() === "true";
if (!nativeAccelerationDisabled) {
  let extractor;
  try {
    if (typeof __require == "function")
      extractor = require_msgpackr_extract();
    else
      extractor = createRequire2(import.meta.url)("msgpackr-extract");
    if (extractor)
      setExtractor(extractor.extractStrings);
  } catch (error) {
  }
}

// src/primitives/functions.ts
import {
realpath,
open,
write,
fsync,
close,
rename,
unlink
} from "fs";
import {promisify} from "util";
import {randomBytes} from "node:crypto";
import {readFile} from "node:fs/promises";
import {readFileSync} from "node:fs";
import {Buffer as Buffer2} from "node:buffer";
async function updateMessage(dir, _unique_field, message) {
  if (_unique_field) {
    const someIdex = await findIndex(dir + "UINDEX", _unique_field, message);
    if (Array.isArray(someIdex) && someIdex[1] !== message._id) {
      throw new ExabaseError("UPDATE on table :", dir, " aborted, reason - unique field's ", someIdex[0], " value ", someIdex[1], " exists!");
    }
  }
  if (_unique_field) {
    await updateIndex(dir, _unique_field, message);
  }
  return message;
}
async function prepareMessage(dir, _unique_field, message) {
  if (_unique_field) {
    const someIdex = await findIndex(dir + "UINDEX", _unique_field, message);
    if (Array.isArray(someIdex)) {
      throw new ExabaseError("INSERT on table :", dir, " aborted, reason - unique field's '", someIdex[0], "' value '", someIdex[1], "' exists!");
    }
  }
  message._id = generate_id();
  if (_unique_field) {
    await updateIndex(dir, _unique_field, message);
  }
  return message;
}
async function deleteMessage(_id, dir, _unique_field, _foreign_field, fn, RCTiedlog) {
  const message = await findMessage(fn, {
    select: _id
  }, RCTiedlog);
  if (message) {
    if (_unique_field)
      await dropIndex(dir + "UINDEX", message, _unique_field);
    if (_foreign_field)
      await dropForeignKeys(dir + "FINDEX", _id);
  }
  return message || { _wal_ignore_flag: true };
}
async function findMessage(fileName, fo, messages) {
  const { select, populate } = fo;
  let left = 0;
  let right = messages.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const midId = messages[mid]?._id;
    if (midId === select) {
      const message = messages[mid];
      if (populate) {
        const _foreign = await populateForeignKeys(fileName, message._id, populate);
        for (const key in _foreign) {
          message[key] = _foreign[key];
        }
      }
      return message;
    } else if (midId < select) {
      left = mid + 1;
    } else if (midId === undefined) {
      return;
    } else {
      right = mid - 1;
    }
  }
}
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
    if ((data[prop] === undefined || data[prop] === null) && nullable) {
      continue;
    }
    if ((data[prop] === undefined || data[prop] === null) && !nullable) {
      if (!value.default) {
        info = `${prop} is required`;
        break;
      }
    }
    if (typeof data[prop] !== "undefined") {
      if (typeof data[prop] === "string" && data[prop]["trim"]() === "" && nullable) {
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
      if (length && typeof data[prop] === "string" && data[prop]["length"] > length) {
        info = `${prop} is more than ${length} characters `;
      }
    }
  }
  return info;
}
function resizeRCT(data) {
  const keys = Object.keys(data);
  //! 99 should caculated memory capacity
  if (keys.length > 99) {
    const a = keys.slice(0, 50);
    for (let i = 0;i < 50; i++) {
      data[a[i]] = undefined;
    }
  }
}
async function SynFileWrit(filename, data) {
  let fd;
  let tmpfile = "";
  try {
    const truename = await promisify(realpath)(filename).catch(() => filename);
    tmpfile = generate_id() + "-SYNC";
    fd = await promisify(open)(tmpfile, "w");
    await promisify(write)(fd, data, 0, data.length, 0);
    await promisify(fsync)(fd);
    await promisify(rename)(tmpfile, truename);
  } finally {
    if (fd) {
      await promisify(close)(fd).catch(() => {
      });
    }
    await promisify(unlink)(tmpfile).catch(() => {
    });
  }
}
var loadLog = async (filePath) => {
  try {
    const data = await readFile(filePath);
    return Utils.packr.decode(data) || [];
  } catch (error) {
    return [];
  }
};
var loadLogSync = (filePath) => {
  try {
    const data = readFileSync(filePath);
    const d = Utils.packr.decode(data) || [];
    return d;
  } catch (error) {
    return [];
  }
};
var addForeignKeys = async (fileName, reference, RCTiedlog) => {
  const message = await findMessage(fileName, {
    select: reference._id
  }, RCTiedlog);
  if (!message) {
    throw new ExabaseError("Adding relation on table :", " aborted, reason - item _id '", reference._id, "' not found!");
  }
  const foreign_message = await Utils.EXABASE_MANAGERS[reference.foreign_table.toUpperCase()]._query.findOne(reference.foreign_id);
  if (!foreign_message) {
    throw new ExabaseError("Adding relation on table :", " aborted, reason - foreign_id '", reference.foreign_id, "' from foreign table '", reference.foreign_table, "' via it's relationship '", reference.relationship, "' not found!");
  }
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FINDEX";
  let messages = await loadLog(fileName);
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
      if (messageX[reference.relationship].indexOf(reference.foreign_id) === -1) {
        messageX[reference.relationship].push(reference.foreign_id);
      }
    } else {
      messageX[reference.relationship] = [reference.foreign_id];
    }
  }
  messages[reference._id] = messageX;
  await SynFileWrit(fileName, Utils.packr.encode(messages));
};
var populateForeignKeys = async (fileName, _id, relationships) => {
  fileName = fileName.split("/").slice(0, 2).join("/") + "/FINDEX";
  let messages = await loadLog(fileName);
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
              return Utils.EXABASE_MANAGERS[relationships[relationship]]._query.findOne(id);
            });
            const msgs = await Promise.all(marray);
            rela[relationship] = msgs.flat();
          } else {
            const msgs = await Utils.EXABASE_MANAGERS[relationships[relationship].toUpperCase()]._query.findOne(fk);
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
  const messages = await loadLog(fileName);
  if (messages[reference._id]) {
    if (Array.isArray(messages[reference._id][reference.relationship])) {
      messages[reference._id][reference.relationship] = messages[reference._id][reference.relationship].filter((item) => item !== reference.foreign_id);
    } else {
      delete messages[reference._id][reference.relationship];
    }
    await SynFileWrit(fileName, Utils.packr.encode(messages));
  }
};
var dropForeignKeys = async (fileName, _id) => {
  const messages = await loadLog(fileName);
  if (messages[_id]) {
    delete messages[_id];
  }
  await SynFileWrit(fileName, Utils.packr.encode(messages));
};
var updateIndex = async (fileName, _unique_field, message) => {
  fileName = fileName.split("/").slice(0, 2).join("/") + "/UINDEX";
  let messages = await loadLog(fileName);
  if (Array.isArray(messages)) {
    messages = {};
  }
  for (const type in _unique_field) {
    if (!messages[type]) {
      messages[type] = {};
    }
    messages[type][message[type]] = message._id;
  }
  await SynFileWrit(fileName, Utils.packr.encode(messages));
};
var findIndex = async (fileName, _unique_field, data) => {
  let messages = await loadLog(fileName);
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
  let messages = await loadLog(fileName);
  if (Array.isArray(messages)) {
    return;
  }
  for (const uf in _unique_field) {
    if (!messages[uf]) {
      return;
    }
    if (messages[uf][data[uf]]) {
      return messages[uf][data[uf]];
    }
  }
  return;
};
var dropIndex = async (fileName, data, _unique_field) => {
  if (!_unique_field) {
    return;
  }
  let messages = await loadLog(fileName);
  if (Array.isArray(messages)) {
    messages = {};
  }
  for (const key in _unique_field) {
    if (!messages[key]) {
      continue;
    }
    delete messages[key][data[key]];
  }
  await SynFileWrit(fileName, Utils.packr.encode(messages));
};
var binarysearch_mutate = async (message, messages, flag) => {
  if (messages.length === 1) {
    if (message._id === messages[0]._id) {
      if (flag === "d") {
        messages.pop();
      } else {
        messages[0] = message;
      }
    }
  }
  const _id = message._id;
  let left = 0;
  let right = messages.length - 1;
  for (;left <= right; ) {
    const mid = Math.floor((left + right) / 2);
    const midId = messages[mid]._id;
    if (midId === _id) {
      if (flag === "u") {
        messages[mid] = message;
      }
      if (flag === "d") {
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
  for (;low <= high; ) {
    const mid = Math.floor((low + high) / 2);
    const current = messages[mid]._id;
    if (current < _id) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  messages.splice(low, 0, message);
  return messages;
};
var generate_id = () => {
  const PROCESS_UNIQUE = randomBytes(5);
  let index = ~~(Math.random() * 16777215);
  const time = ~~(Date.now() / 1000);
  const inc = index = (index + 1) % 16777215;
  const buffer = Buffer2.alloc(12);
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

// src/primitives/classes.ts
class Utils {
  static MANIFEST = {
    schemas: [],
    bearer: "",
    rings: [],
    EXABASE_KEYS: { privateKey: "", publicKey: "" },
    sign: undefined,
    verify: undefined
  };
  static EXABASE_RING_STATE = {};
  static EXABASE_MANAGERS = {};
  static packr = new Packr;
  static RCT = {
    none: false
  };
}

class ExabaseError extends Error {
  constructor(...err) {
    const message = ExabaseError.geterr(err);
    super(message);
  }
  static geterr(err) {
    return String(err.join(""));
  }
}

class Schema {
  tableName;
  RCT;
  _trx;
  columns = {};
  searchIndexOptions;
  relationship;
  _unique_field = undefined;
  _foreign_field = {};
  migrationFN;
  _premature = true;
  constructor(options) {
    //! maybe add pre & post processing hooks
    this._trx = new Query({});
    this.tableName = options.tableName.trim().toUpperCase();
    if (options.tableName) {
      this._unique_field = {};
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
            throw new ExabaseError(" schema property default value '", options.columns[key].default, "' for ", key, " on the ", this.tableName, " tableName has a wrong type");
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
        this._unique_field = undefined;
      }
      if (options.relationship) {
        this.relationship = options.relationship;
      }
    }
  }
  get query() {
    if (!this._premature)
      return this._trx;
    throw new ExabaseError("Schema - " + this.tableName + " is not yet connected to an Exabase Instance");
  }
  static getTimestamp(_id) {
    return new Date(parseInt(_id.slice(0, 8), 16) * 1000);
  }
}

class Query {
  _Manager;
  premature = true;
  constructor(Manager) {
    this._Manager = Manager;
    if (Manager) {
      this.premature = false;
    }
  }
  findMany(field, options) {
    const query = {
      select: typeof field === "string" ? field : "*"
    };
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
          [key]: value
        };
      } else {
        throw new ExabaseError(`column field ${key} is not unique, please try searching instead`);
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
          for (let i = 0;i < options.populate.length; i++) {
            const lab = options.populate[0];
            const relaName = fields[lab];
            if (relaName) {
              query.populate[lab] = fields[lab];
            } else {
              throw new ExabaseError("can't POPULATE missing realtionship " + lab);
            }
          }
        }
      }
    }
    return this._Manager._run(query);
  }
  findOne(field, options) {
    const query = {
      select: typeof field === "string" ? field : undefined
    };
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
          [key]: value
        };
      } else {
        throw new ExabaseError(`column field ${key} is not unique, please try searching instead`);
      }
    }
    if (typeof options === "object") {
      query.populate = {};
      const fields = this._Manager._schema._foreign_field;
      if (options.populate === true) {
        for (const lab in fields) {
          query.populate[lab] = fields[lab];
        }
      } else {
        if (Array.isArray(options.populate)) {
          for (let i = 0;i < options.populate.length; i++) {
            const lab = options.populate[0];
            const relaName = fields[lab];
            if (relaName) {
              query.populate[lab] = fields[lab];
            } else {
              throw new ExabaseError("can't POPULATE missing realtionship " + lab);
            }
          }
        }
      }
    }
    return this._Manager._run(query);
  }
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
          for (let i = 0;i < options.populate.length; i++) {
            const lab = options.populate[0];
            const relaName = fields[lab];
            if (relaName) {
              query.populate[lab] = fields[lab];
            } else {
              throw new ExabaseError("can't POPULATE missing realtionship " + lab);
            }
          }
        }
      }
    }
    return this._Manager._run(query);
  }
  save(data) {
    const hasid = typeof data?._id === "string";
    const query = {
      [hasid ? "update" : "insert"]: this._Manager._validate(data, hasid)
    };
    return this._Manager._run(query);
  }
  delete(_id) {
    if (typeof _id !== "string") {
      throw new ExabaseError("cannot continue with delete query '", _id, "' is not a valid Exabase _id value");
    }
    const query = {
      delete: _id
    };
    return this._Manager._run(query);
  }
  count(pops) {
    const query = {
      count: pops || true
    };
    return this._Manager._run(query);
  }
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
        type: rela.type,
        foreign_id: options.foreign_id,
        relationship: options.relationship,
        foreign_table: rela.target
      }
    };
    return this._Manager._run(query);
  }
  removeRelation(options) {
    const rela = this._Manager._schema.relationship[options.relationship];
    if (!rela) {
      throw new ExabaseError("No relationship definition called ", options.relationship, " on ", this._Manager._schema.tableName, " schema");
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
    return this._Manager._run(query);
  }
  saveBatch(data) {
    if (Array.isArray(data)) {
      const q = this._prepare_for(data, false);
      return this._Manager._runMany(q);
    } else {
      throw new ExabaseError(`Invalid inputs for .saveBatch method, data should be array.`);
    }
  }
  deleteBatch(data) {
    if (Array.isArray(data)) {
      const q = this._prepare_for(data, true);
      return this._Manager._runMany(q);
    } else {
      throw new ExabaseError(`Invalid inputs for .deleteBatch method, data should be array.`);
    }
  }
  _prepare_for(data, del) {
    const query = [];
    for (let i = 0;i < data.length; i++) {
      const item = data[i];
      if (del) {
        if (typeof item._id === "string") {
          query.push({
            delete: item._id
          });
        } else {
          throw new ExabaseError("cannot continue with delete query '", item._id, "' is not a valid Exabase _id value");
        }
      } else {
        const hasid = item?._id && true;
        query.push({
          [hasid ? "update" : "insert"]: this._Manager._validate(item, hasid)
        });
      }
    }
    return query;
  }
}

class Manager {
  _schema;
  _name;
  _query;
  tableDir = "";
  RCTied = true;
  RCT = {};
  _LogFiles = {};
  _topLogFile;
  _search;
  logging = false;
  constructor(schema) {
    this._schema = schema;
    this._name = schema.tableName;
    this._search = new XTree({ persitKey: "" });
    this._query = new Query(this);
    schema._trx = this._query;
    this.RCTied = schema.RCT || false;
  }
  _setup(init) {
    this.tableDir = init._exabaseDirectory + "/" + this._schema.tableName + "/";
    this.logging = init.logging;
    this._search = new XTree({ persitKey: this.tableDir + "XINDEX" });
    this._constructRelationships(init.schemas);
    if (!existsSync(this.tableDir)) {
      mkdirSync(this.tableDir);
    } else {
      return this._sync_logs();
    }
  }
  waiters = {};
  acquireWritter(file) {
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
    await this.acquireWritter(file);
    let messages = this.RCT[file] || await loadLog(file);
    if (flag === "i") {
      messages = await binarysorted_insert(message, messages);
      this._setLog(file, message._id, messages.length);
    } else {
      messages = await binarysearch_mutate(message, messages, flag);
      console.log({
        file,
        last_id: messages.at(-1)?._id || null,
        len: messages.length
      });
      this._setLog(file, messages.at(-1)?._id || null, messages.length);
    }
    if (this.RCTied) {
      this.RCT[file] = messages;
    }
    await SynFileWrit(file, Utils.packr.encode(messages));
    await this._search.manage(message, flag);
    resizeRCT(this.RCT);
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
      if (dirent.name.includes("-SYNC")) {
        await unlink2(this.tableDir + dirent.name).catch(() => {
        });
        continue;
      }
      if (dirent.isFile()) {
        const fn = dirent.name;
        logfiles.push(fn);
        if ("FINDEX-UINDEX-XINDEX".includes(fn)) {
          continue;
        }
        const LOG = await loadLog(this.tableDir + dirent.name);
        const last_id = LOG.at(-1)?._id || "";
        this._LogFiles[fn] = { last_id, size: LOG.length };
        size += LOG.length;
        if (!this._topLogFile) {
          this._topLogFile = fn;
        } else {
          if (Number(fn.split("-")[1]) > Number(this._topLogFile.split("-")[1])) {
            this._topLogFile = fn;
          }
        }
      }
    }
    await this._sync_searchindex(size);
  }
  async _sync_searchindex(size) {
    const sindexes = [];
    if (this._schema.tableName) {
      if (this._schema.searchIndexOptions) {
        for (const key in this._schema.searchIndexOptions) {
          if (!this._schema.columns[key]) {
            throw new ExabaseError(" tableName:", key, " not found on table", this._schema.tableName, ", please recheck the defined columns!");
          } else {
            sindexes.push(key);
          }
        }
      }
    }
    if (!this._search.confirmLength(size)) {
      console.log("Re-calculating search index due to changes in log size");
      this._search.restart();
      for (const file in this._LogFiles) {
        const LOG = await loadLog(this.tableDir + file);
        const ln = LOG.length;
        for (let i = 0;i < ln; i++) {
          this._search.insert(LOG[i]);
        }
      }
    }
  }
  _getReadingLog(logId) {
    if (logId === "*") {
      return this.tableDir + this._topLogFile;
    }
    for (const filename in this._LogFiles) {
      const logFile = this._LogFiles[filename];
      if (String(logFile.last_id) > logId || logFile.last_id === logId) {
        return this.tableDir + filename;
      }
      if (!logFile.last_id) {
        return this.tableDir + filename;
      }
      if (logFile.size < 32768) {
        return this.tableDir + filename;
      }
    }
    throw new ExabaseError("Invalid key range for read operation");
  }
  _getInsertLog() {
    for (const filename in this._LogFiles) {
      const logFile = this._LogFiles[filename];
      if (logFile.size < 32768) {
        return this.tableDir + filename;
      }
    }
    const cln = Number((this._topLogFile || "LOG-0").split("-")[1]);
    const nln = cln + 1;
    const lfid = "LOG-" + nln;
    this._LogFiles[lfid] = { last_id: lfid, size: 0 };
    this._topLogFile = lfid;
    return this.tableDir + lfid;
  }
  _setLog(fn, last_id, size) {
    this._LogFiles[fn] = { last_id, size };
  }
  _constructRelationships(allSchemas) {
    if (this._schema.tableName) {
      if (this._schema.relationship) {
        this._schema._foreign_field = {};
        for (const key in this._schema.relationship) {
          if (typeof this._schema.relationship[key].target === "string") {
            const namee = this._schema.relationship[key].target.toUpperCase();
            const findschema = allSchemas.find((schema) => schema.tableName === namee);
            if (findschema) {
              this._schema._foreign_field[key] = namee;
            } else {
              throw new ExabaseError(" tableName:", namee, " not found on any schema, please recheck the relationship definition of the ", this._schema.tableName, " schema");
            }
          } else {
            throw new ExabaseError(" Error on schema ", this._schema.tableName, " relationship target must be a string ");
          }
        }
      }
    }
  }
  _validate(data, update) {
    const v = validateData(data, this._schema.columns);
    if (typeof v === "string") {
      throw new ExabaseError(update ? "insert" : "update", " on table :", this._schema.tableName, " aborted, reason - ", v);
    }
    if (!data._id && update) {
      throw new ExabaseError("update on table :", this._schema.tableName, " aborted, reason - _id is required");
    }
    return v;
  }
  async _select(query) {
    if (Array.isArray(query.select.relationship)) {
      const rela = {};
      for (let i = 0;i < query.select.relationship.length; i++) {
        const r = query.select.relationship;
        rela[r] = this._schema.relationship[r].target;
      }
      query.select.relationship = rela;
    }
    const file = this._getReadingLog(query.select);
    let RCTied = this.RCT[file];
    if (!RCTied) {
      RCTied = await loadLog(file);
      if (this.RCTied) {
        this.RCT[file] = RCTied;
      }
    }
    if (query.select === "*")
      return RCTied;
    return findMessage(file, query, RCTied);
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
        populate: query.populate
      }));
      return Promise.all(searches);
    }
    if (query["unique"]) {
      const select = await findMessageByUnique(this.tableDir + "UINDEX", this._schema._unique_field, query.unique);
      if (select) {
        const file = this._getReadingLog(select);
        return findMessage(file, {
          select,
          populate: query.populate
        }, this.RCT[file] || await loadLog(file));
      } else {
        return [];
      }
    }
    if (query["count"]) {
      if (query["count"] === true) {
        let size = 0;
        const obj = Object.values(this._LogFiles);
        for (let c = 0;c < obj.length; c++) {
          const element = obj[c];
          size += element.size || 0;
        }
        return size;
      } else {
        return this._search.count(query["count"]);
      }
    }
    if (query["delete"]) {
      const file = this._getReadingLog(query.delete);
      const message = await deleteMessage(query.delete, this.tableDir, this._schema._unique_field, this._schema.relationship ? true : false, file, this.RCT[file] || await loadLog(file));
      if (message) {
        return this.write(file, message, "d");
      }
    }
    if (query["reference"] && query["reference"]._new) {
      const file = this._getReadingLog(query.reference._id);
      return addForeignKeys(file, query.reference, this.RCT[file]);
    }
    if (query["reference"]) {
      const file = this._getReadingLog(query.reference._id);
      return removeForeignKeys(file, query.reference);
    }
  }
  _runMany(query) {
    if (this.logging)
      console.log({ query, table: this._name });
    return Promise.all(query.map((q) => this._trx_runner(q)));
  }
  _run(query) {
    if (this.logging)
      console.log({ query, table: this._name });
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
    for (;low <= high; ) {
      const mid = Math.floor((low + high) / 2);
      const current = this.keys[mid].value;
      if (current === value) {
        this.keys[mid].indexes.push(index);
        return;
      }
      if (current < value) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    this.keys.splice(low, 0, { value, indexes: [index] });
  }
  disert(value, index) {
    let left = 0;
    let right = this.keys.length - 1;
    for (;left <= right; ) {
      const mid = Math.floor((left + right) / 2);
      const current = this.keys[mid].value;
      if (current === value) {
        this.keys[mid].indexes = this.keys[mid].indexes.filter((a) => a !== index);
        return;
      } else if (current < value) {
        left = mid + 1;
      } else {
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
    for (;left <= right; ) {
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
    return [];
  }
}

class XTree {
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
    for (;left <= right; ) {
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
    } else {
      setImmediate(() => {
        this.insert(data, bulk);
      });
      return;
    }
    if (typeof data === "object" && !Array.isArray(data)) {
      for (const key in data) {
        if ("_wal_ignore_flag-_id".includes(key))
          continue;
        if (!this.tree[key]) {
          this.tree[key] = new XNode;
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
    } else {
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
    } else {
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
          this.tree[key] = new XNode;
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
    for (let index = 0;index < keys.length; index++) {
      obj[keys[index]] = this.tree[keys[index]].keys;
    }
    return SynFileWrit(this.persitKey, Utils.packr.encode({
      base: this.base,
      tree: obj
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

// src/primitives/http-functions.ts
var _ExabaseRingInterface = async (ctx) => {
  const data = await ctx.json();
  switch (data["type"]) {
    case "login":
      login(data["query"]);
      break;
    case "broadcast":
      login(data["query"]);
      break;
    case "new-data-while-sync":
      save(data["query"]);
      break;
    case "hydrate":
      hydrate(data["query"]);
      break;
    case "state-infomation":
      hydrate(data["query"]);
      break;
    default:
      ctx.throw();
      break;
  }
};
var _login_leader_ring = async (indexes) => {
  const ringbearerResponse = await fetch(Utils.MANIFEST.bearer + "/login", {
    method: "POST",
    body: JSON.stringify({ indexes })
  });
  const data = await ringbearerResponse.json();
  if (data.status !== "OK") {
    throw new ExabaseError("Failed Exabase login atempt");
  }
  return true;
};
//! /login - (request out) logins an Exabase Ring interface.
var login = async (ctx) => {
  ctx.reply({ status: "OK" });
};
//! /authorise - (request in) request Exabase login credentails for authorisation before adding the node to the Ring interface.
//! /hydrate -
var hydrate = async (ctx) => {
  try {
    ctx.reply({ status: "OK" });
  } catch (error) {
    ctx.code = 401;
    ctx.reply({ status: "FAILED" });
  }
};
//! /save - (request in) for live consistency (goes to all replicas)
var save = async (ctx) => {
  try {
    ctx.reply({ status: "OK" });
  } catch (error) {
    ctx.code = 401;
    ctx.reply({ status: "FAILED" });
  }
};

// src/index.ts
class Exabase {
  _announced = false;
  _conn = undefined;
  _exabaseDirectory;
  constructor(init) {
    this._exabaseDirectory = (init.name || "EXABASE_DB").trim().toUpperCase();
    try {
      mkdirSync2(this._exabaseDirectory);
      Object.assign(Utils.MANIFEST, {
        schemas: undefined,
        bearer: init.bearer,
        EXABASE_KEYS: {
          privateKey: init.EXABASE_KEYS?.privateKey,
          publicKey: init.EXABASE_KEYS?.publicKey
        },
        mode: init.mode,
        EXABASE_MEMORY_PERCENT: init.EXABASE_MEMORY_PERCENT,
        logging: init.logging,
        name: init.name
      });
      console.log("Exabase initialised!");
    } catch (e) {
      if ({ e }.e.code === "EEXIST") {
        Object.assign({
          bearer: init.bearer,
          EXABASE_KEYS: {
            privateKey: init.EXABASE_KEYS?.privateKey,
            publicKey: init.EXABASE_KEYS?.publicKey
          },
          mode: init.mode,
          EXABASE_MEMORY_PERCENT: init.EXABASE_MEMORY_PERCENT,
          logging: init.logging,
          name: init.name
        }, Utils.MANIFEST);
      }
    }
    init.schemas.forEach((schema) => {
      Utils.EXABASE_MANAGERS[schema?.tableName] = new Manager(schema);
    });
    Promise.allSettled(Object.values(Utils.EXABASE_MANAGERS).map((manager) => manager._setup({
      _exabaseDirectory: this._exabaseDirectory,
      logging: init.logging || false,
      schemas: init.schemas
    }))).then((_all) => {
      this._announced = true;
      console.log("Exabase: connected!");
      init.schemas.forEach((schema) => {
        schema._premature = false;
      });
      this._conn && this._conn(true);
    }).catch((e) => {
      console.log(e);
    });
  }
  connect(app) {
    if (app?.decorate) {
      if (!Utils.MANIFEST.EXABASE_KEYS.privateKey) {
        throw new ExabaseError("Exabase public and private keys not provided for connection");
      }
      _login_leader_ring({});
      //! /*indexes*/
      app.decorate({
        propagateExabaseRing(ctx) {
          _ExabaseRingInterface(ctx);
        }
      });
    }
    if (!this._announced) {
      console.log("Exabase: connecting...");
      return new Promise((r) => {
        this._conn = r;
      });
    }
    return;
  }
  async executeQuery(query) {
    if (!this._announced) {
      throw new ExabaseError("Exabase not ready!");
    }
    try {
      if (typeof query !== "string")
        throw new Error;
      const parsedQuery = JSON.parse(query);
      const table = Utils.EXABASE_MANAGERS[parsedQuery.table];
      if (!table)
        throw new Error;
      return new Promise((r) => {
        table._run(parsedQuery.query, r, parsedQuery.type || "nm");
      });
    } catch (error) {
      throw new ExabaseError("Invalid query: ", query);
    }
  }
}
export {
  Schema,
  ExabaseError,
  Exabase
};
