// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.ai.formrecognizer.models;

import com.azure.ai.formrecognizer.implementation.util.AnalyzedDocumentHelper;
import com.azure.core.implementation.jackson.ObjectMapperShim;
import com.azure.core.util.serializer.JacksonAdapter;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.deser.std.UntypedObjectDeserializer;
import com.fasterxml.jackson.databind.module.SimpleModule;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * An object describing the location and semantic content of a document.
 */
public final class AnalyzedDocument {

    private static final JacksonAdapter DEFAULT_SERIALIZER_ADAPTER;

    static {
        JacksonAdapter adapter = new JacksonAdapter();

        UntypedObjectDeserializer defaultDeserializer = new UntypedObjectDeserializer(null, null);
        Iso8601DateDeserializer iso8601DateDeserializer = new Iso8601DateDeserializer(defaultDeserializer);
        SimpleModule module = new SimpleModule();
        module.addDeserializer(Object.class, iso8601DateDeserializer);

        adapter.serializer()
            .disable(DeserializationFeature.ADJUST_DATES_TO_CONTEXT_TIME_ZONE)
            .enable(DeserializationFeature.ACCEPT_EMPTY_STRING_AS_NULL_OBJECT)
            .registerModule(Iso8601DateSerializer.getModule())
            .registerModule(module);

        DEFAULT_SERIALIZER_ADAPTER = adapter;
    }

    public static JacksonAdapter getDefaultSerializerAdapter() {
        return DEFAULT_SERIALIZER_ADAPTER;
    }

    public static <T> T convertValue(Object initialValue, Class<T> newValueType) throws IOException {
        return DEFAULT_SERIALIZER_ADAPTER.serializer().convertValue(initialValue, newValueType);
    }

    /*
     * AnalyzeDocument type.
     */
    private String docType;

    /*
     * Bounding regions covering the document.
     */
    private List<BoundingRegion> boundingRegions;

    /*
     * Location of the document in the reading order concatenated content.
     */
    private List<DocumentSpan> spans;

    /*
     * Dictionary of named field values.
     */
    private Map<String, ?> fields;

    /*
     * Confidence of correctly extracting the document.
     */
    private float confidence;

    /**
     * Get the docType property: AnalyzeDocument type.
     *
     * @return the docType value.
     */
    public String getDocType() {
        return this.docType;
    }

    /**
     * Set the docType property: AnalyzeDocument type.
     *
     * @param docType the docType value to set.
     * @return the AnalyzeDocument object itself.
     */
    void setDocType(String docType) {
        this.docType = docType;
    }

    /**
     * Get the boundingRegions property: Bounding regions covering the document.
     *
     * @return the boundingRegions value.
     */
    public List<BoundingRegion> getBoundingRegions() {
        return this.boundingRegions;
    }

    /**
     * Set the boundingRegions property: Bounding regions covering the document.
     *
     * @param boundingRegions the boundingRegions value to set.
     * @return the AnalyzeDocument object itself.
     */
    void setBoundingRegions(List<BoundingRegion> boundingRegions) {
        this.boundingRegions = boundingRegions;
    }

    /**
     * Get the spans property: Location of the document in the reading order concatenated content.
     *
     * @return the spans value.
     */
    public List<DocumentSpan> getSpans() {
        return this.spans;
    }

    /**
     * Set the spans property: Location of the document in the reading order concatenated content.
     *
     * @param spans the spans value to set.
     * @return the AnalyzeDocument object itself.
     */
    void setSpans(List<DocumentSpan> spans) {
        this.spans = spans;
    }

    /**
     * Get the fields property: Dictionary of named field values.
     *
     * @return the fields value.
     */
    public Map<String, ?> getFields() {
        return this.fields;
    }

    /**
     * Set the fields property: Dictionary of named field values.
     *
     * @param fields the fields value to set.
     * @return the AnalyzeDocument object itself.
     */
    void setFields(Map<String, TypedDocumentField> fields) {
        this.fields = fields;
    }

    /**
     * Get the confidence property: Confidence of correctly extracting the document.
     *
     * @return the confidence value.
     */
    public float getConfidence() {
        return this.confidence;
    }

    /**
     * Set the confidence property: Confidence of correctly extracting the document.
     *
     * @param confidence the confidence value to set.
     * @return the AnalyzeDocument object itself.
     */
    void setConfidence(float confidence) {
        this.confidence = confidence;
    }

    public <T> T buildDocumentAs(Class<T> modelClass) throws IOException {
        String json = ObjectMapperShim.createDefaultMapper().writeValueAsString(this.fields);
        T doc = convertValue(json, modelClass);
        return doc;
    }


    static {
        AnalyzedDocumentHelper.setAccessor(new AnalyzedDocumentHelper.AnalyzedDocumentAccessor() {
            @Override
            public void setDocType(AnalyzedDocument analyzedDocument, String docType) {
                analyzedDocument.setDocType(docType);
            }

            @Override
            public void setBoundingRegions(AnalyzedDocument analyzedDocument, List<BoundingRegion> boundingRegions) {
                analyzedDocument.setBoundingRegions(boundingRegions);
            }

            @Override
            public void setSpans(AnalyzedDocument analyzedDocument, List<DocumentSpan> spans) {
                analyzedDocument.setSpans(spans);
            }

            @Override
            public void setFields(AnalyzedDocument analyzedDocument, Map<String, TypedDocumentField> fields) {
                analyzedDocument.setFields(fields);
            }

            @Override
            public void setConfidence(AnalyzedDocument analyzedDocument, float confidence) {
                analyzedDocument.setConfidence(confidence);
            }
        });
    }
}
