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

import { Neo4jGraphQL } from "../../../src";
import { formatCypher, formatParams, translateQuery } from "../utils/tck-test-utils";

describe("https://github.com/neo4j/graphql/issues/5887", () => {
    let typeDefs: string;
    let neoSchema: Neo4jGraphQL;

    beforeAll(() => {
        typeDefs = /* GraphQL */ `
            type House {
                address: String!
                animals: [Animal!]! @relationship(type: "LIVES_IN", direction: IN)
            }

            interface Animal {
                name: String!
            }

            type Dog implements Animal {
                name: String!
            }

            type Cat implements Animal {
                name: String!
            }
        `;

        neoSchema = new Neo4jGraphQL({
            typeDefs,
            features: {
                authorization: { key: "secret" },
            },
        });
    });

    test("should return relationship when first interface match", async () => {
        const query = /* GraphQL */ `
            query {
                houses(where: { animals: { name: "Roxy" } }) {
                    address
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:House)
            WHERE (EXISTS {
                MATCH (this)<-[:LIVES_IN]-(this0:Dog)
                WHERE this0.name = $param0
            } OR EXISTS {
                MATCH (this)<-[:LIVES_IN]-(this1:Cat)
                WHERE this1.name = $param1
            })
            RETURN this { .address } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"Roxy\\",
                \\"param1\\": \\"Roxy\\"
            }"
        `);
    });

    test("should return relationship when second interface match", async () => {
        const query = /* GraphQL */ `
            query {
                houses(where: { animals: { name: "Nala" } }) {
                    address
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:House)
            WHERE (EXISTS {
                MATCH (this)<-[:LIVES_IN]-(this0:Dog)
                WHERE this0.name = $param0
            } OR EXISTS {
                MATCH (this)<-[:LIVES_IN]-(this1:Cat)
                WHERE this1.name = $param1
            })
            RETURN this { .address } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"Nala\\",
                \\"param1\\": \\"Nala\\"
            }"
        `);
    });

    test("should not return relationship when no interface match", async () => {
        const query = /* GraphQL */ `
            query {
                houses(where: { animals: { name: "Other" } }) {
                    address
                }
            }
        `;

        const result = await translateQuery(neoSchema, query);

        expect(formatCypher(result.cypher)).toMatchInlineSnapshot(`
            "MATCH (this:House)
            WHERE (EXISTS {
                MATCH (this)<-[:LIVES_IN]-(this0:Dog)
                WHERE this0.name = $param0
            } OR EXISTS {
                MATCH (this)<-[:LIVES_IN]-(this1:Cat)
                WHERE this1.name = $param1
            })
            RETURN this { .address } AS this"
        `);

        expect(formatParams(result.params)).toMatchInlineSnapshot(`
            "{
                \\"param0\\": \\"Other\\",
                \\"param1\\": \\"Other\\"
            }"
        `);
    });
});
