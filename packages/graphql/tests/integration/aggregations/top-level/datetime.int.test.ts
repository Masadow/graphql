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

import { generate } from "randomstring";
import type { UniqueType } from "../../../utils/graphql-types";
import { TestHelper } from "../../utils/tests-helper";

describe("aggregations-top_level-datetime", () => {
    let testHelper: TestHelper;
    let typeDefs: string;
    let Movie: UniqueType;

    beforeEach(async () => {
        testHelper = new TestHelper();
        Movie = testHelper.createUniqueType("Movie");
        typeDefs = `
            type ${Movie} {
                testString: String
                createdAt: DateTime
            }
        `;

        await testHelper.initNeo4jGraphQL({ typeDefs });
    });

    afterEach(async () => {
        await testHelper.close();
    });

    test("should return the min of node properties", async () => {
        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const minDate = new Date();

        await testHelper.runCypher(
            `
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime("${minDate.toISOString()}")})
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime()})
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime()})
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime()})
                `,
            {
                testString,
            }
        );

        const query = `
                {
                    ${Movie.operations.aggregate}(where: {testString: "${testString}"}) {
                        createdAt {
                            min
                        }
                    }
                }
            `;

        const gqlResult = await testHelper.runGraphQL(query);

        expect(gqlResult.errors).toBeUndefined();

        expect((gqlResult.data as any)[Movie.operations.aggregate]).toEqual({
            createdAt: {
                min: minDate.toISOString(),
            },
        });
    });

    test("should return the max of node properties", async () => {
        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const minDate = new Date();

        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 1);

        await testHelper.runCypher(
            `
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime("${minDate.toISOString()}")})
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime()})
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime()})
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime("${maxDate.toISOString()}")})
                `,
            {
                testString,
            }
        );

        const query = `
                {
                    ${Movie.operations.aggregate}(where: {testString: "${testString}"}) {
                        createdAt {
                            max
                        }
                    }
                }
            `;

        const gqlResult = await testHelper.runGraphQL(query);

        expect(gqlResult.errors).toBeUndefined();

        expect((gqlResult.data as any)[Movie.operations.aggregate]).toEqual({
            createdAt: {
                max: maxDate.toISOString(),
            },
        });
    });

    test("should return the min and max of node properties", async () => {
        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const minDate = new Date();

        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 1);

        await testHelper.runCypher(
            `
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime("${minDate.toISOString()}")})
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime()})
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime()})
                    CREATE (:${Movie} {testString: $testString, createdAt: datetime("${maxDate.toISOString()}")})
                `,
            {
                testString,
            }
        );

        const query = `
                {
                    ${Movie.operations.aggregate}(where: {testString: "${testString}"}) {
                        createdAt {
                            min
                            max
                        }
                    }
                }
            `;

        const gqlResult = await testHelper.runGraphQL(query);

        expect(gqlResult.errors).toBeUndefined();

        expect((gqlResult.data as any)[Movie.operations.aggregate]).toEqual({
            createdAt: {
                min: minDate.toISOString(),
                max: maxDate.toISOString(),
            },
        });
    });
});
