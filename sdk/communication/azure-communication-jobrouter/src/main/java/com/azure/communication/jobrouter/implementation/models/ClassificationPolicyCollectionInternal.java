// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Code generated by Microsoft (R) AutoRest Code Generator.

package com.azure.communication.jobrouter.implementation.models;

import com.azure.core.annotation.Fluent;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/** A paged collection of classification policies. */
@Fluent
public final class ClassificationPolicyCollectionInternal {
    /*
     * The value property.
     */
    @JsonProperty(value = "value", required = true)
    private List<ClassificationPolicyItemInternal> value;

    /*
     * The nextLink property.
     */
    @JsonProperty(value = "nextLink", access = JsonProperty.Access.WRITE_ONLY)
    private String nextLink;

    /** Creates an instance of ClassificationPolicyCollectionInternal class. */
    public ClassificationPolicyCollectionInternal() {}

    /**
     * Get the value property: The value property.
     *
     * @return the value value.
     */
    public List<ClassificationPolicyItemInternal> getValue() {
        return this.value;
    }

    /**
     * Set the value property: The value property.
     *
     * @param value the value value to set.
     * @return the ClassificationPolicyCollectionInternal object itself.
     */
    public ClassificationPolicyCollectionInternal setValue(List<ClassificationPolicyItemInternal> value) {
        this.value = value;
        return this;
    }

    /**
     * Get the nextLink property: The nextLink property.
     *
     * @return the nextLink value.
     */
    public String getNextLink() {
        return this.nextLink;
    }
}
