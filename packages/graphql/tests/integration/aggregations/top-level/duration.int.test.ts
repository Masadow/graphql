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

import neo4jDriver from "neo4j-driver";
import { generate } from "randomstring";
import type { UniqueType } from "../../../utils/graphql-types";
import { TestHelper } from "../../utils/tests-helper";

describe("aggregations-top_level-duration", () => {
    let testHelper: TestHelper;
    let Movie: UniqueType;
    let typeDefs: string;

    beforeEach(async () => {
        testHelper = new TestHelper();

        Movie = testHelper.createUniqueType("Movie");
        typeDefs = `
            type ${Movie} {
                testString: String
                runningTime: Duration
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

        const months = 1;
        const days = 1;
        const minDuration = new neo4jDriver.types.Duration(months, days, 0, 0);
        const maxDuration = new neo4jDriver.types.Duration(months + 1, days, 0, 0);

        await testHelper.runCypher(
            `
                    CREATE (:${Movie} {testString: $testString, runningTime: $minDuration})
                    CREATE (:${Movie} {testString: $testString, runningTime: $maxDuration})
                `,
            {
                testString,
                minDuration,
                maxDuration,
            }
        );

        const query = `
                {
                    ${Movie.operations.aggregate}(where: {testString: "${testString}"}) {
                        runningTime {
                            min
                        }
                    }
                }
            `;

        const gqlResult = await testHelper.runGraphQL(query);

        expect(gqlResult.errors).toBeUndefined();

        expect((gqlResult.data as any)[Movie.operations.aggregate]).toEqual({
            runningTime: {
                min: minDuration.toString(),
            },
        });
    });

    test("should return the max of node properties", async () => {
        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const months = 1;
        const days = 1;
        const minDuration = new neo4jDriver.types.Duration(months, days, 0, 0);
        const maxDuration = new neo4jDriver.types.Duration(months + 1, days, 0, 0);

        await testHelper.runCypher(
            `
                    CREATE (:${Movie} {testString: $testString, runningTime: $minDuration})
                    CREATE (:${Movie} {testString: $testString, runningTime: $maxDuration})
                `,
            {
                testString,
                minDuration,
                maxDuration,
            }
        );

        const query = `
                {
                    ${Movie.operations.aggregate}(where: {testString: "${testString}"}) {
                        runningTime {
                            max
                        }
                    }
                }
            `;

        const gqlResult = await testHelper.runGraphQL(query);

        expect(gqlResult.errors).toBeUndefined();

        expect((gqlResult.data as any)[Movie.operations.aggregate]).toEqual({
            runningTime: {
                max: maxDuration.toString(),
            },
        });
    });

    test("should return the min and max of node properties", async () => {
        const testString = generate({
            charset: "alphabetic",
            readable: true,
        });

        const months = 1;
        const days = 1;
        const minDuration = new neo4jDriver.types.Duration(months, days, 0, 0);
        const maxDuration = new neo4jDriver.types.Duration(months + 1, days, 0, 0);

        await testHelper.runCypher(
            `
                    CREATE (:${Movie} {testString: $testString, runningTime: $minDuration})
                    CREATE (:${Movie} {testString: $testString, runningTime: $maxDuration})
                `,
            {
                testString,
                minDuration,
                maxDuration,
            }
        );

        const query = `
                {
                    ${Movie.operations.aggregate}(where: {testString: "${testString}"}) {
                        runningTime {
                            min
                            max
                        }
                    }
                }
            `;

        const gqlResult = await testHelper.runGraphQL(query);

        expect(gqlResult.errors).toBeUndefined();

        expect((gqlResult.data as any)[Movie.operations.aggregate]).toEqual({
            runningTime: {
                min: minDuration.toString(),
                max: maxDuration.toString(),
            },
        });
    });
});
