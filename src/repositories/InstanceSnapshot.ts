import { z } from "zod";
import { ORM } from "../../prisma";
import { ActorIdentifier } from "./index.zod";
import { ControlledInterval } from "@/utils/ControlledInterval";

export class InstanceSnapshot {
  static async getActorSnapshot<Data>(actorId: number): Promise<Data> {
    const rawActorData = await ORM.actor.findUnique({
      select: {
        snapshot: true,
      },
      where: {
        id: actorId,
      },
    });

    return rawActorData?.snapshot as any as Data;
  }

  static async getNewActorId(actorKind: string) {
    const result = await ORM.actor.create({
      select: {
        id: true,
      },
      data: {
        kind: String(actorKind),
      },
    });

    return result.id;
  }

  static async storeActorSnapShot<Data extends object>(
    actorId: number,
    snapshot: Data,
  ) {
    return await ORM.actor.update({
      where: {
        id: actorId,
      },
      data: {
        snapshot,
      },
    });
  }

  public static subscribeToActorSnapshot<Data>(
    actor: z.infer<typeof ActorIdentifier>,
    onSnapshot: (snapshot: Data) => void,
  ) {
    return ControlledInterval.new({
      pollInterval: 10,
      onChange: onSnapshot,
      getValue: async () =>
        await InstanceSnapshot.getActorSnapshot<Data>(actor.id),
    });
  }
}
