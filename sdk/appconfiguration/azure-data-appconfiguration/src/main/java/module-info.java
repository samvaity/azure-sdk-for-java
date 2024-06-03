// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

module com.azure.data.appconfiguration {
    requires transitive io.clientcore.core;
    requires io.clientcore.core.json;

    opens com.azure.data.appconfiguration.implementation to com.azure.core;
    opens com.azure.data.appconfiguration.implementation.models to com.azure.core;
    opens com.azure.data.appconfiguration.models to com.azure.core;

    exports com.azure.data.appconfiguration;
    exports com.azure.data.appconfiguration.models;
}
