import { Actor } from "../../prisma";

export interface CreateActorEvent<O extends object = object> {
  kind: string;
  input: O;
  origin?: string;
}

export interface InitializeActorEvent {
  kind: string;
  id: Actor["id"];
  origin?: string;
}
