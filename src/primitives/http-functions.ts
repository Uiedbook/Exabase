import { AppCTXType } from "jetpath";
//
import { ExabaseError, Utils } from "./classes";

export const _ExabaseRingInterface = async (ctx: AppCTXType) => {
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

export const _AccessRingInterfaces = async () => {
  // ? generate authorisation token and login all ring bearers
  const ringbearerResponses = Utils.MANIFEST.ringbearers.map((r) =>
    fetch(r + "/exabase", {})
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

//! /login - (request out) logins an Exabase Ring interface.
export const app = async (ctx: AppCTXType) => {
  const req = (await ctx.body.json()) as {
    url: string;
  };
  // MANIFEST.ringlord = req.url as string;
  // console.log(data);
  ctx.reply({ status: "OK" });
};
export const login = async (ctx: AppCTXType) => {
  const req = (await ctx.body.json()) as {
    url: string;
  };
  // MANIFEST.ringlord = req.url as string;
  // console.log(data);
  ctx.reply({ status: "OK" });
};
//! /authorise - (request in) request Exabase login credentails for authorisation before adding the node to the Ring interface.
export const authorise = async (ctx: AppCTXType) => {
  const req = (await ctx.body.json()) as {
    url: string;
  };
  (Utils.MANIFEST.ringbearers as string[]).push(req.url);
  // console.log(data);
  ctx.reply({ status: "OK" });
};
//! /hydrate -
export const hydrate = async (ctx: AppCTXType) => {
  const data = await ctx.body.json();
  try {
    ctx.reply({ status: "OK" });
  } catch (error) {
    ctx.statusCode = 401;
    ctx.reply({ status: "FAILED" });
  }
};
//! /save - (request in) for live consistency (goes to all replicas)
export const save = async (ctx: AppCTXType) => {
  const data = await ctx.body.json();
  try {
    // EXABASE_MANAGERS[req.effection]._run(req.query, r, req.type);
    // console.log(data);
    ctx.reply({ status: "OK" });
  } catch (error) {
    ctx.statusCode = 401;
    ctx.reply({ status: "FAILED" });
  }
};
