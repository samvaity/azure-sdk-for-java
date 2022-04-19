package com.azure.ai.formrecognizer.models;

import com.azure.ai.formrecognizer.implementation.models.DocumentField;
import com.azure.ai.formrecognizer.implementation.util.DocumentFieldHelper;

import java.util.List;

/**
 * CLass Typed refer document field model
 */
public class TypedDocumentField<T> {

    private T value;
    private String content;
    private DocumentFieldType valueType;

    /*
     * Bounding regions covering the field.
     */
    private List<BoundingRegion> boundingRegions;

    /*
     * Location of the field in the reading order concatenated content.
     */
    private List<DocumentSpan> spans;

    /*
     * Confidence of correctly extracting the field.
     */
    private Float confidence;

    /**
     * constructor
     * @param documentField documentField
     * @param type type
     */
    // public TypedDocumentField(DocumentField documentField, Class<T> type) {
    //     this.documentField = documentField;
    //     this.type = type;
    // }

    /**
     * get value method
     * @return T value
     */
    public T getValue() {
        // if (documentField.getType() == com.azure.ai.formrecognizer.implementation.models.DocumentFieldType.STRING && type.getClass().equals(String.class)) {
        //     return (T) documentField.getValueString();
        // } else if (documentField.getType() == com.azure.ai.formrecognizer.implementation.models.DocumentFieldType.ARRAY && type.getClass().equals(List.class)) {
        //     return (T) documentField.getValueArray();
        // }
        // // throw new IllegalStateException("Type mismatch error");
        return value;
    }

    /**
     * Set the content property: Field content.
     *
     * @param value the content value to set.
     */
    void setValue(T value) {
        this.value = value;
    }

    /**
     * Get the content property: Field content.
     *
     * @return the content value.
     */
    public String getContent() {
        return this.content;
    }

    /**
     * Set the content property: Field content.
     *
     * @param content the content value to set.
     */
    void setContent(String content) {
        this.content = content;
    }

    /**
     * Get the boundingRegions property: Bounding regions covering the field.
     *
     * @return the boundingRegions value.
     */
    public List<BoundingRegion> getBoundingRegions() {
        return this.boundingRegions;
    }

    /**
     * Set the boundingRegions property: Bounding regions covering the field.
     *
     * @param boundingRegions the boundingRegions value to set.
     */
    void setBoundingRegions(List<BoundingRegion> boundingRegions) {
        this.boundingRegions = boundingRegions;
    }

    /**
     * Get the location of the field in the reading order concatenated content.
     *
     * @return the spans value.
     */
    public List<DocumentSpan> getSpans() {
        return this.spans;
    }

    /**
     * Set the location of the field in the reading order concatenated content.
     *
     * @param spans the spans value to set.
     */
    void setSpans(List<DocumentSpan> spans) {
        this.spans = spans;
    }

    /**
     * Get the confidence property: Confidence of correctly extracting the field.
     *
     * @return the confidence value.
     */
    public Float getConfidence() {
        return this.confidence;
    }

    /**
     * Set the confidence property: Confidence of correctly extracting the field.
     *
     * @param confidence the confidence value to set.
     */
    void setConfidence(Float confidence) {
        this.confidence = confidence;
    }

    /**
     * Get the type property: Data type of the field value.
     *
     * @return the type value.
     */
    public DocumentFieldType getValueType() {
        return this.valueType;
    }

    /**
     * Set the type property: Data type of the field value.
     *
     * @param type the type value to set.
     */
    void setValueType(DocumentFieldType type) {
        this.valueType = type;
    }

    static {
        DocumentFieldHelper.setAccessor(new DocumentFieldHelper.DocumentFieldAccessor() {
            @Override
            public void setType(TypedDocumentField documentField, DocumentFieldType type) {
                documentField.setValueType(type);
            }


            @Override
            public void setContent(TypedDocumentField documentField, String content) {
                documentField.setContent(content);
            }

            @Override
            public void setBoundingRegions(TypedDocumentField documentField, List<BoundingRegion> boundingRegions) {
                documentField.setBoundingRegions(boundingRegions);
            }

            @Override
            public void setSpans(TypedDocumentField documentField, List<DocumentSpan> spans) {
                documentField.setSpans(spans);
            }

            @Override
            public void setConfidence(TypedDocumentField documentField, Float confidence) {
                documentField.setConfidence(confidence);
            }
        });
    }

}
