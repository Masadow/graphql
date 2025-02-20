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

import type { Neo4jGraphQL } from "../../../src/classes";
import type { UniqueType } from "../../utils/graphql-types";
import { TestHelper } from "../utils/tests-helper";

describe("https://github.com/neo4j/graphql/issues/2669", () => {
    let testHelper: TestHelper;

    let typeMovie: UniqueType;
    let typeActor: UniqueType;

    let neoSchema: Neo4jGraphQL;

    beforeAll(async () => {
        testHelper = new TestHelper();

        typeMovie = testHelper.createUniqueType("Movie");
        typeActor = testHelper.createUniqueType("Actor");

        const typeDefs = `
        type ${typeMovie.name} {
            title: String
            actors: [${typeActor.name}!]! @relationship(type: "ACTED_IN", direction: IN, properties: "ActedIn")
        }

        type ${typeActor.name} {
            myName: String @alias(property: "name")
            age: Int
            movies: [${typeMovie.name}!]! @relationship(type: "ACTED_IN", direction: OUT, properties: "ActedIn")
        }

        type ActedIn @relationshipProperties {
            time: Int @alias(property: "screentime")
        }
        `;

        neoSchema = await testHelper.initNeo4jGraphQL({ typeDefs });

        await testHelper.runCypher(`CREATE (m:${typeMovie.name} { title: "Terminator"})<-[:ACTED_IN { screentime: 60, character: "Terminator" }]-(:${typeActor.name} { name: "Arnold", age: 54, born: datetime('1980-07-02')})
        CREATE (m)<-[:ACTED_IN { screentime: 120, character: "Sarah" }]-(:${typeActor.name} {name: "Linda", age:37, born: datetime('2000-02-02')})`);
    });

    afterAll(async () => {
        await testHelper.close();
    });

    test("Field Node Aggregation alias", async () => {
        const query = `
            query {
                ${typeMovie.plural} {
                    actorsAggregate {
                        node {
                            myName {
                                shortest
                            }
                        }
                    }
                }
            }
        `;

        const gqlResult = await testHelper.runGraphQL(query);

        expect(gqlResult.errors).toBeUndefined();
        expect((gqlResult as any).data[typeMovie.plural][0].actorsAggregate).toEqual({
            node: {
                myName: {
                    shortest: "Linda",
                },
            },
        });
    });

    test("Field Edge Aggregation alias", async () => {
        const query = `
            query {
                ${typeMovie.plural} {
                    actorsAggregate {
                        edge {
                            time {
                                max
                            }
                        }
                    }
                }
            }
        `;

        const gqlResult = await testHelper.runGraphQL(query);

        expect(gqlResult.errors).toBeUndefined();
        expect((gqlResult as any).data[typeMovie.plural][0].actorsAggregate).toEqual({
            edge: {
                time: {
                    max: 120,
                },
            },
        });
    });
});
