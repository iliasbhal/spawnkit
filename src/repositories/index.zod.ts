import { Zod } from "../../prisma";
import { z } from "zod";

export const ActorIdentifier = Zod.Actor.pick({ id: true, kind: true });

export const SendEvent = Zod.ActorEvent.pick({
  type: true,
}).and(Zod.ActorEvent.pick({ data: true }).partial({ data: true }));

export const SendEventToActorProps = z.object({
  actor: ActorIdentifier,
  event: SendEvent,
});

export const CreateEventProps = Zod.Actor.pick({ kind: true }).extend({
  input: z.object({}).passthrough(),
});
