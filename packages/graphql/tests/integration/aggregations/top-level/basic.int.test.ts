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

import { TestHelper } from "../../utils/tests-helper";

describe("aggregations-top_level-basic", () => {
    let testHelper: TestHelper;

    beforeAll(() => {
        testHelper = new TestHelper();
    });

    afterAll(async () => {
        await testHelper.close();
    });

    test("should count nodes", async () => {
        const randomType = testHelper.createUniqueType("Movie");

        const typeDefs = `
            type ${randomType.name} {
                id: ID
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });

        await testHelper.runCypher(`
            CREATE (:${randomType.name} {id: randomUUID()})
            CREATE (:${randomType.name} {id: randomUUID()})
        `);

        const query = `
                {
                    ${randomType.operations.aggregate} {
                        count
                    }
                }
            `;

        const gqlResult = await testHelper.runGraphQL(query);

        expect(gqlResult.errors).toBeUndefined();

        expect((gqlResult.data as any)[randomType.operations.aggregate]).toEqual({
            count: 2,
        });
    });
});
