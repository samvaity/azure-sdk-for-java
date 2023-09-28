// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.typespec.core.credential;

/**
 * Represents a credential that uses a key to authenticate to an TypeSpec Service.
 */
public final class TypeSpecKeyCredential extends KeyCredential {
    /**
     * Creates a credential that authorizes request with the given key.
     *
     * @param key The key used to authorize requests.
     * @throws NullPointerException If {@code key} is {@code null}.
     * @throws IllegalArgumentException If {@code key} is an empty string.
     */
    public TypeSpecKeyCredential(String key) {
        super(key);
    }

    /**
     * Rotates the key associated to this credential.
     *
     * @param key The new key to associated with this credential.
     * @return The updated {@code TypeSpecKeyCredential} object.
     * @throws NullPointerException If {@code key} is {@code null}.
     * @throws IllegalArgumentException If {@code key} is an empty string.
     */
    @Override
    public TypeSpecKeyCredential update(String key) {
        super.update(key);
        return this;
    }
}
