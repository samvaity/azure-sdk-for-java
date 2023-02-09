package com.azure.core.test.models;

/** A client-side representation of Regex Sanitizers. */
public interface RegexSanitizer {
    /**
     * Get the regex key to lookup for redaction
     *
     * @return the regex key to lookup for redaction
     */
    String getRegex();

    /**
     * Get the replacement text for the regex matched content
     *
     * @return the replacement text for the regex matched content
     */
    String getReplacementText();
}
