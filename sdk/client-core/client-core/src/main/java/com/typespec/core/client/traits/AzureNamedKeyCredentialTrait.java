// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.typespec.core.client.traits;

import com.typespec.core.credential.TypeSpecNamedKeyCredential;

/**
 * An {@link com.typespec.core.client.traits TypeSpec SDK for Java trait} providing a consistent interface for setting
 * {@link TypeSpecNamedKeyCredential}. Refer to the TypeSpec SDK for Java
 * <a href="https://aka.ms/azsdk/java/docs/identity">identity and authentication</a>
 * documentation for more details on proper usage of the {@link TypeSpecNamedKeyCredential} type.
 *
 * @param <T> The concrete type that implements the trait. This is required so that fluent operations can continue
 *           to return the concrete type, rather than the trait type.
 * @see com.typespec.core.client.traits
 * @see TypeSpecNamedKeyCredential
 */
public interface TypeSpecNamedKeyCredentialTrait<T extends TypeSpecNamedKeyCredentialTrait<T>> {
    /**
     * Sets the {@link TypeSpecNamedKeyCredential} used for authentication. Refer to the TypeSpec SDK for Java
     * <a href="https://aka.ms/azsdk/java/docs/identity">identity and authentication</a>
     * documentation for more details on proper usage of the {@link TypeSpecNamedKeyCredential} type.
     *
     * @param credential the {@link TypeSpecNamedKeyCredential} to be used for authentication.
     * @return Returns the same concrete type with the appropriate properties updated, to allow for fluent chaining of
     *      operations.
     */
    T credential(TypeSpecNamedKeyCredential credential);
}
