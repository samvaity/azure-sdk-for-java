// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.generic.core.http.policy.logging;

import com.generic.core.util.configuration.Configuration;
import com.generic.core.util.configuration.ConfigurationBuilder;
import com.generic.core.util.configuration.ConfigurationSource;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import util.TestConfigurationSource;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Tests {@link HttpLogDetailLevel}.
 */
public class HttpLogDetailLevelTests {
    private static final ConfigurationSource EMPTY_SOURCE = (ConfigurationSource) new TestConfigurationSource();

    @ParameterizedTest
    @MethodSource("fromConfigurationSupplier")
    public void fromConfiguration(Configuration configuration, HttpLogDetailLevel expected) {
        assertEquals(expected, HttpLogDetailLevel.fromConfiguration(configuration));
    }

    private static Stream<Arguments> fromConfigurationSupplier() {
        // Inserting a null value into Configuration throws, so mock it.

        return Stream.of(
            // null turns into NONE
//            Arguments.of(Configuration.NONE, HttpLogDetailLevel.NONE),

            // Empty string turns into NONE
            Arguments.of(makeConfiguration(""), HttpLogDetailLevel.NONE),

            // Unknown values turn into NONE
            Arguments.of(makeConfiguration("unknown"), HttpLogDetailLevel.NONE),

            // BASIC turns into BASIC
            Arguments.of(makeConfiguration(HttpLogDetailLevel.BASIC.name()), HttpLogDetailLevel.BASIC),

            // bAsIc turns into BASIC
            Arguments.of(makeConfiguration("bAsIc"), HttpLogDetailLevel.BASIC),

            // HEADERS turns into HEADERS
            Arguments.of(makeConfiguration(HttpLogDetailLevel.HEADERS.name()), HttpLogDetailLevel.HEADERS),

            // hEaDeRs turns into HEADERS
            Arguments.of(makeConfiguration("hEaDeRs"), HttpLogDetailLevel.HEADERS),

            // BODY turns into BODY
            Arguments.of(makeConfiguration(HttpLogDetailLevel.BODY.name()), HttpLogDetailLevel.BODY),

            // bOdY turns into BODY
            Arguments.of(makeConfiguration("bOdY"), HttpLogDetailLevel.BODY),

            // BODY_AND_HEADERS turns into BODY_AND_HEADERS
            Arguments.of(makeConfiguration(HttpLogDetailLevel.BODY_AND_HEADERS.name()),
                HttpLogDetailLevel.BODY_AND_HEADERS),

            // bOdY_aNd_HeAdErS turns into BODY_AND_HEADERS
            Arguments.of(makeConfiguration("bOdY_aNd_HeAdErS"), HttpLogDetailLevel.BODY_AND_HEADERS),

            // BODYANDHEADERS turns into BODY_AND_HEADERS
            Arguments.of(makeConfiguration("BODYANDHEADERS"), HttpLogDetailLevel.BODY_AND_HEADERS),

            // bOdYaNdHeAdErS turns into BODY_AND_HEADERS
            Arguments.of(makeConfiguration("bOdYaNdHeAdErS"), HttpLogDetailLevel.BODY_AND_HEADERS)
        );
    }

    private static Configuration makeConfiguration(String detailLevelValue) {
        return new ConfigurationBuilder(EMPTY_SOURCE, EMPTY_SOURCE, (ConfigurationSource) new TestConfigurationSource().put(Configuration.PROPERTY_HTTP_LOG_DETAIL_LEVEL, detailLevelValue))
            .build();
    }
}
