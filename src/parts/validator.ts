//! [x] convert to a nodejs addon-on

import { columnValidationType, SchemaColumnOptions } from "../types";

export function validateData(
  data: Record<string, Record<string, any>> = {},
  schema: Record<string, SchemaColumnOptions> = {}
) {
  let info: Record<string, any> | string = {};
  //? check for valid input
  if (typeof data !== "object") {
    info = " data is invalid " + data;
  }
  for (const [prop, value] of Object.entries(schema)) {
    const { type, length, width, nullable } = value as columnValidationType;
    (info as Record<string, any>)[prop] = data[prop] || value.default || null;
    if (prop === "_id") {
      continue;
    }
    // ? check for nullability
    if ((data[prop] === undefined || data[prop] === null) && nullable) {
      continue;
    }
    if ((data[prop] === undefined || data[prop] === null) && !nullable) {
      if (!value.default) {
        info = `${prop} is required`;
        break;
      }
    }
    // ?
    if (typeof data[prop] !== "undefined") {
      // ? check for empty strings
      if (
        typeof data[prop] === "string" &&
        data[prop].trim() === "" &&
        nullable
      ) {
        info = `${prop} cannot be empty `;
        break;
      }
      // ? check for type
      if (typeof type === "function" && typeof data[prop] !== typeof type()) {
        info = `${prop} type is invalid ${typeof data[prop]}`;
        break;
      }
      //? checks for numbers width
      if (
        width &&
        !Number.isNaN(Number(data[prop])) &&
        Number(data[prop]) < width
      ) {
        info = `Given ${prop} must not be lesser than ${width}`;
        break;
      }
      //? checks for String length
      if (
        length &&
        typeof data[prop] === "string" &&
        data[prop].length > length
      ) {
        info = `${prop} is more than ${length} characters `;
      }
    }
  }
  return info;
}
