import { ExabaseError, Utils } from "./classes.js";
import { app, authorise, hydrate, save } from "./http-paths-handlers.js";
import { AppCTXType } from "jetpath";

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
