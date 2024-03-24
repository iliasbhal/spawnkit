import * as z from "zod"
import { CompleteActorEvent, RelatedActorEvent } from "./index"

// Helper schema for JSON fields
type Literal = boolean | number | string | null
type Json = Literal | { [key: string]: Json } | Json[]
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
const jsonSchema: z.ZodSchema<Json> = z.lazy(() => z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]))

export const Actor = z.object({
  id: z.number().int(),
  kind: z.string(),
  createdAt: z.date(),
  state: jsonSchema,
  snapshot: jsonSchema,
})

export interface CompleteActor extends z.infer<typeof Actor> {
  ActorEvent: CompleteActorEvent[]
}

/**
 * RelatedActor contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedActor: z.ZodSchema<CompleteActor> = z.lazy(() => Actor.extend({
  ActorEvent: RelatedActorEvent.array(),
}))
