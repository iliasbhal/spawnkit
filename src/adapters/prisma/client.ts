import { PrismaClient } from "./generated/client";

export * as Zod from "./generated/zod";

export * from "./generated/client";
export const ORM = new PrismaClient();
