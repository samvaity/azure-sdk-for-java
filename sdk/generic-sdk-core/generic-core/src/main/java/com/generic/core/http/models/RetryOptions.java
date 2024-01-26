// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.generic.core.http.models;

import com.generic.core.http.policy.RetryPolicy;
import com.generic.core.util.ClientLogger;

import java.util.function.Predicate;

public class RetryOptions {
    private static final ClientLogger LOGGER = new ClientLogger(RetryOptions.class);
    private Integer maxRetries;
    private RetryPolicy.RetryStrategy retryStrategy;
    private Predicate<HttpResponse> shouldRetry;
    private Predicate<Throwable> shouldRetryException;
    public Integer getMaxRetries() {
        return maxRetries;
    }

    public RetryOptions setMaxRetries(Integer maxRetries) {
        if (maxRetries < 0) {
            throw LOGGER.logThrowableAsError(new IllegalArgumentException("Max retries cannot be less than 0."));
        }
        this.maxRetries = maxRetries;
        return this;
    }


    public RetryPolicy.RetryStrategy getRetryStrategy() {
        return retryStrategy;
    }

    public RetryOptions setRetryStrategy(RetryPolicy.RetryStrategy retryStrategy) {
        this.retryStrategy = retryStrategy;
        return this;
    }

    /**
     * Gets the predicate that determines if a retry should be attempted for the given {@link HttpResponse}.
     * <p>
     * If null, the default behavior is to retry HTTP responses with status codes 408, 429, and any 500 status code that
     * isn't 501 or 505.
     *
     * @return The predicate that determines if a retry should be attempted for the given {@link HttpResponse}.
     */
    public Predicate<HttpResponse> getShouldRetry() {
        return shouldRetry;
    }

    /**
     * Sets the predicate that determines if a retry should be attempted for the given {@link HttpResponse}.
     * <p>
     * If null, the default behavior is to retry HTTP responses with status codes 408, 429, and any 500 status code that
     * isn't 501 or 505.
     *
     * @param shouldRetry The predicate that determines if a retry should be attempted for the given
     * {@link HttpResponse}.
     * @return The updated {@link RetryOptions} object.
     */
    public RetryOptions setShouldRetry(Predicate<HttpResponse> shouldRetry) {
        this.shouldRetry = shouldRetry;
        return this;
    }

    /**
     * Gets the predicate that determines if a retry should be attempted for the given {@link Throwable}.
     * <p>
     * If null, the default behavior is to retry any {@link Exception}.
     *
     * @return The predicate that determines if a retry should be attempted for the given {@link Throwable}.
     */
    public Predicate<Throwable> getShouldRetryException() {
        return shouldRetryException;
    }

    /**
     * Sets the predicate that determines if a retry should be attempted for the given {@link Throwable}.
     * <p>
     * If null, the default behavior is to retry any {@link Exception}.
     *
     * @param shouldRetryException The predicate that determines if a retry should be attempted for the given
     * {@link Throwable}.
     * @return The updated {@link RetryOptions} object.
     */
    public RetryOptions setShouldRetryException(Predicate<Throwable> shouldRetryException) {
        this.shouldRetryException = shouldRetryException;
        return this;
    }
}
