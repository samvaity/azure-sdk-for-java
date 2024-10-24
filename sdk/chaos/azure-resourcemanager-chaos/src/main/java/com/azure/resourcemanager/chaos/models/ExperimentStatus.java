// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Code generated by Microsoft (R) AutoRest Code Generator.

package com.azure.resourcemanager.chaos.models;

import com.azure.resourcemanager.chaos.fluent.models.ExperimentStatusInner;
import java.time.OffsetDateTime;

/** An immutable client-side representation of ExperimentStatus. */
public interface ExperimentStatus {
    /**
     * Gets the type property: String of the resource type.
     *
     * @return the type value.
     */
    String type();

    /**
     * Gets the id property: String of the fully qualified resource ID.
     *
     * @return the id value.
     */
    String id();

    /**
     * Gets the name property: String of the resource name.
     *
     * @return the name value.
     */
    String name();

    /**
     * Gets the status property: String that represents the status of a Experiment.
     *
     * @return the status value.
     */
    String status();

    /**
     * Gets the createdDateUtc property: String that represents the created date time of a Experiment.
     *
     * @return the createdDateUtc value.
     */
    OffsetDateTime createdDateUtc();

    /**
     * Gets the endDateUtc property: String that represents the end date time of a Experiment.
     *
     * @return the endDateUtc value.
     */
    OffsetDateTime endDateUtc();

    /**
     * Gets the inner com.azure.resourcemanager.chaos.fluent.models.ExperimentStatusInner object.
     *
     * @return the inner object.
     */
    ExperimentStatusInner innerModel();
}
