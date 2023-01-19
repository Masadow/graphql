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

import type { Context, GraphQLWhereArg, RelationField } from "../../../types";
import Cypher from "@neo4j/cypher-builder";

import { createWherePredicate } from "../create-where-predicate";
import { getListPredicate } from "../utils";
import type { WhereOperator } from "../types";

export function createRelationshipOperation({
    relationField,
    context,
    parentNode,
    operator,
    value,
    isNot,
}: {
    relationField: RelationField;
    context: Context;
    parentNode: Cypher.Node;
    operator: string | undefined;
    value: GraphQLWhereArg;
    isNot: boolean;
}): { predicate: Cypher.Predicate | undefined; preComputedSubquery?: Cypher.CompositeClause | undefined } {
    const refNode = context.nodes.find((n) => n.name === relationField.typeMeta.name);
    if (!refNode) throw new Error("Relationship filters must reference nodes");

    const childNode = new Cypher.Node({ labels: refNode.getLabels(context) });

    const relationship = new Cypher.Relationship({
        source: relationField.direction === "IN" ? childNode : parentNode,
        target: relationField.direction === "IN" ? parentNode : childNode,
        type: relationField.type,
    });

    const matchPattern = relationship.pattern({
        source: relationField.direction === "IN" ? { variable: true } : { labels: false },
        target: relationField.direction === "IN" ? { labels: false } : { variable: true },
        relationship: { variable: true },
    });

    // TODO: check null in return projection
    if (value === null) {
        const existsSubquery = new Cypher.Match(matchPattern, {});
        const exists = new Cypher.Exists(existsSubquery);
        if (!isNot) {
            // Bit confusing, but basically checking for not null is the same as checking for relationship exists
            return { predicate: Cypher.not(exists) };
        }
        return { predicate: exists };
    }

    let listPredicateStr = getListPredicate(operator as WhereOperator);

    if (listPredicateStr === "any" && !relationField.typeMeta.array) {
        listPredicateStr = "single";
    }
    const {
        predicate: innerOperation,
        preComputedSubqueries,
        returnVariables,
    } = createWherePredicate({
        // Nested properties here
        whereInput: value,
        targetElement: childNode,
        element: refNode,
        context,
        listPredicateStr,
    });

    const predicate = createRelationshipSubqueryAndPredicate({
        childNode,
        matchPattern,
        listPredicateStr,
        innerOperation,
        returnVariables,
    });

    if (returnVariables && returnVariables.length) {
        const aggregatingWithClause = new Cypher.With(
            parentNode,
            ...(returnVariables.map((returnVar) => [Cypher.collect(returnVar), returnVar]) as any)
        );

        return {
            predicate,
            preComputedSubquery: Cypher.concat(
                new Cypher.OptionalMatch(matchPattern),
                preComputedSubqueries,
                aggregatingWithClause
            ),
        };
    }

    return {
        predicate,
        preComputedSubquery: preComputedSubqueries,
    };
}

export function createRelationshipSubqueryAndPredicate({
    matchPattern,
    listPredicateStr,
    childNode,
    innerOperation,
    returnVariables,
    edgePredicate,
}: {
    matchPattern: Cypher.Pattern;
    listPredicateStr: string;
    childNode: Cypher.Node;
    innerOperation: Cypher.Predicate | undefined;
    returnVariables: Cypher.Variable[];
    edgePredicate?: boolean;
}): Cypher.Predicate | undefined {
    if (!innerOperation) return undefined;
    const matchClause = new Cypher.Match(matchPattern).where(innerOperation);

    switch (listPredicateStr) {
        case "all": {
            // Testing "ALL" requires testing that at least one element exists and that no elements not matching the filter exists
            const notExistsMatchClause = new Cypher.Match(matchPattern).where(Cypher.not(innerOperation));
            return Cypher.and(new Cypher.Exists(matchClause), Cypher.not(new Cypher.Exists(notExistsMatchClause)));
        }
        case "not":
        case "none": {
            const somePredicate = createRelationshipSubqueryAndPredicate({
                matchPattern,
                listPredicateStr: "some",
                childNode,
                innerOperation,
                returnVariables,
            });
            if (somePredicate) {
                return Cypher.not(somePredicate);
            }
            return undefined;
        }
        case "single": {
            // If there are edge properties used in the innerOperation predicate, it is not possible to use the
            // more performant single() function. Therefore, we fall back to size()
            if (edgePredicate) {
                const sizeFunction = Cypher.size(
                    new Cypher.PatternComprehension(matchPattern, new Cypher.Literal(1)).where(innerOperation)
                );
                return Cypher.eq(sizeFunction, new Cypher.Literal(1));
            }

            const patternComprehension = new Cypher.PatternComprehension(matchPattern, childNode);
            return Cypher.single(childNode, patternComprehension, innerOperation);
        }
        case "some":
        default: {
            const existsPredicate = new Cypher.Exists(matchClause);
            return existsPredicate;
        }
    }
}
