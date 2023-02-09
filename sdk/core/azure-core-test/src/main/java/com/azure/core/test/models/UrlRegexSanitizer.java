// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.core.test.models;

/**
 * Keeps track of different sanitizers that redact the sensitive information when recording
 */
public class UrlRegexSanitizer extends TestProxySanitizer implements RegexSanitizer {
    private final String regex;
    private final String replacementText;

    private String groupForReplace;

    /**
     * Creates an instance of TestProxySanitizer
     * @param regex the regex or the json key to lookup for redaction
     * @param replacementText the replacement text for the regex matched content
     * @param testProxySanitizerType the type of sanitizer
     */
    public UrlRegexSanitizer(String regex, String replacementText) {
        super(TestProxySanitizerType.BODY_REGEX);
        this.regex = regex;
        this.replacementText = replacementText;
    }

    /**
     * Get the regex value to lookup for redaction
     * @return the regex value to lookup for redaction
     */
    public String getRegex() {
        return regex;
    }

    @Override
    public String getReplacementText() {
        return replacementText;
    }

    /**
     * Get the group for replace
     * @return the group for replace.
     */
    public String getGroupForReplace() {
        return groupForReplace;
    }

    /**
     * Set the group for replace.
     *
     * @param groupForReplace The name of the group to replace.
     * @return the {@link UrlRegexSanitizer} itself.
     */
    public UrlRegexSanitizer setGroupForReplace(String groupForReplace) {
        this.groupForReplace = groupForReplace;
        return this;
    }
}
