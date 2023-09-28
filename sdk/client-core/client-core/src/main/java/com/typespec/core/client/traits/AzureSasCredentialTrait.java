// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.typespec.core.client.traits;

import com.typespec.core.credential.TypeSpecSasCredential;

/**
 * An {@link com.typespec.core.client.traits TypeSpec SDK for Java trait} providing a consistent interface for setting
 * {@link TypeSpecSasCredential}. Refer to the TypeSpec SDK for Java
 * <a href="https://aka.ms/azsdk/java/docs/identity">identity and authentication</a>
 * documentation for more details on proper usage of the {@link TypeSpecSasCredential} type.
 *
 * @param <T> The concrete type that implements the trait. This is required so that fluent operations can continue
 *           to return the concrete type, rather than the trait type.
 * @see com.typespec.core.client.traits
 * @see TypeSpecSasCredential
 */
public interface TypeSpecSasCredentialTrait<T extends TypeSpecSasCredentialTrait<T>> {
    /**
     * Sets the {@link TypeSpecSasCredential} used for authentication. Refer to the TypeSpec SDK for Java
     * <a href="https://aka.ms/azsdk/java/docs/identity">identity and authentication</a>
     * documentation for more details on proper usage of the {@link TypeSpecSasCredential} type.
     *
     * @param credential the {@link TypeSpecSasCredential} to be used for authentication.
     * @return Returns the same concrete type with the appropriate properties updated, to allow for fluent chaining of
     *      operations.
     */
    T credential(TypeSpecSasCredential credential);
}
