// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.typespec.core.exception;

/**
 * The base TypeSpec exception.
 *
 * @see HttpRequestException
 * @see ServiceResponseException
 * @see HttpResponseException
 */
public class TypeSpecException extends RuntimeException {

    /**
     * Initializes a new instance of the TypeSpecException class.
     */
    public TypeSpecException() {
        super();
    }

    /**
     * Initializes a new instance of the TypeSpecException class.
     *
     * @param message The exception message.
     */
    public TypeSpecException(final String message) {
        super(message);
    }

    /**
     * Initializes a new instance of the TypeSpecException class.
     *
     * @param cause The {@link Throwable} which caused the creation of this TypeSpecException.
     */
    public TypeSpecException(final Throwable cause) {
        super(cause);
    }

    /**
     * Initializes a new instance of the TypeSpecException class.
     *
     * @param message The exception message.
     * @param cause The {@link Throwable} which caused the creation of this TypeSpecException.
     */
    public TypeSpecException(final String message, final Throwable cause) {
        super(message, cause);
    }

    /**
     * Initializes a new instance of the TypeSpecException class.
     *
     * @param message The exception message.
     * @param cause The {@link Throwable} which caused the creation of this TypeSpecException.
     * @param enableSuppression Whether suppression is enabled or disabled.
     * @param writableStackTrace Whether the exception stack trace will be filled in.
     */
    public TypeSpecException(final String message, final Throwable cause, final boolean enableSuppression,
        final boolean writableStackTrace) {
        super(message, cause, enableSuppression, writableStackTrace);
    }
}
