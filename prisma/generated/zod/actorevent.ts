import * as z from "zod"
import { CompleteActor, RelatedActor } from "./index"

// Helper schema for JSON fields
type Literal = boolean | number | string | null
type Json = Literal | { [key: string]: Json } | Json[]
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])
const jsonSchema: z.ZodSchema<Json> = z.lazy(() => z.union([literalSchema, z.array(jsonSchema), z.record(jsonSchema)]))

export const ActorEvent = z.object({
  id: z.number().int(),
  type: z.string(),
  processed: z.boolean().nullish(),
  processedAt: z.date().nullish(),
  createdAt: z.date(),
  data: jsonSchema,
  actorId: z.number().int(),
})

export interface CompleteActorEvent extends z.infer<typeof ActorEvent> {
  actor: CompleteActor
}

/**
 * RelatedActorEvent contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedActorEvent: z.ZodSchema<CompleteActorEvent> = z.lazy(() => ActorEvent.extend({
  actor: RelatedActor,
}))
