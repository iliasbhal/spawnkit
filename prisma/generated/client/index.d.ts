
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model Actor
 * 
 */
export type Actor = $Result.DefaultSelection<Prisma.$ActorPayload>
/**
 * Model ActorEvent
 * 
 */
export type ActorEvent = $Result.DefaultSelection<Prisma.$ActorEventPayload>

/**
 * ##  Prisma Client ʲˢ
 * 
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Actors
 * const actors = await prisma.actor.findMany()
 * ```
 *
 * 
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  T extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof T ? T['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<T['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   * 
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Actors
   * const actors = await prisma.actor.findMany()
   * ```
   *
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<T, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<'extends', Prisma.TypeMapCb, ExtArgs>

      /**
   * `prisma.actor`: Exposes CRUD operations for the **Actor** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Actors
    * const actors = await prisma.actor.findMany()
    * ```
    */
  get actor(): Prisma.ActorDelegate<ExtArgs>;

  /**
   * `prisma.actorEvent`: Exposes CRUD operations for the **ActorEvent** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ActorEvents
    * const actorEvents = await prisma.actorEvent.findMany()
    * ```
    */
  get actorEvent(): Prisma.ActorEventDelegate<ExtArgs>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError
  export import NotFoundError = runtime.NotFoundError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql

  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 5.11.0
   * Query Engine version: efd2449663b3d73d637ea1fd226bafbcf45b3102
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON object.
   * This type can be useful to enforce some input to be JSON-compatible or as a super-type to be extended from. 
   */
  export type JsonObject = {[Key in string]?: JsonValue}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches a JSON array.
   */
  export interface JsonArray extends Array<JsonValue> {}

  /**
   * From https://github.com/sindresorhus/type-fest/
   * Matches any valid JSON value.
   */
  export type JsonValue = string | number | boolean | JsonObject | JsonArray | null

  /**
   * Matches a JSON object.
   * Unlike `JsonObject`, this type allows undefined and read-only properties.
   */
  export type InputJsonObject = {readonly [Key in string]?: InputJsonValue | null}

  /**
   * Matches a JSON array.
   * Unlike `JsonArray`, readonly arrays are assignable to this type.
   */
  export interface InputJsonArray extends ReadonlyArray<InputJsonValue | null> {}

  /**
   * Matches any valid value that can be used as an input for operations like
   * create and update as the value of a JSON field. Unlike `JsonValue`, this
   * type allows read-only arrays and read-only object properties and disallows
   * `null` at the top level.
   *
   * `null` cannot be used as the value of a JSON field because its meaning
   * would be ambiguous. Use `Prisma.JsonNull` to store the JSON null value or
   * `Prisma.DbNull` to clear the JSON value and set the field to the database
   * NULL value instead.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-by-null-values
   */
  export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray | { toJSON(): unknown }

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    Actor: 'Actor',
    ActorEvent: 'ActorEvent'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }


  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs}, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    meta: {
      modelProps: 'actor' | 'actorEvent'
      txIsolationLevel: Prisma.TransactionIsolationLevel
    },
    model: {
      Actor: {
        payload: Prisma.$ActorPayload<ExtArgs>
        fields: Prisma.ActorFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ActorFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ActorFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorPayload>
          }
          findFirst: {
            args: Prisma.ActorFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ActorFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorPayload>
          }
          findMany: {
            args: Prisma.ActorFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorPayload>[]
          }
          create: {
            args: Prisma.ActorCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorPayload>
          }
          createMany: {
            args: Prisma.ActorCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.ActorDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorPayload>
          }
          update: {
            args: Prisma.ActorUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorPayload>
          }
          deleteMany: {
            args: Prisma.ActorDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.ActorUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.ActorUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorPayload>
          }
          aggregate: {
            args: Prisma.ActorAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateActor>
          }
          groupBy: {
            args: Prisma.ActorGroupByArgs<ExtArgs>,
            result: $Utils.Optional<ActorGroupByOutputType>[]
          }
          count: {
            args: Prisma.ActorCountArgs<ExtArgs>,
            result: $Utils.Optional<ActorCountAggregateOutputType> | number
          }
        }
      }
      ActorEvent: {
        payload: Prisma.$ActorEventPayload<ExtArgs>
        fields: Prisma.ActorEventFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ActorEventFindUniqueArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorEventPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ActorEventFindUniqueOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorEventPayload>
          }
          findFirst: {
            args: Prisma.ActorEventFindFirstArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorEventPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ActorEventFindFirstOrThrowArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorEventPayload>
          }
          findMany: {
            args: Prisma.ActorEventFindManyArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorEventPayload>[]
          }
          create: {
            args: Prisma.ActorEventCreateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorEventPayload>
          }
          createMany: {
            args: Prisma.ActorEventCreateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          delete: {
            args: Prisma.ActorEventDeleteArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorEventPayload>
          }
          update: {
            args: Prisma.ActorEventUpdateArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorEventPayload>
          }
          deleteMany: {
            args: Prisma.ActorEventDeleteManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          updateMany: {
            args: Prisma.ActorEventUpdateManyArgs<ExtArgs>,
            result: Prisma.BatchPayload
          }
          upsert: {
            args: Prisma.ActorEventUpsertArgs<ExtArgs>,
            result: $Utils.PayloadToResult<Prisma.$ActorEventPayload>
          }
          aggregate: {
            args: Prisma.ActorEventAggregateArgs<ExtArgs>,
            result: $Utils.Optional<AggregateActorEvent>
          }
          groupBy: {
            args: Prisma.ActorEventGroupByArgs<ExtArgs>,
            result: $Utils.Optional<ActorEventGroupByOutputType>[]
          }
          count: {
            args: Prisma.ActorEventCountArgs<ExtArgs>,
            result: $Utils.Optional<ActorEventCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<'define', Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'update'
    | 'updateMany'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type ActorCountOutputType
   */

  export type ActorCountOutputType = {
    ActorEvent: number
  }

  export type ActorCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ActorEvent?: boolean | ActorCountOutputTypeCountActorEventArgs
  }

  // Custom InputTypes

  /**
   * ActorCountOutputType without action
   */
  export type ActorCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorCountOutputType
     */
    select?: ActorCountOutputTypeSelect<ExtArgs> | null
  }


  /**
   * ActorCountOutputType without action
   */
  export type ActorCountOutputTypeCountActorEventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ActorEventWhereInput
  }



  /**
   * Models
   */

  /**
   * Model Actor
   */

  export type AggregateActor = {
    _count: ActorCountAggregateOutputType | null
    _avg: ActorAvgAggregateOutputType | null
    _sum: ActorSumAggregateOutputType | null
    _min: ActorMinAggregateOutputType | null
    _max: ActorMaxAggregateOutputType | null
  }

  export type ActorAvgAggregateOutputType = {
    id: number | null
  }

  export type ActorSumAggregateOutputType = {
    id: number | null
  }

  export type ActorMinAggregateOutputType = {
    id: number | null
    kind: string | null
    createdAt: Date | null
  }

  export type ActorMaxAggregateOutputType = {
    id: number | null
    kind: string | null
    createdAt: Date | null
  }

  export type ActorCountAggregateOutputType = {
    id: number
    kind: number
    createdAt: number
    state: number
    snapshot: number
    _all: number
  }


  export type ActorAvgAggregateInputType = {
    id?: true
  }

  export type ActorSumAggregateInputType = {
    id?: true
  }

  export type ActorMinAggregateInputType = {
    id?: true
    kind?: true
    createdAt?: true
  }

  export type ActorMaxAggregateInputType = {
    id?: true
    kind?: true
    createdAt?: true
  }

  export type ActorCountAggregateInputType = {
    id?: true
    kind?: true
    createdAt?: true
    state?: true
    snapshot?: true
    _all?: true
  }

  export type ActorAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Actor to aggregate.
     */
    where?: ActorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Actors to fetch.
     */
    orderBy?: ActorOrderByWithRelationInput | ActorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ActorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Actors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Actors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Actors
    **/
    _count?: true | ActorCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ActorAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ActorSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ActorMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ActorMaxAggregateInputType
  }

  export type GetActorAggregateType<T extends ActorAggregateArgs> = {
        [P in keyof T & keyof AggregateActor]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateActor[P]>
      : GetScalarType<T[P], AggregateActor[P]>
  }




  export type ActorGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ActorWhereInput
    orderBy?: ActorOrderByWithAggregationInput | ActorOrderByWithAggregationInput[]
    by: ActorScalarFieldEnum[] | ActorScalarFieldEnum
    having?: ActorScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ActorCountAggregateInputType | true
    _avg?: ActorAvgAggregateInputType
    _sum?: ActorSumAggregateInputType
    _min?: ActorMinAggregateInputType
    _max?: ActorMaxAggregateInputType
  }

  export type ActorGroupByOutputType = {
    id: number
    kind: string
    createdAt: Date
    state: JsonValue | null
    snapshot: JsonValue | null
    _count: ActorCountAggregateOutputType | null
    _avg: ActorAvgAggregateOutputType | null
    _sum: ActorSumAggregateOutputType | null
    _min: ActorMinAggregateOutputType | null
    _max: ActorMaxAggregateOutputType | null
  }

  type GetActorGroupByPayload<T extends ActorGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ActorGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ActorGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ActorGroupByOutputType[P]>
            : GetScalarType<T[P], ActorGroupByOutputType[P]>
        }
      >
    >


  export type ActorSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    kind?: boolean
    createdAt?: boolean
    state?: boolean
    snapshot?: boolean
    ActorEvent?: boolean | Actor$ActorEventArgs<ExtArgs>
    _count?: boolean | ActorCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["actor"]>

  export type ActorSelectScalar = {
    id?: boolean
    kind?: boolean
    createdAt?: boolean
    state?: boolean
    snapshot?: boolean
  }

  export type ActorInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    ActorEvent?: boolean | Actor$ActorEventArgs<ExtArgs>
    _count?: boolean | ActorCountOutputTypeDefaultArgs<ExtArgs>
  }


  export type $ActorPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Actor"
    objects: {
      ActorEvent: Prisma.$ActorEventPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      kind: string
      createdAt: Date
      state: Prisma.JsonValue | null
      snapshot: Prisma.JsonValue | null
    }, ExtArgs["result"]["actor"]>
    composites: {}
  }


  type ActorGetPayload<S extends boolean | null | undefined | ActorDefaultArgs> = $Result.GetResult<Prisma.$ActorPayload, S>

  type ActorCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ActorFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ActorCountAggregateInputType | true
    }

  export interface ActorDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Actor'], meta: { name: 'Actor' } }
    /**
     * Find zero or one Actor that matches the filter.
     * @param {ActorFindUniqueArgs} args - Arguments to find a Actor
     * @example
     * // Get one Actor
     * const actor = await prisma.actor.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends ActorFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, ActorFindUniqueArgs<ExtArgs>>
    ): Prisma__ActorClient<$Result.GetResult<Prisma.$ActorPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one Actor that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {ActorFindUniqueOrThrowArgs} args - Arguments to find a Actor
     * @example
     * // Get one Actor
     * const actor = await prisma.actor.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends ActorFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__ActorClient<$Result.GetResult<Prisma.$ActorPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first Actor that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorFindFirstArgs} args - Arguments to find a Actor
     * @example
     * // Get one Actor
     * const actor = await prisma.actor.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends ActorFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorFindFirstArgs<ExtArgs>>
    ): Prisma__ActorClient<$Result.GetResult<Prisma.$ActorPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first Actor that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorFindFirstOrThrowArgs} args - Arguments to find a Actor
     * @example
     * // Get one Actor
     * const actor = await prisma.actor.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends ActorFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__ActorClient<$Result.GetResult<Prisma.$ActorPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more Actors that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Actors
     * const actors = await prisma.actor.findMany()
     * 
     * // Get first 10 Actors
     * const actors = await prisma.actor.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const actorWithIdOnly = await prisma.actor.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends ActorFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ActorPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a Actor.
     * @param {ActorCreateArgs} args - Arguments to create a Actor.
     * @example
     * // Create one Actor
     * const Actor = await prisma.actor.create({
     *   data: {
     *     // ... data to create a Actor
     *   }
     * })
     * 
    **/
    create<T extends ActorCreateArgs<ExtArgs>>(
      args: SelectSubset<T, ActorCreateArgs<ExtArgs>>
    ): Prisma__ActorClient<$Result.GetResult<Prisma.$ActorPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many Actors.
     *     @param {ActorCreateManyArgs} args - Arguments to create many Actors.
     *     @example
     *     // Create many Actors
     *     const actor = await prisma.actor.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends ActorCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Actor.
     * @param {ActorDeleteArgs} args - Arguments to delete one Actor.
     * @example
     * // Delete one Actor
     * const Actor = await prisma.actor.delete({
     *   where: {
     *     // ... filter to delete one Actor
     *   }
     * })
     * 
    **/
    delete<T extends ActorDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, ActorDeleteArgs<ExtArgs>>
    ): Prisma__ActorClient<$Result.GetResult<Prisma.$ActorPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one Actor.
     * @param {ActorUpdateArgs} args - Arguments to update one Actor.
     * @example
     * // Update one Actor
     * const actor = await prisma.actor.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends ActorUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, ActorUpdateArgs<ExtArgs>>
    ): Prisma__ActorClient<$Result.GetResult<Prisma.$ActorPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more Actors.
     * @param {ActorDeleteManyArgs} args - Arguments to filter Actors to delete.
     * @example
     * // Delete a few Actors
     * const { count } = await prisma.actor.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends ActorDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Actors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Actors
     * const actor = await prisma.actor.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends ActorUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, ActorUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Actor.
     * @param {ActorUpsertArgs} args - Arguments to update or create a Actor.
     * @example
     * // Update or create a Actor
     * const actor = await prisma.actor.upsert({
     *   create: {
     *     // ... data to create a Actor
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Actor we want to update
     *   }
     * })
    **/
    upsert<T extends ActorUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, ActorUpsertArgs<ExtArgs>>
    ): Prisma__ActorClient<$Result.GetResult<Prisma.$ActorPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of Actors.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorCountArgs} args - Arguments to filter Actors to count.
     * @example
     * // Count the number of Actors
     * const count = await prisma.actor.count({
     *   where: {
     *     // ... the filter for the Actors we want to count
     *   }
     * })
    **/
    count<T extends ActorCountArgs>(
      args?: Subset<T, ActorCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ActorCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Actor.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ActorAggregateArgs>(args: Subset<T, ActorAggregateArgs>): Prisma.PrismaPromise<GetActorAggregateType<T>>

    /**
     * Group by Actor.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ActorGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ActorGroupByArgs['orderBy'] }
        : { orderBy?: ActorGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ActorGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetActorGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Actor model
   */
  readonly fields: ActorFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Actor.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ActorClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    ActorEvent<T extends Actor$ActorEventArgs<ExtArgs> = {}>(args?: Subset<T, Actor$ActorEventArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ActorEventPayload<ExtArgs>, T, 'findMany'> | Null>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the Actor model
   */ 
  interface ActorFieldRefs {
    readonly id: FieldRef<"Actor", 'Int'>
    readonly kind: FieldRef<"Actor", 'String'>
    readonly createdAt: FieldRef<"Actor", 'DateTime'>
    readonly state: FieldRef<"Actor", 'Json'>
    readonly snapshot: FieldRef<"Actor", 'Json'>
  }
    

  // Custom InputTypes

  /**
   * Actor findUnique
   */
  export type ActorFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Actor
     */
    select?: ActorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorInclude<ExtArgs> | null
    /**
     * Filter, which Actor to fetch.
     */
    where: ActorWhereUniqueInput
  }


  /**
   * Actor findUniqueOrThrow
   */
  export type ActorFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Actor
     */
    select?: ActorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorInclude<ExtArgs> | null
    /**
     * Filter, which Actor to fetch.
     */
    where: ActorWhereUniqueInput
  }


  /**
   * Actor findFirst
   */
  export type ActorFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Actor
     */
    select?: ActorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorInclude<ExtArgs> | null
    /**
     * Filter, which Actor to fetch.
     */
    where?: ActorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Actors to fetch.
     */
    orderBy?: ActorOrderByWithRelationInput | ActorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Actors.
     */
    cursor?: ActorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Actors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Actors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Actors.
     */
    distinct?: ActorScalarFieldEnum | ActorScalarFieldEnum[]
  }


  /**
   * Actor findFirstOrThrow
   */
  export type ActorFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Actor
     */
    select?: ActorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorInclude<ExtArgs> | null
    /**
     * Filter, which Actor to fetch.
     */
    where?: ActorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Actors to fetch.
     */
    orderBy?: ActorOrderByWithRelationInput | ActorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Actors.
     */
    cursor?: ActorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Actors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Actors.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Actors.
     */
    distinct?: ActorScalarFieldEnum | ActorScalarFieldEnum[]
  }


  /**
   * Actor findMany
   */
  export type ActorFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Actor
     */
    select?: ActorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorInclude<ExtArgs> | null
    /**
     * Filter, which Actors to fetch.
     */
    where?: ActorWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Actors to fetch.
     */
    orderBy?: ActorOrderByWithRelationInput | ActorOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Actors.
     */
    cursor?: ActorWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Actors from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Actors.
     */
    skip?: number
    distinct?: ActorScalarFieldEnum | ActorScalarFieldEnum[]
  }


  /**
   * Actor create
   */
  export type ActorCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Actor
     */
    select?: ActorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorInclude<ExtArgs> | null
    /**
     * The data needed to create a Actor.
     */
    data: XOR<ActorCreateInput, ActorUncheckedCreateInput>
  }


  /**
   * Actor createMany
   */
  export type ActorCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Actors.
     */
    data: ActorCreateManyInput | ActorCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * Actor update
   */
  export type ActorUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Actor
     */
    select?: ActorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorInclude<ExtArgs> | null
    /**
     * The data needed to update a Actor.
     */
    data: XOR<ActorUpdateInput, ActorUncheckedUpdateInput>
    /**
     * Choose, which Actor to update.
     */
    where: ActorWhereUniqueInput
  }


  /**
   * Actor updateMany
   */
  export type ActorUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Actors.
     */
    data: XOR<ActorUpdateManyMutationInput, ActorUncheckedUpdateManyInput>
    /**
     * Filter which Actors to update
     */
    where?: ActorWhereInput
  }


  /**
   * Actor upsert
   */
  export type ActorUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Actor
     */
    select?: ActorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorInclude<ExtArgs> | null
    /**
     * The filter to search for the Actor to update in case it exists.
     */
    where: ActorWhereUniqueInput
    /**
     * In case the Actor found by the `where` argument doesn't exist, create a new Actor with this data.
     */
    create: XOR<ActorCreateInput, ActorUncheckedCreateInput>
    /**
     * In case the Actor was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ActorUpdateInput, ActorUncheckedUpdateInput>
  }


  /**
   * Actor delete
   */
  export type ActorDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Actor
     */
    select?: ActorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorInclude<ExtArgs> | null
    /**
     * Filter which Actor to delete.
     */
    where: ActorWhereUniqueInput
  }


  /**
   * Actor deleteMany
   */
  export type ActorDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Actors to delete
     */
    where?: ActorWhereInput
  }


  /**
   * Actor.ActorEvent
   */
  export type Actor$ActorEventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorEvent
     */
    select?: ActorEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorEventInclude<ExtArgs> | null
    where?: ActorEventWhereInput
    orderBy?: ActorEventOrderByWithRelationInput | ActorEventOrderByWithRelationInput[]
    cursor?: ActorEventWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ActorEventScalarFieldEnum | ActorEventScalarFieldEnum[]
  }


  /**
   * Actor without action
   */
  export type ActorDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Actor
     */
    select?: ActorSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorInclude<ExtArgs> | null
  }



  /**
   * Model ActorEvent
   */

  export type AggregateActorEvent = {
    _count: ActorEventCountAggregateOutputType | null
    _avg: ActorEventAvgAggregateOutputType | null
    _sum: ActorEventSumAggregateOutputType | null
    _min: ActorEventMinAggregateOutputType | null
    _max: ActorEventMaxAggregateOutputType | null
  }

  export type ActorEventAvgAggregateOutputType = {
    id: number | null
    actorId: number | null
  }

  export type ActorEventSumAggregateOutputType = {
    id: number | null
    actorId: number | null
  }

  export type ActorEventMinAggregateOutputType = {
    id: number | null
    type: string | null
    processed: boolean | null
    processedAt: Date | null
    createdAt: Date | null
    actorId: number | null
  }

  export type ActorEventMaxAggregateOutputType = {
    id: number | null
    type: string | null
    processed: boolean | null
    processedAt: Date | null
    createdAt: Date | null
    actorId: number | null
  }

  export type ActorEventCountAggregateOutputType = {
    id: number
    type: number
    processed: number
    processedAt: number
    createdAt: number
    data: number
    actorId: number
    _all: number
  }


  export type ActorEventAvgAggregateInputType = {
    id?: true
    actorId?: true
  }

  export type ActorEventSumAggregateInputType = {
    id?: true
    actorId?: true
  }

  export type ActorEventMinAggregateInputType = {
    id?: true
    type?: true
    processed?: true
    processedAt?: true
    createdAt?: true
    actorId?: true
  }

  export type ActorEventMaxAggregateInputType = {
    id?: true
    type?: true
    processed?: true
    processedAt?: true
    createdAt?: true
    actorId?: true
  }

  export type ActorEventCountAggregateInputType = {
    id?: true
    type?: true
    processed?: true
    processedAt?: true
    createdAt?: true
    data?: true
    actorId?: true
    _all?: true
  }

  export type ActorEventAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ActorEvent to aggregate.
     */
    where?: ActorEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ActorEvents to fetch.
     */
    orderBy?: ActorEventOrderByWithRelationInput | ActorEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ActorEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ActorEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ActorEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ActorEvents
    **/
    _count?: true | ActorEventCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ActorEventAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ActorEventSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ActorEventMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ActorEventMaxAggregateInputType
  }

  export type GetActorEventAggregateType<T extends ActorEventAggregateArgs> = {
        [P in keyof T & keyof AggregateActorEvent]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateActorEvent[P]>
      : GetScalarType<T[P], AggregateActorEvent[P]>
  }




  export type ActorEventGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ActorEventWhereInput
    orderBy?: ActorEventOrderByWithAggregationInput | ActorEventOrderByWithAggregationInput[]
    by: ActorEventScalarFieldEnum[] | ActorEventScalarFieldEnum
    having?: ActorEventScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ActorEventCountAggregateInputType | true
    _avg?: ActorEventAvgAggregateInputType
    _sum?: ActorEventSumAggregateInputType
    _min?: ActorEventMinAggregateInputType
    _max?: ActorEventMaxAggregateInputType
  }

  export type ActorEventGroupByOutputType = {
    id: number
    type: string
    processed: boolean | null
    processedAt: Date | null
    createdAt: Date
    data: JsonValue
    actorId: number
    _count: ActorEventCountAggregateOutputType | null
    _avg: ActorEventAvgAggregateOutputType | null
    _sum: ActorEventSumAggregateOutputType | null
    _min: ActorEventMinAggregateOutputType | null
    _max: ActorEventMaxAggregateOutputType | null
  }

  type GetActorEventGroupByPayload<T extends ActorEventGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ActorEventGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ActorEventGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ActorEventGroupByOutputType[P]>
            : GetScalarType<T[P], ActorEventGroupByOutputType[P]>
        }
      >
    >


  export type ActorEventSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    type?: boolean
    processed?: boolean
    processedAt?: boolean
    createdAt?: boolean
    data?: boolean
    actorId?: boolean
    actor?: boolean | ActorDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["actorEvent"]>

  export type ActorEventSelectScalar = {
    id?: boolean
    type?: boolean
    processed?: boolean
    processedAt?: boolean
    createdAt?: boolean
    data?: boolean
    actorId?: boolean
  }

  export type ActorEventInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    actor?: boolean | ActorDefaultArgs<ExtArgs>
  }


  export type $ActorEventPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ActorEvent"
    objects: {
      actor: Prisma.$ActorPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      type: string
      processed: boolean | null
      processedAt: Date | null
      createdAt: Date
      data: Prisma.JsonValue
      actorId: number
    }, ExtArgs["result"]["actorEvent"]>
    composites: {}
  }


  type ActorEventGetPayload<S extends boolean | null | undefined | ActorEventDefaultArgs> = $Result.GetResult<Prisma.$ActorEventPayload, S>

  type ActorEventCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = 
    Omit<ActorEventFindManyArgs, 'select' | 'include' | 'distinct'> & {
      select?: ActorEventCountAggregateInputType | true
    }

  export interface ActorEventDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ActorEvent'], meta: { name: 'ActorEvent' } }
    /**
     * Find zero or one ActorEvent that matches the filter.
     * @param {ActorEventFindUniqueArgs} args - Arguments to find a ActorEvent
     * @example
     * // Get one ActorEvent
     * const actorEvent = await prisma.actorEvent.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUnique<T extends ActorEventFindUniqueArgs<ExtArgs>>(
      args: SelectSubset<T, ActorEventFindUniqueArgs<ExtArgs>>
    ): Prisma__ActorEventClient<$Result.GetResult<Prisma.$ActorEventPayload<ExtArgs>, T, 'findUnique'> | null, null, ExtArgs>

    /**
     * Find one ActorEvent that matches the filter or throw an error  with `error.code='P2025'` 
     *     if no matches were found.
     * @param {ActorEventFindUniqueOrThrowArgs} args - Arguments to find a ActorEvent
     * @example
     * // Get one ActorEvent
     * const actorEvent = await prisma.actorEvent.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findUniqueOrThrow<T extends ActorEventFindUniqueOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorEventFindUniqueOrThrowArgs<ExtArgs>>
    ): Prisma__ActorEventClient<$Result.GetResult<Prisma.$ActorEventPayload<ExtArgs>, T, 'findUniqueOrThrow'>, never, ExtArgs>

    /**
     * Find the first ActorEvent that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorEventFindFirstArgs} args - Arguments to find a ActorEvent
     * @example
     * // Get one ActorEvent
     * const actorEvent = await prisma.actorEvent.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirst<T extends ActorEventFindFirstArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorEventFindFirstArgs<ExtArgs>>
    ): Prisma__ActorEventClient<$Result.GetResult<Prisma.$ActorEventPayload<ExtArgs>, T, 'findFirst'> | null, null, ExtArgs>

    /**
     * Find the first ActorEvent that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorEventFindFirstOrThrowArgs} args - Arguments to find a ActorEvent
     * @example
     * // Get one ActorEvent
     * const actorEvent = await prisma.actorEvent.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
    **/
    findFirstOrThrow<T extends ActorEventFindFirstOrThrowArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorEventFindFirstOrThrowArgs<ExtArgs>>
    ): Prisma__ActorEventClient<$Result.GetResult<Prisma.$ActorEventPayload<ExtArgs>, T, 'findFirstOrThrow'>, never, ExtArgs>

    /**
     * Find zero or more ActorEvents that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorEventFindManyArgs=} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ActorEvents
     * const actorEvents = await prisma.actorEvent.findMany()
     * 
     * // Get first 10 ActorEvents
     * const actorEvents = await prisma.actorEvent.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const actorEventWithIdOnly = await prisma.actorEvent.findMany({ select: { id: true } })
     * 
    **/
    findMany<T extends ActorEventFindManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorEventFindManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ActorEventPayload<ExtArgs>, T, 'findMany'>>

    /**
     * Create a ActorEvent.
     * @param {ActorEventCreateArgs} args - Arguments to create a ActorEvent.
     * @example
     * // Create one ActorEvent
     * const ActorEvent = await prisma.actorEvent.create({
     *   data: {
     *     // ... data to create a ActorEvent
     *   }
     * })
     * 
    **/
    create<T extends ActorEventCreateArgs<ExtArgs>>(
      args: SelectSubset<T, ActorEventCreateArgs<ExtArgs>>
    ): Prisma__ActorEventClient<$Result.GetResult<Prisma.$ActorEventPayload<ExtArgs>, T, 'create'>, never, ExtArgs>

    /**
     * Create many ActorEvents.
     *     @param {ActorEventCreateManyArgs} args - Arguments to create many ActorEvents.
     *     @example
     *     // Create many ActorEvents
     *     const actorEvent = await prisma.actorEvent.createMany({
     *       data: {
     *         // ... provide data here
     *       }
     *     })
     *     
    **/
    createMany<T extends ActorEventCreateManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorEventCreateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a ActorEvent.
     * @param {ActorEventDeleteArgs} args - Arguments to delete one ActorEvent.
     * @example
     * // Delete one ActorEvent
     * const ActorEvent = await prisma.actorEvent.delete({
     *   where: {
     *     // ... filter to delete one ActorEvent
     *   }
     * })
     * 
    **/
    delete<T extends ActorEventDeleteArgs<ExtArgs>>(
      args: SelectSubset<T, ActorEventDeleteArgs<ExtArgs>>
    ): Prisma__ActorEventClient<$Result.GetResult<Prisma.$ActorEventPayload<ExtArgs>, T, 'delete'>, never, ExtArgs>

    /**
     * Update one ActorEvent.
     * @param {ActorEventUpdateArgs} args - Arguments to update one ActorEvent.
     * @example
     * // Update one ActorEvent
     * const actorEvent = await prisma.actorEvent.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    update<T extends ActorEventUpdateArgs<ExtArgs>>(
      args: SelectSubset<T, ActorEventUpdateArgs<ExtArgs>>
    ): Prisma__ActorEventClient<$Result.GetResult<Prisma.$ActorEventPayload<ExtArgs>, T, 'update'>, never, ExtArgs>

    /**
     * Delete zero or more ActorEvents.
     * @param {ActorEventDeleteManyArgs} args - Arguments to filter ActorEvents to delete.
     * @example
     * // Delete a few ActorEvents
     * const { count } = await prisma.actorEvent.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
    **/
    deleteMany<T extends ActorEventDeleteManyArgs<ExtArgs>>(
      args?: SelectSubset<T, ActorEventDeleteManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ActorEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorEventUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ActorEvents
     * const actorEvent = await prisma.actorEvent.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
    **/
    updateMany<T extends ActorEventUpdateManyArgs<ExtArgs>>(
      args: SelectSubset<T, ActorEventUpdateManyArgs<ExtArgs>>
    ): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ActorEvent.
     * @param {ActorEventUpsertArgs} args - Arguments to update or create a ActorEvent.
     * @example
     * // Update or create a ActorEvent
     * const actorEvent = await prisma.actorEvent.upsert({
     *   create: {
     *     // ... data to create a ActorEvent
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ActorEvent we want to update
     *   }
     * })
    **/
    upsert<T extends ActorEventUpsertArgs<ExtArgs>>(
      args: SelectSubset<T, ActorEventUpsertArgs<ExtArgs>>
    ): Prisma__ActorEventClient<$Result.GetResult<Prisma.$ActorEventPayload<ExtArgs>, T, 'upsert'>, never, ExtArgs>

    /**
     * Count the number of ActorEvents.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorEventCountArgs} args - Arguments to filter ActorEvents to count.
     * @example
     * // Count the number of ActorEvents
     * const count = await prisma.actorEvent.count({
     *   where: {
     *     // ... the filter for the ActorEvents we want to count
     *   }
     * })
    **/
    count<T extends ActorEventCountArgs>(
      args?: Subset<T, ActorEventCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ActorEventCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ActorEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorEventAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ActorEventAggregateArgs>(args: Subset<T, ActorEventAggregateArgs>): Prisma.PrismaPromise<GetActorEventAggregateType<T>>

    /**
     * Group by ActorEvent.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ActorEventGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ActorEventGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ActorEventGroupByArgs['orderBy'] }
        : { orderBy?: ActorEventGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ActorEventGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetActorEventGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ActorEvent model
   */
  readonly fields: ActorEventFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ActorEvent.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ActorEventClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: 'PrismaPromise';

    actor<T extends ActorDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ActorDefaultArgs<ExtArgs>>): Prisma__ActorClient<$Result.GetResult<Prisma.$ActorPayload<ExtArgs>, T, 'findUniqueOrThrow'> | Null, Null, ExtArgs>;

    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>;
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>;
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>;
  }



  /**
   * Fields of the ActorEvent model
   */ 
  interface ActorEventFieldRefs {
    readonly id: FieldRef<"ActorEvent", 'Int'>
    readonly type: FieldRef<"ActorEvent", 'String'>
    readonly processed: FieldRef<"ActorEvent", 'Boolean'>
    readonly processedAt: FieldRef<"ActorEvent", 'DateTime'>
    readonly createdAt: FieldRef<"ActorEvent", 'DateTime'>
    readonly data: FieldRef<"ActorEvent", 'Json'>
    readonly actorId: FieldRef<"ActorEvent", 'Int'>
  }
    

  // Custom InputTypes

  /**
   * ActorEvent findUnique
   */
  export type ActorEventFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorEvent
     */
    select?: ActorEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorEventInclude<ExtArgs> | null
    /**
     * Filter, which ActorEvent to fetch.
     */
    where: ActorEventWhereUniqueInput
  }


  /**
   * ActorEvent findUniqueOrThrow
   */
  export type ActorEventFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorEvent
     */
    select?: ActorEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorEventInclude<ExtArgs> | null
    /**
     * Filter, which ActorEvent to fetch.
     */
    where: ActorEventWhereUniqueInput
  }


  /**
   * ActorEvent findFirst
   */
  export type ActorEventFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorEvent
     */
    select?: ActorEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorEventInclude<ExtArgs> | null
    /**
     * Filter, which ActorEvent to fetch.
     */
    where?: ActorEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ActorEvents to fetch.
     */
    orderBy?: ActorEventOrderByWithRelationInput | ActorEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ActorEvents.
     */
    cursor?: ActorEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ActorEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ActorEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ActorEvents.
     */
    distinct?: ActorEventScalarFieldEnum | ActorEventScalarFieldEnum[]
  }


  /**
   * ActorEvent findFirstOrThrow
   */
  export type ActorEventFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorEvent
     */
    select?: ActorEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorEventInclude<ExtArgs> | null
    /**
     * Filter, which ActorEvent to fetch.
     */
    where?: ActorEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ActorEvents to fetch.
     */
    orderBy?: ActorEventOrderByWithRelationInput | ActorEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ActorEvents.
     */
    cursor?: ActorEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ActorEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ActorEvents.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ActorEvents.
     */
    distinct?: ActorEventScalarFieldEnum | ActorEventScalarFieldEnum[]
  }


  /**
   * ActorEvent findMany
   */
  export type ActorEventFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorEvent
     */
    select?: ActorEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorEventInclude<ExtArgs> | null
    /**
     * Filter, which ActorEvents to fetch.
     */
    where?: ActorEventWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ActorEvents to fetch.
     */
    orderBy?: ActorEventOrderByWithRelationInput | ActorEventOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ActorEvents.
     */
    cursor?: ActorEventWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ActorEvents from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ActorEvents.
     */
    skip?: number
    distinct?: ActorEventScalarFieldEnum | ActorEventScalarFieldEnum[]
  }


  /**
   * ActorEvent create
   */
  export type ActorEventCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorEvent
     */
    select?: ActorEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorEventInclude<ExtArgs> | null
    /**
     * The data needed to create a ActorEvent.
     */
    data: XOR<ActorEventCreateInput, ActorEventUncheckedCreateInput>
  }


  /**
   * ActorEvent createMany
   */
  export type ActorEventCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ActorEvents.
     */
    data: ActorEventCreateManyInput | ActorEventCreateManyInput[]
    skipDuplicates?: boolean
  }


  /**
   * ActorEvent update
   */
  export type ActorEventUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorEvent
     */
    select?: ActorEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorEventInclude<ExtArgs> | null
    /**
     * The data needed to update a ActorEvent.
     */
    data: XOR<ActorEventUpdateInput, ActorEventUncheckedUpdateInput>
    /**
     * Choose, which ActorEvent to update.
     */
    where: ActorEventWhereUniqueInput
  }


  /**
   * ActorEvent updateMany
   */
  export type ActorEventUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ActorEvents.
     */
    data: XOR<ActorEventUpdateManyMutationInput, ActorEventUncheckedUpdateManyInput>
    /**
     * Filter which ActorEvents to update
     */
    where?: ActorEventWhereInput
  }


  /**
   * ActorEvent upsert
   */
  export type ActorEventUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorEvent
     */
    select?: ActorEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorEventInclude<ExtArgs> | null
    /**
     * The filter to search for the ActorEvent to update in case it exists.
     */
    where: ActorEventWhereUniqueInput
    /**
     * In case the ActorEvent found by the `where` argument doesn't exist, create a new ActorEvent with this data.
     */
    create: XOR<ActorEventCreateInput, ActorEventUncheckedCreateInput>
    /**
     * In case the ActorEvent was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ActorEventUpdateInput, ActorEventUncheckedUpdateInput>
  }


  /**
   * ActorEvent delete
   */
  export type ActorEventDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorEvent
     */
    select?: ActorEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorEventInclude<ExtArgs> | null
    /**
     * Filter which ActorEvent to delete.
     */
    where: ActorEventWhereUniqueInput
  }


  /**
   * ActorEvent deleteMany
   */
  export type ActorEventDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ActorEvents to delete
     */
    where?: ActorEventWhereInput
  }


  /**
   * ActorEvent without action
   */
  export type ActorEventDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ActorEvent
     */
    select?: ActorEventSelect<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well.
     */
    include?: ActorEventInclude<ExtArgs> | null
  }



  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const ActorScalarFieldEnum: {
    id: 'id',
    kind: 'kind',
    createdAt: 'createdAt',
    state: 'state',
    snapshot: 'snapshot'
  };

  export type ActorScalarFieldEnum = (typeof ActorScalarFieldEnum)[keyof typeof ActorScalarFieldEnum]


  export const ActorEventScalarFieldEnum: {
    id: 'id',
    type: 'type',
    processed: 'processed',
    processedAt: 'processedAt',
    createdAt: 'createdAt',
    data: 'data',
    actorId: 'actorId'
  };

  export type ActorEventScalarFieldEnum = (typeof ActorEventScalarFieldEnum)[keyof typeof ActorEventScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type ActorWhereInput = {
    AND?: ActorWhereInput | ActorWhereInput[]
    OR?: ActorWhereInput[]
    NOT?: ActorWhereInput | ActorWhereInput[]
    id?: IntFilter<"Actor"> | number
    kind?: StringFilter<"Actor"> | string
    createdAt?: DateTimeFilter<"Actor"> | Date | string
    state?: JsonNullableFilter<"Actor">
    snapshot?: JsonNullableFilter<"Actor">
    ActorEvent?: ActorEventListRelationFilter
  }

  export type ActorOrderByWithRelationInput = {
    id?: SortOrder
    kind?: SortOrder
    createdAt?: SortOrder
    state?: SortOrderInput | SortOrder
    snapshot?: SortOrderInput | SortOrder
    ActorEvent?: ActorEventOrderByRelationAggregateInput
  }

  export type ActorWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ActorWhereInput | ActorWhereInput[]
    OR?: ActorWhereInput[]
    NOT?: ActorWhereInput | ActorWhereInput[]
    kind?: StringFilter<"Actor"> | string
    createdAt?: DateTimeFilter<"Actor"> | Date | string
    state?: JsonNullableFilter<"Actor">
    snapshot?: JsonNullableFilter<"Actor">
    ActorEvent?: ActorEventListRelationFilter
  }, "id">

  export type ActorOrderByWithAggregationInput = {
    id?: SortOrder
    kind?: SortOrder
    createdAt?: SortOrder
    state?: SortOrderInput | SortOrder
    snapshot?: SortOrderInput | SortOrder
    _count?: ActorCountOrderByAggregateInput
    _avg?: ActorAvgOrderByAggregateInput
    _max?: ActorMaxOrderByAggregateInput
    _min?: ActorMinOrderByAggregateInput
    _sum?: ActorSumOrderByAggregateInput
  }

  export type ActorScalarWhereWithAggregatesInput = {
    AND?: ActorScalarWhereWithAggregatesInput | ActorScalarWhereWithAggregatesInput[]
    OR?: ActorScalarWhereWithAggregatesInput[]
    NOT?: ActorScalarWhereWithAggregatesInput | ActorScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Actor"> | number
    kind?: StringWithAggregatesFilter<"Actor"> | string
    createdAt?: DateTimeWithAggregatesFilter<"Actor"> | Date | string
    state?: JsonNullableWithAggregatesFilter<"Actor">
    snapshot?: JsonNullableWithAggregatesFilter<"Actor">
  }

  export type ActorEventWhereInput = {
    AND?: ActorEventWhereInput | ActorEventWhereInput[]
    OR?: ActorEventWhereInput[]
    NOT?: ActorEventWhereInput | ActorEventWhereInput[]
    id?: IntFilter<"ActorEvent"> | number
    type?: StringFilter<"ActorEvent"> | string
    processed?: BoolNullableFilter<"ActorEvent"> | boolean | null
    processedAt?: DateTimeNullableFilter<"ActorEvent"> | Date | string | null
    createdAt?: DateTimeFilter<"ActorEvent"> | Date | string
    data?: JsonFilter<"ActorEvent">
    actorId?: IntFilter<"ActorEvent"> | number
    actor?: XOR<ActorRelationFilter, ActorWhereInput>
  }

  export type ActorEventOrderByWithRelationInput = {
    id?: SortOrder
    type?: SortOrder
    processed?: SortOrderInput | SortOrder
    processedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    data?: SortOrder
    actorId?: SortOrder
    actor?: ActorOrderByWithRelationInput
  }

  export type ActorEventWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ActorEventWhereInput | ActorEventWhereInput[]
    OR?: ActorEventWhereInput[]
    NOT?: ActorEventWhereInput | ActorEventWhereInput[]
    type?: StringFilter<"ActorEvent"> | string
    processed?: BoolNullableFilter<"ActorEvent"> | boolean | null
    processedAt?: DateTimeNullableFilter<"ActorEvent"> | Date | string | null
    createdAt?: DateTimeFilter<"ActorEvent"> | Date | string
    data?: JsonFilter<"ActorEvent">
    actorId?: IntFilter<"ActorEvent"> | number
    actor?: XOR<ActorRelationFilter, ActorWhereInput>
  }, "id">

  export type ActorEventOrderByWithAggregationInput = {
    id?: SortOrder
    type?: SortOrder
    processed?: SortOrderInput | SortOrder
    processedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    data?: SortOrder
    actorId?: SortOrder
    _count?: ActorEventCountOrderByAggregateInput
    _avg?: ActorEventAvgOrderByAggregateInput
    _max?: ActorEventMaxOrderByAggregateInput
    _min?: ActorEventMinOrderByAggregateInput
    _sum?: ActorEventSumOrderByAggregateInput
  }

  export type ActorEventScalarWhereWithAggregatesInput = {
    AND?: ActorEventScalarWhereWithAggregatesInput | ActorEventScalarWhereWithAggregatesInput[]
    OR?: ActorEventScalarWhereWithAggregatesInput[]
    NOT?: ActorEventScalarWhereWithAggregatesInput | ActorEventScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ActorEvent"> | number
    type?: StringWithAggregatesFilter<"ActorEvent"> | string
    processed?: BoolNullableWithAggregatesFilter<"ActorEvent"> | boolean | null
    processedAt?: DateTimeNullableWithAggregatesFilter<"ActorEvent"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"ActorEvent"> | Date | string
    data?: JsonWithAggregatesFilter<"ActorEvent">
    actorId?: IntWithAggregatesFilter<"ActorEvent"> | number
  }

  export type ActorCreateInput = {
    kind: string
    createdAt?: Date | string
    state?: NullableJsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    ActorEvent?: ActorEventCreateNestedManyWithoutActorInput
  }

  export type ActorUncheckedCreateInput = {
    id?: number
    kind: string
    createdAt?: Date | string
    state?: NullableJsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    ActorEvent?: ActorEventUncheckedCreateNestedManyWithoutActorInput
  }

  export type ActorUpdateInput = {
    kind?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    state?: NullableJsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    ActorEvent?: ActorEventUpdateManyWithoutActorNestedInput
  }

  export type ActorUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    kind?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    state?: NullableJsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
    ActorEvent?: ActorEventUncheckedUpdateManyWithoutActorNestedInput
  }

  export type ActorCreateManyInput = {
    id?: number
    kind: string
    createdAt?: Date | string
    state?: NullableJsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ActorUpdateManyMutationInput = {
    kind?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    state?: NullableJsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ActorUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    kind?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    state?: NullableJsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ActorEventCreateInput = {
    type: string
    processed?: boolean | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    data: JsonNullValueInput | InputJsonValue
    actor: ActorCreateNestedOneWithoutActorEventInput
  }

  export type ActorEventUncheckedCreateInput = {
    id?: number
    type: string
    processed?: boolean | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    data: JsonNullValueInput | InputJsonValue
    actorId: number
  }

  export type ActorEventUpdateInput = {
    type?: StringFieldUpdateOperationsInput | string
    processed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    data?: JsonNullValueInput | InputJsonValue
    actor?: ActorUpdateOneRequiredWithoutActorEventNestedInput
  }

  export type ActorEventUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: StringFieldUpdateOperationsInput | string
    processed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    data?: JsonNullValueInput | InputJsonValue
    actorId?: IntFieldUpdateOperationsInput | number
  }

  export type ActorEventCreateManyInput = {
    id?: number
    type: string
    processed?: boolean | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    data: JsonNullValueInput | InputJsonValue
    actorId: number
  }

  export type ActorEventUpdateManyMutationInput = {
    type?: StringFieldUpdateOperationsInput | string
    processed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    data?: JsonNullValueInput | InputJsonValue
  }

  export type ActorEventUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: StringFieldUpdateOperationsInput | string
    processed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    data?: JsonNullValueInput | InputJsonValue
    actorId?: IntFieldUpdateOperationsInput | number
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }
  export type JsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type ActorEventListRelationFilter = {
    every?: ActorEventWhereInput
    some?: ActorEventWhereInput
    none?: ActorEventWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ActorEventOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ActorCountOrderByAggregateInput = {
    id?: SortOrder
    kind?: SortOrder
    createdAt?: SortOrder
    state?: SortOrder
    snapshot?: SortOrder
  }

  export type ActorAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type ActorMaxOrderByAggregateInput = {
    id?: SortOrder
    kind?: SortOrder
    createdAt?: SortOrder
  }

  export type ActorMinOrderByAggregateInput = {
    id?: SortOrder
    kind?: SortOrder
    createdAt?: SortOrder
  }

  export type ActorSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type BoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }
  export type JsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type ActorRelationFilter = {
    is?: ActorWhereInput
    isNot?: ActorWhereInput
  }

  export type ActorEventCountOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    processed?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
    data?: SortOrder
    actorId?: SortOrder
  }

  export type ActorEventAvgOrderByAggregateInput = {
    id?: SortOrder
    actorId?: SortOrder
  }

  export type ActorEventMaxOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    processed?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
    actorId?: SortOrder
  }

  export type ActorEventMinOrderByAggregateInput = {
    id?: SortOrder
    type?: SortOrder
    processed?: SortOrder
    processedAt?: SortOrder
    createdAt?: SortOrder
    actorId?: SortOrder
  }

  export type ActorEventSumOrderByAggregateInput = {
    id?: SortOrder
    actorId?: SortOrder
  }

  export type BoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type ActorEventCreateNestedManyWithoutActorInput = {
    create?: XOR<ActorEventCreateWithoutActorInput, ActorEventUncheckedCreateWithoutActorInput> | ActorEventCreateWithoutActorInput[] | ActorEventUncheckedCreateWithoutActorInput[]
    connectOrCreate?: ActorEventCreateOrConnectWithoutActorInput | ActorEventCreateOrConnectWithoutActorInput[]
    createMany?: ActorEventCreateManyActorInputEnvelope
    connect?: ActorEventWhereUniqueInput | ActorEventWhereUniqueInput[]
  }

  export type ActorEventUncheckedCreateNestedManyWithoutActorInput = {
    create?: XOR<ActorEventCreateWithoutActorInput, ActorEventUncheckedCreateWithoutActorInput> | ActorEventCreateWithoutActorInput[] | ActorEventUncheckedCreateWithoutActorInput[]
    connectOrCreate?: ActorEventCreateOrConnectWithoutActorInput | ActorEventCreateOrConnectWithoutActorInput[]
    createMany?: ActorEventCreateManyActorInputEnvelope
    connect?: ActorEventWhereUniqueInput | ActorEventWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type ActorEventUpdateManyWithoutActorNestedInput = {
    create?: XOR<ActorEventCreateWithoutActorInput, ActorEventUncheckedCreateWithoutActorInput> | ActorEventCreateWithoutActorInput[] | ActorEventUncheckedCreateWithoutActorInput[]
    connectOrCreate?: ActorEventCreateOrConnectWithoutActorInput | ActorEventCreateOrConnectWithoutActorInput[]
    upsert?: ActorEventUpsertWithWhereUniqueWithoutActorInput | ActorEventUpsertWithWhereUniqueWithoutActorInput[]
    createMany?: ActorEventCreateManyActorInputEnvelope
    set?: ActorEventWhereUniqueInput | ActorEventWhereUniqueInput[]
    disconnect?: ActorEventWhereUniqueInput | ActorEventWhereUniqueInput[]
    delete?: ActorEventWhereUniqueInput | ActorEventWhereUniqueInput[]
    connect?: ActorEventWhereUniqueInput | ActorEventWhereUniqueInput[]
    update?: ActorEventUpdateWithWhereUniqueWithoutActorInput | ActorEventUpdateWithWhereUniqueWithoutActorInput[]
    updateMany?: ActorEventUpdateManyWithWhereWithoutActorInput | ActorEventUpdateManyWithWhereWithoutActorInput[]
    deleteMany?: ActorEventScalarWhereInput | ActorEventScalarWhereInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ActorEventUncheckedUpdateManyWithoutActorNestedInput = {
    create?: XOR<ActorEventCreateWithoutActorInput, ActorEventUncheckedCreateWithoutActorInput> | ActorEventCreateWithoutActorInput[] | ActorEventUncheckedCreateWithoutActorInput[]
    connectOrCreate?: ActorEventCreateOrConnectWithoutActorInput | ActorEventCreateOrConnectWithoutActorInput[]
    upsert?: ActorEventUpsertWithWhereUniqueWithoutActorInput | ActorEventUpsertWithWhereUniqueWithoutActorInput[]
    createMany?: ActorEventCreateManyActorInputEnvelope
    set?: ActorEventWhereUniqueInput | ActorEventWhereUniqueInput[]
    disconnect?: ActorEventWhereUniqueInput | ActorEventWhereUniqueInput[]
    delete?: ActorEventWhereUniqueInput | ActorEventWhereUniqueInput[]
    connect?: ActorEventWhereUniqueInput | ActorEventWhereUniqueInput[]
    update?: ActorEventUpdateWithWhereUniqueWithoutActorInput | ActorEventUpdateWithWhereUniqueWithoutActorInput[]
    updateMany?: ActorEventUpdateManyWithWhereWithoutActorInput | ActorEventUpdateManyWithWhereWithoutActorInput[]
    deleteMany?: ActorEventScalarWhereInput | ActorEventScalarWhereInput[]
  }

  export type ActorCreateNestedOneWithoutActorEventInput = {
    create?: XOR<ActorCreateWithoutActorEventInput, ActorUncheckedCreateWithoutActorEventInput>
    connectOrCreate?: ActorCreateOrConnectWithoutActorEventInput
    connect?: ActorWhereUniqueInput
  }

  export type NullableBoolFieldUpdateOperationsInput = {
    set?: boolean | null
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type ActorUpdateOneRequiredWithoutActorEventNestedInput = {
    create?: XOR<ActorCreateWithoutActorEventInput, ActorUncheckedCreateWithoutActorEventInput>
    connectOrCreate?: ActorCreateOrConnectWithoutActorEventInput
    upsert?: ActorUpsertWithoutActorEventInput
    connect?: ActorWhereUniqueInput
    update?: XOR<XOR<ActorUpdateToOneWithWhereWithoutActorEventInput, ActorUpdateWithoutActorEventInput>, ActorUncheckedUpdateWithoutActorEventInput>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedBoolNullableFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableFilter<$PrismaModel> | boolean | null
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedBoolNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel> | null
    not?: NestedBoolNullableWithAggregatesFilter<$PrismaModel> | boolean | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedBoolNullableFilter<$PrismaModel>
    _max?: NestedBoolNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> = 
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type ActorEventCreateWithoutActorInput = {
    type: string
    processed?: boolean | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    data: JsonNullValueInput | InputJsonValue
  }

  export type ActorEventUncheckedCreateWithoutActorInput = {
    id?: number
    type: string
    processed?: boolean | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    data: JsonNullValueInput | InputJsonValue
  }

  export type ActorEventCreateOrConnectWithoutActorInput = {
    where: ActorEventWhereUniqueInput
    create: XOR<ActorEventCreateWithoutActorInput, ActorEventUncheckedCreateWithoutActorInput>
  }

  export type ActorEventCreateManyActorInputEnvelope = {
    data: ActorEventCreateManyActorInput | ActorEventCreateManyActorInput[]
    skipDuplicates?: boolean
  }

  export type ActorEventUpsertWithWhereUniqueWithoutActorInput = {
    where: ActorEventWhereUniqueInput
    update: XOR<ActorEventUpdateWithoutActorInput, ActorEventUncheckedUpdateWithoutActorInput>
    create: XOR<ActorEventCreateWithoutActorInput, ActorEventUncheckedCreateWithoutActorInput>
  }

  export type ActorEventUpdateWithWhereUniqueWithoutActorInput = {
    where: ActorEventWhereUniqueInput
    data: XOR<ActorEventUpdateWithoutActorInput, ActorEventUncheckedUpdateWithoutActorInput>
  }

  export type ActorEventUpdateManyWithWhereWithoutActorInput = {
    where: ActorEventScalarWhereInput
    data: XOR<ActorEventUpdateManyMutationInput, ActorEventUncheckedUpdateManyWithoutActorInput>
  }

  export type ActorEventScalarWhereInput = {
    AND?: ActorEventScalarWhereInput | ActorEventScalarWhereInput[]
    OR?: ActorEventScalarWhereInput[]
    NOT?: ActorEventScalarWhereInput | ActorEventScalarWhereInput[]
    id?: IntFilter<"ActorEvent"> | number
    type?: StringFilter<"ActorEvent"> | string
    processed?: BoolNullableFilter<"ActorEvent"> | boolean | null
    processedAt?: DateTimeNullableFilter<"ActorEvent"> | Date | string | null
    createdAt?: DateTimeFilter<"ActorEvent"> | Date | string
    data?: JsonFilter<"ActorEvent">
    actorId?: IntFilter<"ActorEvent"> | number
  }

  export type ActorCreateWithoutActorEventInput = {
    kind: string
    createdAt?: Date | string
    state?: NullableJsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ActorUncheckedCreateWithoutActorEventInput = {
    id?: number
    kind: string
    createdAt?: Date | string
    state?: NullableJsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ActorCreateOrConnectWithoutActorEventInput = {
    where: ActorWhereUniqueInput
    create: XOR<ActorCreateWithoutActorEventInput, ActorUncheckedCreateWithoutActorEventInput>
  }

  export type ActorUpsertWithoutActorEventInput = {
    update: XOR<ActorUpdateWithoutActorEventInput, ActorUncheckedUpdateWithoutActorEventInput>
    create: XOR<ActorCreateWithoutActorEventInput, ActorUncheckedCreateWithoutActorEventInput>
    where?: ActorWhereInput
  }

  export type ActorUpdateToOneWithWhereWithoutActorEventInput = {
    where?: ActorWhereInput
    data: XOR<ActorUpdateWithoutActorEventInput, ActorUncheckedUpdateWithoutActorEventInput>
  }

  export type ActorUpdateWithoutActorEventInput = {
    kind?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    state?: NullableJsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ActorUncheckedUpdateWithoutActorEventInput = {
    id?: IntFieldUpdateOperationsInput | number
    kind?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    state?: NullableJsonNullValueInput | InputJsonValue
    snapshot?: NullableJsonNullValueInput | InputJsonValue
  }

  export type ActorEventCreateManyActorInput = {
    id?: number
    type: string
    processed?: boolean | null
    processedAt?: Date | string | null
    createdAt?: Date | string
    data: JsonNullValueInput | InputJsonValue
  }

  export type ActorEventUpdateWithoutActorInput = {
    type?: StringFieldUpdateOperationsInput | string
    processed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    data?: JsonNullValueInput | InputJsonValue
  }

  export type ActorEventUncheckedUpdateWithoutActorInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: StringFieldUpdateOperationsInput | string
    processed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    data?: JsonNullValueInput | InputJsonValue
  }

  export type ActorEventUncheckedUpdateManyWithoutActorInput = {
    id?: IntFieldUpdateOperationsInput | number
    type?: StringFieldUpdateOperationsInput | string
    processed?: NullableBoolFieldUpdateOperationsInput | boolean | null
    processedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    data?: JsonNullValueInput | InputJsonValue
  }



  /**
   * Aliases for legacy arg types
   */
    /**
     * @deprecated Use ActorCountOutputTypeDefaultArgs instead
     */
    export type ActorCountOutputTypeArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ActorCountOutputTypeDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ActorDefaultArgs instead
     */
    export type ActorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ActorDefaultArgs<ExtArgs>
    /**
     * @deprecated Use ActorEventDefaultArgs instead
     */
    export type ActorEventArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = ActorEventDefaultArgs<ExtArgs>

  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}