// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.typespec.core.client.traits;

import com.typespec.core.credential.TypeSpecKeyCredential;

/**
 * An {@link com.typespec.core.client.traits TypeSpec SDK for Java trait} providing a consistent interface for setting
 * {@link TypeSpecKeyCredential}. Refer to the TypeSpec SDK for Java
 * <a href="https://aka.ms/azsdk/java/docs/identity">identity and authentication</a>
 * documentation for more details on proper usage of the {@link TypeSpecKeyCredential} type.
 *
 * @param <T> The concrete type that implements the trait. This is required so that fluent operations can continue
 *           to return the concrete type, rather than the trait type.
 * @see com.typespec.core.client.traits
 * @see TypeSpecKeyCredential
 */
public interface TypeSpecKeyCredentialTrait<T extends TypeSpecKeyCredentialTrait<T>> {
    /**
     * Sets the {@link TypeSpecKeyCredential} used for authentication. Refer to the TypeSpec SDK for Java
     * <a href="https://aka.ms/azsdk/java/docs/identity">identity and authentication</a>
     * documentation for more details on proper usage of the {@link TypeSpecKeyCredential} type.
     *
     * @param credential the {@link TypeSpecKeyCredential} to be used for authentication.
     * @return Returns the same concrete type with the appropriate properties updated, to allow for fluent chaining of
     *      operations.
     */
    T credential(TypeSpecKeyCredential credential);
}
