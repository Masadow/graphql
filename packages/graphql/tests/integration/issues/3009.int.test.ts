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

describe("https://github.com/neo4j/graphql/issues/3009", () => {
    let User: UniqueType;
    let testHelper: TestHelper;

    beforeEach(async () => {
        testHelper = new TestHelper();
        User = testHelper.createUniqueType("User");
    });

    afterEach(async () => {
        await testHelper.close();
    });

    test("custom resolvers should correctly format dates", async () => {
        const typeDefs = `
            type ${User} {
                joinedAt: Date!
            }
        `;

        const resolvers = { Query: { [User.plural]: () => [{ joinedAt: "2020-01-01" }] } };
        await testHelper.initNeo4jGraphQL({ typeDefs, resolvers });

        const query = `
            query {
                ${User.plural} {
                    joinedAt
                }
            }
        `;

        const result = await testHelper.runGraphQL(query);

        expect(result.errors).toBeFalsy();
        expect(result.data).toEqual({ [User.plural]: [{ joinedAt: "2020-01-01" }] });
    });

    test("custom resolvers should correctly format dateTimes", async () => {
        const typeDefs = `
            type ${User} {
                joinedAt: DateTime!
            }
        `;

        const resolvers = { Query: { [User.plural]: () => [{ joinedAt: new Date("2020-01-01").toISOString() }] } };
        await testHelper.initNeo4jGraphQL({ typeDefs, resolvers });

        const query = `
            query {
                ${User.plural} {
                    joinedAt
                }
            }
        `;

        const result = await testHelper.runGraphQL(query);

        expect(result.errors).toBeFalsy();
        expect(result.data).toEqual({ [User.plural]: [{ joinedAt: "2020-01-01T00:00:00.000Z" }] });
    });
});
