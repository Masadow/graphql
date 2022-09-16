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

import type { ResolveTree } from "graphql-parse-resolve-info";
import type { ConnectionField, ConnectionWhereArg, Context } from "../../types";
import type { Node } from "../../classes";
import type Relationship from "../../classes/Relationship";
import { createAuthPredicates } from "../create-auth-and-params";
import * as CypherBuilder from "../cypher-builder/CypherBuilder";
import { createConnectionWherePropertyOperation } from "../where/property-operations/create-connection-operation";
import { getOrCreateCypherNode } from "../utils/get-or-create-cypher-variable";
import { getPattern } from "../utils/get-pattern";
// eslint-disable-next-line import/no-cycle
import { createEdgeProjection } from "./connection-projection";
import { getSortFields } from "./get-sort-fields";
import { AUTH_FORBIDDEN_ERROR } from "../../constants";

/** Create the match, filtering and projection of the edge and the nested node */
export function createEdgeSubquery({
    resolveTree,
    field,
    context,
    parentNode,
    relatedNode,
    returnVariable,
    whereInput,
}: {
    resolveTree: ResolveTree;
    field: ConnectionField;
    context: Context;
    parentNode: string;
    relatedNode: Node;
    returnVariable: CypherBuilder.Variable;
    whereInput: ConnectionWhereArg;
}): CypherBuilder.Clause | undefined {
    const parentNodeRef = getOrCreateCypherNode(parentNode);
    // const whereInput = resolveTree.args.where as ConnectionWhereArg;

    const relatedNodeRef = new CypherBuilder.NamedNode(`${parentNode}_${relatedNode.name}`, {
        labels: relatedNode.getLabels(context),
    });

    const relationshipRef = new CypherBuilder.Relationship({
        source: parentNodeRef,
        target: relatedNodeRef,
        type: field.relationship.type,
    });

    const relPattern = getPattern({
        relationship: relationshipRef,
        field: field.relationship,
        resolveTree,
    });

    const matchClause = new CypherBuilder.Match(relPattern);
    // const unionInterfaceWhere = field.relationship.union ? (whereInput || {})[relatedNode.name] : whereInput || {};
    if (whereInput) {
        const relationship = context.relationships.find((r) => r.name === field.relationshipTypeName) as Relationship;

        // if (
        //     !hasExplicitNodeInInterfaceWhere({
        //         whereInput: unionInterfaceWhere,
        //         node: relatedNode,
        //     })
        // ) {
        //     return undefined;
        // }
        const wherePredicate = createConnectionWherePropertyOperation({
            context,
            whereInput,
            edgeRef: relationshipRef,
            targetNode: relatedNodeRef,
            node: relatedNode,
            edge: relationship,
        });

        if (wherePredicate) matchClause.where(wherePredicate);
    }
    const authPredicate = createAuthPredicates({
        operations: "READ",
        entity: relatedNode,
        context,
        where: { varName: relatedNodeRef, node: relatedNode },
    });
    if (authPredicate) {
        matchClause.where(authPredicate);
    }

    const authAllowPredicate = createAuthPredicates({
        operations: "READ",
        entity: relatedNode,
        context,
        allow: {
            parentNode: relatedNode,
            varName: relatedNodeRef,
        },
    });

    if (authAllowPredicate) {
        matchClause.where(
            new CypherBuilder.apoc.ValidatePredicate(CypherBuilder.not(authAllowPredicate), AUTH_FORBIDDEN_ERROR)
        );
    }

    // TODO: Handle projection.subqueries
    const projection = createEdgeProjection({
        resolveTree,
        field,
        relationshipRef,
        relatedNode,
        relatedNodeVariableName: relatedNodeRef.name,
        context,
        resolveType: true,
        extraFields: Object.keys(getSortFields(resolveTree).edge),
    });

    matchClause.return([projection.projection, returnVariable]);

    // return CypherBuilder.concat(withClause, matchClause);
    return matchClause;
}
