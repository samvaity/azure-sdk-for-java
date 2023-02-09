// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.core.test.models;

/**
 * Keeps track of different sanitizers that redact the sensitive information when recording
 */
public class TestProxySanitizer {
    private final TestProxySanitizerType testProxySanitizerType;
    private String regex;
    private String replacementText;


    /**
     * Creates an instance of TestProxySanitizer
     * @param testProxySanitizerType the type of sanitizer
     */
    public TestProxySanitizer(TestProxySanitizerType testProxySanitizerType) {
        this.testProxySanitizerType = testProxySanitizerType;
    }

    /**
     * Get the type of proxy sanitizer
     * @return the type of proxy sanitizer
     */
    public TestProxySanitizerType getType() {
        return testProxySanitizerType;
    }

    /**
     * Get the regex key to lookup for redaction
     * @return the regex key to lookup for redaction
     */
    public String getRegex() {
        return regex;
    }

    /**
     * Get the  replacement for regex matched content
     * @return the replacement for regex matched content
     */
    public String getReplacementText() {
        return replacementText;
    }
}
