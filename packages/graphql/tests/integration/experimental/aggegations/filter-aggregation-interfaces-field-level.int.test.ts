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

import type { GraphQLSchema } from "graphql";
import { graphql } from "graphql";
import type { Driver } from "neo4j-driver";
import { Neo4jGraphQL } from "../../../../src";
import { cleanNodesUsingSession } from "../../../utils/clean-nodes";
import { createBearerToken } from "../../../utils/create-bearer-token";
import { UniqueType } from "../../../utils/graphql-types";
import Neo4jHelper from "../../neo4j";

describe("Field-level filter interface query fields", () => {
    const secret = "the-secret";

    let schema: GraphQLSchema;
    let neo4j: Neo4jHelper;
    let driver: Driver;
    let typeDefs: string;

    const Production = new UniqueType("Production");
    const Movie = new UniqueType("Movie");
    const Actor = new UniqueType("Actor");
    const Series = new UniqueType("Series");

    async function graphqlQuery(query: string, token: string) {
        return graphql({
            schema,
            source: query,
            contextValue: neo4j.getContextValues({ token }),
        });
    }

    beforeAll(async () => {
        neo4j = new Neo4jHelper();
        driver = await neo4j.getDriver();

        typeDefs = /* GraphQL */ `
            interface ${Production} {
                title: String!
                cost: Float!
            }

            type ${Movie} implements ${Production} {
                title: String!
                cost: Float!
                runtime: Int!
                ${Actor.plural}: [${Actor}!]! @relationship(type: "ACTED_IN", direction: IN, properties: "ActedIn")
            }

            type ${Series} implements ${Production} {
                title: String!
                cost: Float!
                episodes: Int!
            }

            type ActedIn @relationshipProperties {
                screenTime: Int!
            }

            type ${Actor} {
                name: String!
                actedIn: [${Production}!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
            }
        `;

        const session = await neo4j.getSession();

        try {
            await session.run(`
            // Create Movies
            CREATE (m1:${Movie} { title: "The Movie One", cost: 10000000, runtime: 120 })
            CREATE (m2:${Movie} { title: "The Movie Two", cost: 20000000, runtime: 90 })
            CREATE (m3:${Movie} { title: "The Movie Three", cost: 12000000, runtime: 70 })
            
            // Create Series
            CREATE (s1:${Series} { title: "The Series One", cost: 10000000, episodes: 10 })
            CREATE (s2:${Series} { title: "The Series Two", cost: 20000000, episodes: 20 })
            CREATE (s3:${Series} { title: "The Series Three", cost: 20000000, episodes: 15 })
            
            // Create Actors
            CREATE (a1:${Actor} { name: "Actor One" })
            CREATE (a2:${Actor} { name: "Actor Two" })
            
            // Associate Actor 1 with Movies and Series
            CREATE (a1)-[:ACTED_IN { screenTime: 100 }]->(m1)
            CREATE (a1)-[:ACTED_IN { screenTime: 82 }]->(s1)
            CREATE (a1)-[:ACTED_IN { screenTime: 20 }]->(m3)
            CREATE (a1)-[:ACTED_IN { screenTime: 22 }]->(s3)
            
            // Associate Actor 2 with Movies and Series
            CREATE (a2)-[:ACTED_IN { screenTime: 240 }]->(m2)
            CREATE (a2)-[:ACTED_IN { screenTime: 728 }]->(s2)
            CREATE (a2)-[:ACTED_IN { screenTime: 728 }]->(m3)
            CREATE (a2)-[:ACTED_IN { screenTime: 88 }]->(s3)
        `);
        } finally {
            await session.close();
        }

        const neoGraphql = new Neo4jGraphQL({
            typeDefs,
            driver,
        });
        schema = await neoGraphql.getSchema();
    });

    afterAll(async () => {
        const session = await neo4j.getSession();
        await cleanNodesUsingSession(session, [Movie, Series]);
        await session.close();
        await driver.close();
    });

    test("complex query on nested aggregation", async () => {
        const query = /* GraphQL */ `
            query {
                ${Actor.plural} {
                    actedInAggregate(where: { title_STARTS_WITH: "The" }) {
                        edge {
                            screenTime {
                                min
                                max
                            }
                        }
                        node {
                            title {
                                longest
                                shortest
                            }
                        }
                    }
                    name,
                }
            }
        `;

        const token = createBearerToken(secret, {});
        const queryResult = await graphqlQuery(query, token);
        expect(queryResult.errors).toBeUndefined();
        expect((queryResult as any).data[Actor.plural]).toIncludeSameMembers([
            {
                actedInAggregate: {
                    edge: {
                        screenTime: {
                            max: 100,
                            min: 20,
                        },
                    },
                    node: {
                        title: {
                            longest: "The Series Three",
                            shortest: "The Movie One",
                        },
                    },
                },
                name: "Actor One",
            },
            {
                actedInAggregate: {
                    edge: {
                        screenTime: {
                            max: 728,
                            min: 88,
                        },
                    },
                    node: {
                        title: {
                            longest: "The Series Three",
                            shortest: "The Movie Two",
                        },
                    },
                },
                name: "Actor Two",
            },
        ]);
    });

    test("complex query on nested aggregation with logical operator", async () => {
        const query = /* GraphQL */ `
            query {
                ${Actor.plural} {
                    actedInAggregate(where: { AND: [{title_STARTS_WITH: "The"}, {NOT: {title_CONTAINS: "Series"}}] }) {
                        edge {
                            screenTime {
                                min
                                max
                            }
                        }
                        node {
                            title {
                                longest
                                shortest
                            }
                        }
                    }
                    name,
                }
            }
        `;

        const token = createBearerToken(secret, {});
        const queryResult = await graphqlQuery(query, token);
        expect(queryResult.errors).toBeUndefined();
        expect((queryResult as any).data[Actor.plural]).toIncludeSameMembers([
            {
                actedInAggregate: {
                    edge: {
                        screenTime: {
                            max: 100,
                            min: 20,
                        },
                    },
                    node: {
                        title: {
                            longest: "The Movie Three",
                            shortest: "The Movie One",
                        },
                    },
                },
                name: "Actor One",
            },
            {
                actedInAggregate: {
                    edge: {
                        screenTime: {
                            max: 728,
                            min: 240,
                        },
                    },
                    node: {
                        title: {
                            longest: "The Movie Three",
                            shortest: "The Movie Two",
                        },
                    },
                },
                name: "Actor Two",
            },
        ]);
    });
});
