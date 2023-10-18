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

import type { Driver } from "neo4j-driver";
import Neo4j from "../neo4j";
import { Neo4jGraphQL } from "../../../src/classes";
import type { GraphQLResponse } from "@apollo/server";
import { ApolloServer } from "@apollo/server";
import gql from "graphql-tag";
import { graphql } from "graphql";

describe("https://github.com/neo4j/graphql/issues/4118", () => {
    let driver: Driver;
    let neo4j: Neo4j;

    const typeDefs = gql`
        type JWT @jwt {
            id: String
            roles: [String]
        }
        type User
            @authorization(
                validate: [
                    { where: { node: { userId: "$jwt.id" } }, operations: [READ] }
                    { where: { jwt: { roles_INCLUDES: "overlord" } } }
                ]
            ) {
            userId: String! @unique
            adminAccess: [Tenant!]! @relationship(type: "ADMIN_IN", direction: OUT)
        }

        type Tenant
            @authorization(
                validate: [
                    { where: { node: { admins: { userId: "$jwt.id" } } } }
                    { where: { jwt: { roles_INCLUDES: "overlord" } } }
                ]
            ) {
            id: ID! @id
            settings: Settings! @relationship(type: "HAS_SETTINGS", direction: OUT)
            admins: [User!]! @relationship(type: "ADMIN_IN", direction: IN)
        }

        type Settings
            @authorization(
                validate: [
                    { where: { node: { tenant: { admins: { userId: "$jwt.id" } } } } }
                    { where: { jwt: { roles_INCLUDES: "overlord" } } }
                ]
            ) {
            id: ID! @id
            tenant: Tenant! @relationship(type: "HAS_SETTINGS", direction: IN)
            openingDays: [OpeningDay!]! @relationship(type: "VALID_OPENING_DAYS", direction: OUT)
            name: String
        }

        type OpeningDay
            @authorization(
                validate: [{ where: { node: { settings: { tenant: { admins: { userId: "$jwt.id" } } } } } }]
            ) {
            settings: Settings @relationship(type: "VALID_OPENING_DAYS", direction: IN)
            id: ID! @id
            name: String
        }

        type LOL @authorization(validate: [{ where: { node: { host: { admins: { userId: "$jwt.id" } } } } }]) {
            host: Tenant! @relationship(type: "HOSTED_BY", direction: OUT)
            openingDays: [OpeningDay!]! @relationship(type: "HAS_OPENING_DAY", direction: OUT)
        }
    `;

    const ADD_TENANT = `
        mutation addTenant($input: [TenantCreateInput!]!) {
            createTenants(input: $input) {
                tenants {
                    id
                    admins {
                        userId
                    }
                    settings {
                        id
                    }
                }
            }
        }
    `;

    const ADD_OPENING_DAYS = `
        mutation addOpeningDays($input: [OpeningDayCreateInput!]!) {
            createOpeningDays(input: $input) {
                openingDays {
                    id
                }
            }
        }
    `;

    let tenantVariables: Record<string, any>;
    let openingDayInput: (settingsId: any) => Record<string, any>;
    let myUserId: string;

    beforeAll(async () => {
        neo4j = new Neo4j();
        driver = await neo4j.getDriver();
    });

    beforeEach(() => {
        myUserId = Math.random().toString(36).slice(2, 7);
        tenantVariables = {
            input: {
                admins: {
                    create: {
                        node: { userId: myUserId },
                    },
                },
                settings: {
                    create: {
                        node: {
                            name: "hi",
                        },
                    },
                },
            },
        };
        openingDayInput = (settingsId) => ({
            input: {
                settings: {
                    connect: {
                        where: {
                            node: {
                                id: settingsId,
                            },
                        },
                    },
                },
            },
        });
    });

    afterEach(async () => {
        const session = driver.session();
        await session.run(` match (n) detach delete n`);
        await session.close();
    });

    afterAll(async () => {
        await driver.close();
    });
    test("create lols - subscriptions disabled", async () => {
        const neo4jGraphql = new Neo4jGraphQL({
            typeDefs,
            driver,
        });
        const schema = await neo4jGraphql.getSchema();

        const addTenantResponse = await graphql({
            schema,
            source: ADD_TENANT,
            variableValues: tenantVariables,
            contextValue: neo4j.getContextValues({ jwt: { id: myUserId, roles: ["overlord"] } }),
        });
        expect(addTenantResponse).toMatchObject({
            data: {
                createTenants: {
                    tenants: [{ id: expect.any(String), admins: [{ userId: myUserId }] }],
                },
            },
        });

        const settingsId = (addTenantResponse.data as any).createTenants.tenants[0].settings.id;
        const addOpeningDaysResponse = await graphql({
            schema,
            source: ADD_OPENING_DAYS,
            variableValues: openingDayInput(settingsId),
            contextValue: neo4j.getContextValues({ jwt: { id: myUserId, roles: ["overlord"] } }),
        });
        expect(addOpeningDaysResponse).toMatchObject({
            data: { createOpeningDays: { openingDays: [{ id: expect.any(String) }] } },
        });
        const openingDayId = (addOpeningDaysResponse.data as any).createOpeningDays.openingDays[0].id;

        const addLolResponse = await graphql({
            schema,
            source: `
            mutation addLols($input: [LOLCreateInput!]!) {
                createLols(input: $input) {
                    lols {
                        host {
                            id
                        }
                    }
                }
            }
        `,
            variableValues: {
                input: {
                    host: {
                        connect: {
                            where: {
                                node: {
                                    id: myUserId,
                                },
                            },
                        },
                    },
                    openingDays: {
                        connect: {
                            where: {
                                node: {
                                    id: openingDayId,
                                },
                            },
                        },
                    },
                },
            },
            contextValue: neo4j.getContextValues({ jwt: { id: myUserId, roles: ["overlord"] } }),
        });

        expect(addLolResponse.errors?.[0]?.message).toContain("Forbidden");
    });

    test("create lols - subscriptions enabled", async () => {
        const neo4jGraphql = new Neo4jGraphQL({
            typeDefs,
            driver,
            features: {
                subscriptions: true,
            },
        });
        const schema = await neo4jGraphql.getSchema();

        const addTenantResponse = await graphql({
            schema,
            source: ADD_TENANT,
            variableValues: tenantVariables,
            contextValue: neo4j.getContextValues({ jwt: { id: myUserId, roles: ["overlord"] } }),
        });
        expect(addTenantResponse).toMatchObject({
            data: {
                createTenants: {
                    tenants: [{ id: expect.any(String), admins: [{ userId: myUserId }] }],
                },
            },
        });

        const settingsId = (addTenantResponse.data as any).createTenants.tenants[0].settings.id;
        const addOpeningDaysResponse = await graphql({
            schema,
            source: ADD_OPENING_DAYS,
            variableValues: openingDayInput(settingsId),
            contextValue: neo4j.getContextValues({ jwt: { id: myUserId, roles: ["overlord"] } }),
        });
        expect(addOpeningDaysResponse).toMatchObject({
            data: { createOpeningDays: { openingDays: [{ id: expect.any(String) }] } },
        });
        const openingDayId = (addOpeningDaysResponse.data as any).createOpeningDays.openingDays[0].id;

        const addLolResponse = await graphql({
            schema,
            source: `
            mutation addLols($input: [LOLCreateInput!]!) {
                createLols(input: $input) {
                    lols {
                        host {
                            id
                        }
                    }
                }
            }
        `,
            variableValues: {
                input: {
                    host: {
                        connect: {
                            where: {
                                node: {
                                    id: myUserId,
                                },
                            },
                        },
                    },
                    openingDays: {
                        connect: {
                            where: {
                                node: {
                                    id: openingDayId,
                                },
                            },
                        },
                    },
                },
            },
            contextValue: neo4j.getContextValues({ jwt: { id: myUserId, roles: ["overlord"] } }),
        });

        expect(addLolResponse.errors?.[0]?.message).toContain("Forbidden");
    });
});
