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

import { Driver } from "neo4j-driver";
import { graphql } from "graphql";
import { gql } from "apollo-server";
import { generate } from "randomstring";
import neo4j from "../neo4j";
import { Neo4jGraphQL } from "../../../src/classes";
import { generateUniqueType } from "../../utils/graphql-types";

describe("integration/rfc/autogenerate-properties", () => {
    let driver: Driver;

    beforeAll(async () => {
        driver = await neo4j();
    });

    afterAll(async () => {
        await driver.close();
    });

    describe("Callback - String", () => {
        test("should insert callback on CREATE", async () => {
            const testMovie = generateUniqueType("Movie");
            const string1 = generate({
                charset: "alphabetic",
            });

            const callback = () => Promise.resolve(string1);

            const typeDefs = gql`
                type ${testMovie.name} {
                    id: ID
                    callback: String! @callback(operations: [CREATE], name: "callback")
                }
            `;

            const neoSchema = new Neo4jGraphQL({
                typeDefs,
                config: {
                    callbacks: {
                        callback,
                    },
                },
            });

            const movieId = generate({
                charset: "alphabetic",
            });

            const mutation = `
                mutation {
                    ${testMovie.operations.create}(input: [{ id: "${movieId}" }]) {
                        ${testMovie.plural} {
                            id
                            callback
                        }
                    }
                }
            `;

            const result = await graphql({
                schema: await neoSchema.getSchema(),
                source: mutation,
                contextValue: { driver },
            });

            expect(result.errors).toBeUndefined();
            expect(result.data as any).toMatchObject({
                [testMovie.plural]: [
                    {
                        id: movieId,
                        callback: string1,
                    },
                ],
            });
        });

        test("should insert callback on UPDATE", async () => {
            const testMovie = generateUniqueType("Movie");
            const string1 = generate({
                charset: "alphabetic",
            });

            const callback = () => Promise.resolve(string1);

            const typeDefs = gql`
                type ${testMovie.name} {
                    id: ID
                    callback: String! @callback(operations: [UPDATE], name: "callback")
                }
            `;

            const neoSchema = new Neo4jGraphQL({
                typeDefs,
                config: {
                    callbacks: {
                        callback,
                    },
                },
            });

            const movieId = generate({
                charset: "alphabetic",
            });

            const mutation = `
                mutation {
                    ${testMovie.operations.update}(where: { id: "${movieId}" }, update: { id: "${movieId}" }) {
                        ${testMovie.plural} {
                            id
                            callback
                        }
                    }
                }
            `;

            const session = driver.session();

            try {
                await session.run(`
                    CREATE (:${testMovie.name} { id: "${movieId}" })
                `);
            } finally {
                await session.close();
            }

            const result = await graphql({
                schema: await neoSchema.getSchema(),
                source: mutation,
                contextValue: { driver },
            });

            expect(result.errors).toBeUndefined();
            expect(result.data as any).toMatchObject({
                [testMovie.plural]: [
                    {
                        id: movieId,
                        callback: string1,
                    },
                ],
            });
        });

        test("should insert callback on CREATE and UPDATE", async () => {
            const testMovie = generateUniqueType("Movie");
            const string1 = generate({
                charset: "alphabetic",
            });
            const string2 = generate({
                charset: "alphabetic",
            });

            let counter = 0;
            const callback = () => {
                counter += 1;

                if (counter === 1) {
                    return Promise.resolve(string1);
                }

                return Promise.resolve(string2);
            };

            const typeDefs = gql`
                type ${testMovie.name} {
                    id: ID
                    callback: String! @callback(operations: [CREATE, UPDATE], name: "callback")
                }
            `;

            const neoSchema = new Neo4jGraphQL({
                typeDefs,
                config: {
                    callbacks: {
                        callback,
                    },
                },
            });

            const movieId = generate({
                charset: "alphabetic",
            });

            const mutation = `
                mutation {
                    ${testMovie.operations.create}(input: [{ id: "${movieId}" }]) {
                        ${testMovie.plural} {
                            id
                            callback
                        }
                    }
                    ${testMovie.operations.update}(where: { id: "${movieId}" }, update: { id: "${movieId}" }) {
                        ${testMovie.plural} {
                            id
                            callback
                        }
                    }
                }
            `;

            const result = await graphql({
                schema: await neoSchema.getSchema(),
                source: mutation,
                contextValue: { driver },
            });

            expect(result.errors).toBeUndefined();
            expect(result.data as any).toMatchObject({
                [testMovie.plural]: [
                    {
                        id: movieId,
                        callback: string1,
                    },
                ],
                [testMovie.plural]: [
                    {
                        id: movieId,
                        callback: string2,
                    },
                ],
            });
        });
    });

    describe("Callback - Int", () => {
        test("should insert callback on CREATE", async () => {
            const testMovie = generateUniqueType("Movie");
            const int1 = generate({
                charset: "numberic",
            });

            const callback = () => Promise.resolve(int1);

            const typeDefs = gql`
                type ${testMovie.name} {
                    id: ID
                    callback: Int! @callback(operations: [CREATE], name: "callback")
                }
            `;

            const neoSchema = new Neo4jGraphQL({
                typeDefs,
                config: {
                    callbacks: {
                        callback,
                    },
                },
            });

            const movieId = generate({
                charset: "alphabetic",
            });

            const mutation = `
                mutation {
                    ${testMovie.operations.create}(input: [{ id: "${movieId}" }]) {
                        ${testMovie.plural} {
                            id
                            callback
                        }
                    }
                }
            `;

            const result = await graphql({
                schema: await neoSchema.getSchema(),
                source: mutation,
                contextValue: { driver },
            });

            expect(result.errors).toBeUndefined();
            expect(result.data as any).toMatchObject({
                [testMovie.plural]: [
                    {
                        id: movieId,
                        callback: int1,
                    },
                ],
            });
        });

        test("should insert callback on UPDATE", async () => {
            const testMovie = generateUniqueType("Movie");
            const int1 = generate({
                charset: "numeric",
            });

            const callback = () => Promise.resolve(int1);

            const typeDefs = gql`
                type ${testMovie.name} {
                    id: ID
                    callback: Int! @callback(operations: [UPDATE], name: "callback")
                }
            `;

            const neoSchema = new Neo4jGraphQL({
                typeDefs,
                config: {
                    callbacks: {
                        callback,
                    },
                },
            });

            const movieId = generate({
                charset: "alphabetic",
            });

            const mutation = `
                mutation {
                    ${testMovie.operations.update}(where: { id: "${movieId}" }, update: { id: "${movieId}" }) {
                        ${testMovie.plural} {
                            id
                            callback
                        }
                    }
                }
            `;

            const session = driver.session();

            try {
                await session.run(`
                    CREATE (:${testMovie.name} { id: "${movieId}" })
                `);
            } finally {
                await session.close();
            }

            const result = await graphql({
                schema: await neoSchema.getSchema(),
                source: mutation,
                contextValue: { driver },
            });

            expect(result.errors).toBeUndefined();
            expect(result.data as any).toMatchObject({
                [testMovie.plural]: [
                    {
                        id: movieId,
                        callback: int1,
                    },
                ],
            });
        });

        test("should insert callback on CREATE and UPDATE", async () => {
            const testMovie = generateUniqueType("Movie");
            const int1 = generate({
                charset: "numeric",
            });
            const int2 = generate({
                charset: "numeric",
            });

            let counter = 0;
            const callback = () => {
                counter += 1;

                if (counter === 1) {
                    return Promise.resolve(int1);
                }

                return Promise.resolve(int2);
            };

            const typeDefs = gql`
                type ${testMovie.name} {
                    id: ID
                    callback: Int! @callback(operations: [CREATE, UPDATE], name: "callback")
                }
            `;

            const neoSchema = new Neo4jGraphQL({
                typeDefs,
                config: {
                    callbacks: {
                        callback,
                    },
                },
            });

            const movieId = generate({
                charset: "alphabetic",
            });

            const mutation = `
                mutation {
                    ${testMovie.operations.create}(input: [{ id: "${movieId}" }]) {
                        ${testMovie.plural} {
                            id
                            callback
                        }
                    }
                    ${testMovie.operations.update}(where: { id: "${movieId}" }, update: { id: "${movieId}" }) {
                        ${testMovie.plural} {
                            id
                            callback
                        }
                    }
                }
            `;

            const result = await graphql({
                schema: await neoSchema.getSchema(),
                source: mutation,
                contextValue: { driver },
            });

            expect(result.errors).toBeUndefined();
            expect(result.data as any).toMatchObject({
                [testMovie.plural]: [
                    {
                        id: movieId,
                        callback: int1,
                    },
                ],
                [testMovie.plural]: [
                    {
                        id: movieId,
                        callback: int2,
                    },
                ],
            });
        });
    });
});
