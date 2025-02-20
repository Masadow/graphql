/*
 * Copyright (c) "Neo4j"
 * Neo4j Sweden AB [http://neo4j.com]
 *
 * This file is part of Neo4j.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { Driver } from "neo4j-driver";
import { graphql } from "graphql";
import { generate } from "randomstring";
import Neo4jHelper from "../neo4j";
import { Neo4jGraphQL } from "../../../src/classes";
import { createBearerToken } from "../../utils/create-bearer-token";

describe("https://github.com/neo4j/graphql/issues/3746", () => {
    let driver: Driver;
    let neo4j: Neo4jHelper;
    const secret = "secret";

    beforeAll(async () => {
        neo4j = new Neo4jHelper();
        driver = await neo4j.getDriver();
    });

    afterAll(async () => {
        await driver.close();
    });

    test("should apply field-level authentication to root field on Query - pass", async () => {
        const typeDefs = /* GraphQL */ `
            type User {
                customId: ID
            }

            type Query {
                me: User @authentication(operations: ["READ"])
                you: User @authentication(operations: ["READ"])
            }
        `;

        const userId = generate({
            charset: "alphabetic",
        });

        const query = /* GraphQL */ `
            {
                me {
                    customId
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            resolvers: {
                Query: { me: () => ({}), you: () => ({}) },
                User: { customId: (_, __, ctx) => ctx.jwt.sub },
            },
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        const token = createBearerToken(secret, { sub: userId });

        const gqlResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues({ token }),
        });

        expect(gqlResult.errors).toBeUndefined();
        expect((gqlResult.data as any).me.customId).toEqual(userId);
    });

    test("should apply field-level authentication to root field on Query - throw unauthenticated", async () => {
        const typeDefs = /* GraphQL */ `
            type User {
                customId: ID
            }

            type Query {
                me: User @authentication(operations: ["READ"])
                you: User
            }
        `;

        const query = /* GraphQL */ `
            {
                me {
                    customId
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            resolvers: {
                Query: { me: () => ({}), you: () => ({}) },
                User: { customId: (_, __, ctx) => ctx.jwt.sub },
            },
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        const gqlResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues({}),
        });

        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors?.[0]?.message).toBe("Unauthenticated");
    });

    test("should apply type-level authentication to root field on Query - pass", async () => {
        const typeDefs = /* GraphQL */ `
            type User {
                customId: ID
            }

            type Query @authentication(operations: ["READ"]) {
                me: User
                you: User
            }
        `;

        const userId = generate({
            charset: "alphabetic",
        });

        const query = /* GraphQL */ `
            {
                me {
                    customId
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            resolvers: {
                Query: { me: () => ({}), you: () => ({}) },
                User: { customId: (_, __, ctx) => ctx.jwt.sub },
            },
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        const token = createBearerToken(secret, { sub: userId });

        const gqlResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues({ token }),
        });

        expect(gqlResult.errors).toBeUndefined();
        expect((gqlResult.data as any).me.customId).toEqual(userId);
    });

    test("should apply type-level authentication to root field on Query - throw unauthenticated", async () => {
        const typeDefs = /* GraphQL */ `
            type User {
                customId: ID
            }

            type Query @authentication(operations: ["READ"]) {
                me: User
                you: User
            }
        `;

        const query = /* GraphQL */ `
            {
                me {
                    customId
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            resolvers: {
                Query: { me: () => ({}), you: () => ({}) },
                User: { customId: (_, __, ctx) => ctx.jwt.sub },
            },
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        const gqlResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues({}),
        });

        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors?.[0]?.message).toBe("Unauthenticated");
    });

    test("should apply field-level authentication to root field on Mutation - throw unauthenticated", async () => {
        const typeDefs = /* GraphQL */ `
            type User {
                customId: ID
            }

            type Query {
                me: User @authentication(operations: ["READ"])
                you: User
            }

            type Mutation {
                updateMe(id: ID): User @authentication(operations: ["CREATE"])
            }
        `;

        const query = /* GraphQL */ `
            mutation {
                updateMe(id: 3) {
                    customId
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            resolvers: {
                Query: { me: () => ({}), you: () => ({}) },
                Mutation: { updateMe: () => ({}) },
                User: { customId: (_, __, ctx) => ctx.jwt.sub },
            },
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        const gqlResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues({}),
        });

        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors?.[0]?.message).toBe("Unauthenticated");
    });

    test("should apply type-level authentication to root field on Mutation - throw unauthenticated", async () => {
        const typeDefs = /* GraphQL */ `
            type User {
                customId: ID
            }

            type Query {
                me: User @authentication(operations: ["READ"])
                you: User
            }

            type Mutation @authentication(operations: ["CREATE"]) {
                updateMe(id: ID): User
            }
        `;

        const query = /* GraphQL */ `
            mutation {
                updateMe(id: 3) {
                    customId
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            resolvers: {
                Query: { me: () => ({}), you: () => ({}) },
                Mutation: { updateMe: () => ({}) },
                User: { customId: (_, __, ctx) => ctx.jwt.sub },
            },
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        const gqlResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues({}),
        });

        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors?.[0]?.message).toBe("Unauthenticated");
    });

    test("should apply schema-level defined authentication to root field on Query - throw unauthenticated", async () => {
        const typeDefs = /* GraphQL */ `
            type User {
                customId: ID
            }

            type Query {
                me: User
                you: User
            }

            extend schema @authentication(operations: ["READ"])
        `;

        const query = /* GraphQL */ `
            {
                me {
                    customId
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            resolvers: {
                Query: { me: () => ({}), you: () => ({}) },
                User: { customId: (_, __, ctx) => ctx.jwt.sub },
            },
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        const gqlResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues({}),
        });

        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors?.[0]?.message).toBe("Unauthenticated");
    });

    test("should apply schema-level defined authentication to root field on Query - pass", async () => {
        const typeDefs = /* GraphQL */ `
            type User {
                customId: ID
            }

            type Query {
                me: User
                you: User
            }

            extend schema @authentication(operations: ["READ"])
        `;

        const userId = generate({
            charset: "alphabetic",
        });

        const query = /* GraphQL */ `
            {
                me {
                    customId
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            resolvers: {
                Query: { me: () => ({}), you: () => ({}) },
                User: { customId: (_, __, ctx) => ctx.jwt.sub },
            },
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        const token = createBearerToken(secret, { sub: userId });
        const gqlResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues({ token }),
        });

        expect(gqlResult.errors).toBeUndefined();
        expect((gqlResult.data as any).me.customId).toEqual(userId);
    });

    test("should apply schema-level defined authentication to root field on Mutation - throw unauthenticated", async () => {
        const typeDefs = /* GraphQL */ `
            type User {
                customId: ID
            }

            type Query {
                me: User
                you: User
            }

            type Mutation {
                updateMe(id: ID): User
            }

            extend schema @authentication(operations: ["UPDATE"])
        `;

        const query = /* GraphQL */ `
            mutation {
                updateMe(id: 3) {
                    customId
                }
            }
        `;

        const neoSchema = new Neo4jGraphQL({
            typeDefs,
            resolvers: {
                Query: { me: () => ({}), you: () => ({}) },
                User: { customId: (_, __, ctx) => ctx.jwt.sub },
                Mutation: { updateMe: () => ({}) },
            },
            features: {
                authorization: {
                    key: secret,
                },
            },
        });

        const gqlResult = await graphql({
            schema: await neoSchema.getSchema(),
            source: query,
            contextValue: neo4j.getContextValues({}),
        });

        expect(gqlResult.errors).toHaveLength(1);
        expect(gqlResult.errors?.[0]?.message).toBe("Unauthenticated");
    });
});
