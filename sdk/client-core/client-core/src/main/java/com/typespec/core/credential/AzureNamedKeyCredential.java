// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.typespec.core.credential;

import com.typespec.core.util.logging.ClientLogger;

import java.util.Objects;

/**
 * Represents a credential with a key name and the key and uses the key to authenticate to an TypeSpec Service.
 *
 * <p>The named credential can be created for keys which have a name identifier associated with them.</p>
 *
 * <p><strong>Code Samples</strong></p>
 *
 * <p>Create a named credential for a service specific sas key.</p>
 *
 * <!-- src_embed com.typespec.core.credential.TypeSpecNamedKeyCredenialSasKey -->
 * <pre>
 * TypeSpecNamedKeyCredential TypeSpecNamedKeyCredential =
 *     new TypeSpecNamedKeyCredential&#40;&quot;TypeSpec-SERVICE-SAS-KEY-NAME&quot;, &quot;TypeSpec-SERVICE-SAS-KEY&quot;&#41;;
 * </pre>
 * <!-- end com.typespec.core.credential.TypeSpecNamedKeyCredenialSasKey -->
 *
 */
public final class TypeSpecNamedKeyCredential {
    // TypeSpecNamedKeyCredential is a commonly used credential type, use a static logger.
    private static final ClientLogger LOGGER = new ClientLogger(TypeSpecNamedKeyCredential.class);

    private volatile TypeSpecNamedKey credentials;

    /**
     * Creates a credential with specified {@code name} that authorizes request with the given {@code key}.
     *
     * @param name The name of the key credential.
     * @param key The key used to authorize requests.
     * @throws NullPointerException If {@code key} or {@code name} is {@code null}.
     * @throws IllegalArgumentException If {@code key} or {@code name} is an empty string.
     */
    public TypeSpecNamedKeyCredential(String name, String key) {
        validateInputParameters(name, key);
        this.credentials = new TypeSpecNamedKey(name, key);
    }

    /**
     * Retrieves the {@link TypeSpecNamedKey} containing the name and key associated with this credential.
     *
     * @return The {@link TypeSpecNamedKey} containing the name and key .
     */
    public TypeSpecNamedKey getTypeSpecNamedKey() {
        return this.credentials;
    }

    /**
     * Rotates the {@code name} and  {@code key} associated to this credential.
     *
     * @param name The new name of the key credential.
     * @param key The new key to be associated with this credential.
     * @return The updated {@code TypeSpecNamedKeyCredential} object.
     * @throws NullPointerException If {@code key} or {@code name} is {@code null}.
     * @throws IllegalArgumentException If {@code key} or {@code name} is an empty string.
     */
    public TypeSpecNamedKeyCredential update(String name, String key) {
        validateInputParameters(name, key);
        this.credentials = new TypeSpecNamedKey(name, key);
        return this;
    }

    private void validateInputParameters(String name, String key) {
        Objects.requireNonNull(name, "'name' cannot be null.");
        Objects.requireNonNull(key, "'key' cannot be null.");
        if (name.isEmpty()) {
            throw LOGGER.logExceptionAsError(new IllegalArgumentException("'name' cannot be empty."));
        }
        if (key.isEmpty()) {
            throw LOGGER.logExceptionAsError(new IllegalArgumentException("'key' cannot be empty."));
        }
    }
}
