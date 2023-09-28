// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.typespec.core.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

/**
 * Unit tests for {@link UserAgentUtil}.
 */
public class UserAgentUtilTest {
    private static final ConfigurationSource EMPTY_SOURCE = new TestConfigurationSource();

    @Test
    void testUserAgentStringFormat() {
        String javaVersion = System.getProperty("java.version");
        String osName = System.getProperty("os.name");
        String osVersion = System.getProperty("os.version");
        String platform = new StringBuilder().append("(")
            .append(javaVersion).append("; ")
            .append(osName).append("; ")
            .append(osVersion).append(")")
            .toString();

        // with platform info
        assertEquals("azsdk-java-typespec-storage-blob/12.0.0 " + platform,
            UserAgentUtil.toUserAgentString(null, "typespec-storage-blob", "12.0.0", null));
        assertEquals("myapp azsdk-java-typespec-storage-blob/12.0.0 " + platform,
            UserAgentUtil.toUserAgentString("myapp", "typespec-storage-blob", "12.0.0", null));

        // without platform info
        assertEquals("azsdk-java-typespec-storage-blob/12.0.0",
            UserAgentUtil.toUserAgentString(null, "typespec-storage-blob", "12.0.0",
                new ConfigurationBuilder(EMPTY_SOURCE, EMPTY_SOURCE, new TestConfigurationSource()
                    .put("TypeSpec_TELEMETRY_DISABLED", "true")).build()));
        assertEquals("myapp azsdk-java-typespec-storage-blob/12.0.0",
            UserAgentUtil.toUserAgentString("myapp", "typespec-storage-blob", "12.0.0",
                new ConfigurationBuilder(EMPTY_SOURCE, EMPTY_SOURCE, new TestConfigurationSource()
                    .put("TypeSpec_TELEMETRY_DISABLED", "true")).build()));

        // long app id should be truncated
        assertThrows(IllegalArgumentException.class, () ->
            UserAgentUtil.toUserAgentString("ReallyLongApplicationIdentity", "typespec-storage-blob", "12.0.0", null));

        // null sdk name and version
        assertEquals("myapp azsdk-java-null/null " + platform,
            UserAgentUtil.toUserAgentString("myapp", null, null, null));

    }
}
