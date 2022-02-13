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

import jsonwebtoken from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";
import Debug from "debug";
import { DEBUG_PREFIX } from "./constants";

const debug = Debug(DEBUG_PREFIX);

async function verifyJWKS<T = any>(client: JwksClient, token: string): Promise<T> {
    function getKey(header, callback) {
        client.getSigningKey(header.kid, (err, key) => {
            const signingKey = key?.getPublicKey();
            callback(null, signingKey);
        });
    }

    // Returns a Promise with verification result or error
    return new Promise((resolve, reject) =>
        jsonwebtoken.verify(
            token,
            getKey,
            {
                algorithms: ["HS256", "RS256"],
            },
            function verifyCallback(err, decoded) {
                return err ? reject(err) : resolve(decoded as unknown as T);
            }
        )
    );
}

export interface JWKSPluginInput {
    jwksEndpoint: string;
    rolesPath?: string;
}

class JWKSPlugin {
    jwksEndpoint: string;
    rolesPath?: string;
    client: JwksClient;

    constructor(input: JWKSPluginInput) {
        this.jwksEndpoint = input.jwksEndpoint;
        this.rolesPath = input.rolesPath;
        this.client = new JwksClient({
            jwksUri: this.jwksEndpoint,
            rateLimit: true,
            jwksRequestsPerMinute: 10,
            cache: true,
            cacheMaxEntries: 5,
            cacheMaxAge: 600000,
        });
    }

    async decode<T = any>(token: string | any): Promise<T | undefined> {
        try {
            debug("Verifying JWT using OpenID Public Key Set Endpoint");

            const result = await verifyJWKS<T>(this.client, token);

            return result;
        } catch (error) {
            debug("%s", error);
        }
    }
}

export default JWKSPlugin;
