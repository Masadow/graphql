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

describe("https://github.com/neo4j/graphql/issues/2652", () => {
    let testHelper: TestHelper;

    let locationType: UniqueType;
    let reviewType: UniqueType;

    beforeEach(async () => {
        testHelper = new TestHelper();

        locationType = testHelper.createUniqueType("Location");
        reviewType = testHelper.createUniqueType("Review");

        const typeDefs = `
            type Location {
                id: ID!
                reviews: [LocationReview!]! @relationship(type: "HAS_REVIEW", direction: OUT)
            }

            type LocationReview {
                id: ID!
                rating: Int!
            }
        `;

        await testHelper.initNeo4jGraphQL({
            typeDefs,
        });
    });

    afterEach(async () => {
        await testHelper.close();
    });

    test("Does not throw error when count and node aggregations in selection set", async () => {
        const query = `
            query ReviewsAggregate {
                locations {
                    reviewsAggregate {
                        count
                        node {
                            rating {
                                average
                            }
                        }
                    }
                }
            }
        `;

        const result = await testHelper.runGraphQL(query);

        expect(result.errors).toBeFalsy();
    });
});
