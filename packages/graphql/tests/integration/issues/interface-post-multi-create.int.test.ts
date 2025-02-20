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

import type { UniqueType } from "../../utils/graphql-types";
import { TestHelper } from "../utils/tests-helper";

describe("Projecting interface relationships following create of multiple nodes", () => {
    let testHelper: TestHelper;

    let Person: UniqueType;
    let Place: UniqueType;
    let Interaction: UniqueType;

    beforeEach(async () => {
        testHelper = new TestHelper();

        Person = testHelper.createUniqueType("Person");
        Place = testHelper.createUniqueType("Place");
        Interaction = testHelper.createUniqueType("Interaction");

        const typeDefs = `
            interface Entity {
                id: String!
            }

            type ${Person} implements Entity {
                id: String! @unique
                name: String!
            }

            type ${Place} implements Entity {
                id: String! @unique
                name: String!
            }

            type ${Interaction} {
                id: ID! @id @unique
                kind: String!
                subjects: [Entity!]! @relationship(type: "ACTED_IN", direction: IN)
                objects: [Entity!]! @relationship(type: "ACTED_IN", direction: OUT)
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });

        await testHelper.runCypher(`
            CREATE (:${Person.name} { id: "adam", name: "Adam" })
            CREATE (:${Person.name} { id: "eve", name: "Eve" })
            CREATE (:${Person.name} { id: "cain", name: "Cain" })
            CREATE (:${Person.name} { id: "abel", name: "Abel" })
        `);
    });

    afterEach(async () => {
        await testHelper.close();
    });

    test("should not throw error", async () => {
        const mutation = `
            mutation {
                ${Interaction.operations.create}(
                    input: [
                        {
                            subjects: { connect: { where: { node: { id_IN: ["adam", "eve"] } } } }
                            kind: "PARENT_OF"
                            objects: { connect: { where: { node: { id_IN: ["cain"] } } } }
                        }
                        {
                            subjects: { connect: { where: { node: { id_IN: ["adam", "eve"] } } } }
                            kind: "PARENT_OF"
                            objects: { connect: { where: { node: { id_IN: ["abel"] } } } }
                        }
                    ]
                ) {
                    info {
                        nodesCreated
                    }
                    ${Interaction.plural} {
                        id
                        subjects {
                            id
                        }
                        objects {
                            id
                        }
                    }
                }
            }
        `;

        const mutationResult = await testHelper.runGraphQL(mutation);
        expect(mutationResult.errors).toBeUndefined();
    });
});
