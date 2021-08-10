This document evaluates the impact the new FR service v3.0 and it's impact to the SDK.
There are 3 main sections:
* [Breaking changes in the SDK](#breaking-changes-in-the-sdk)
* [Changes we can take in existing SDKs](#changes-we-can-take-in-existing-sdks)
* [Room for improvement](#room-for-improvement)

# Breaking changes in the SDK

### 1) Recognize content optional parameter `reading order` is no longer applicable.

In v2.1 user can set the reading order between "basic" (top-down, left-right) and "natural (positional information), where "basic" is the default behavior.
In v3.0 it defaults to "natural"  with no option to choose "basic" (top-down, left-right).

In Paul's words:

> Initially, the ordering of lines is computed using a predictable top-down, left-right heuristic.  To support customer requests, we need to support a more natural reading order that reflect the visual structure of the page content.  Although the new natural reading order behavior is what most customers want, it would constitute a breaking change.  Thus in v2.1, we supported via an optional readingOrder request parameter that defaults to the original basic reading order that we want to deprecate.  To reduce developer confusion and design surface in v3.x, we would like to remove the readingOrder parameter and always return the page content in reading order.

For the SDK, this means that we need to deprecate the parameter and that the order of `lines` returned in a document will be different in v3.0 than the order returned in v2.1.
If a customer wrote any logic based on the order of lines in the old library, this would now break for them when adopting v3.0.

![img_2.png](img_2.png)

```java
SyncPoller<FormRecognizerOperationResult, List<FormPage>> recognizeContentPoller =
  client.beginRecognizeContentFromUrl("url");

final FormPage formPage = recognizeContentPoller.getFinalResult().get(0);

 // Lines
formPage.getLines().forEach(formLine -> {         // ordering of lines differs from v3.0 to v2.1
    if (formLine.getAppearance() != null) {
        System.out.printf(
            "Line %s consists of %d words and has a text style %s with a confidence score of %.2f.%n",
            formLine.getText(), formLine.getWords().size(),
            formLine.getAppearance().getStyleName(),
            formLine.getAppearance().getStyleConfidence());
    }
});
```

### 2) Training documents information no longer returned after building a model in v3.0
We used to return a list of `TrainingDocumentInfo` on the model type returned from training a custom model. This information
is no longer returned in v3.0 and would lead to us needing to return an empty list.

Returned in v2.1 vs v3.0:

![img_10.png](img_10.png)

The type we return in the SDK:

![img.png](img.png)

The `TrainingDocumentInfo` model will no longer have values. No way to populate the fields:

![img_1.png](img_1.png)

Sample example:

```java
SyncPoller<FormRecognizerOperationResult, CustomFormModel> trainingPoller =
    client.beginTraining(trainingFilesUrl,
        true);

CustomFormModel customFormModel = trainingPoller.getFinalResult();

// The below document info is no longer returned
customFormModel.getTrainingDocuments().forEach(trainingDocumentInfo -> {
    System.out.printf("Document name: %s%n", trainingDocumentInfo.getName());
    System.out.printf("Document status: %s%n", trainingDocumentInfo.getStatus());
    System.out.printf("Document page count: %d%n", trainingDocumentInfo.getPageCount());
    if (!trainingDocumentInfo.getErrors().isEmpty()) {
        System.out.println("Document Errors:");
        trainingDocumentInfo.getErrors().forEach(formRecognizerError ->
            System.out.printf("Error code %s, Error message: %s%n", formRecognizerError.getErrorCode(),
                formRecognizerError.getMessage()));
    }
});
```

### 3) v3.0 deprecates unsupervised training
v3.0 deprecates the feature unsupervised training, which in the SDK is represented as a required parameter in the `beginTraining(String trainingFilesUrl,
boolean useTrainingLabels` method, called `useTrainingLabels`.

```java
public SyncPoller<FormRecognizerOperationResult, CustomFormModel> beginTraining(String trainingFilesUrl,
  boolean useTrainingLabels)  # required, positional param :(
```

The new build document model API also includes the `modelId` and `technique` as required parameters. We could maybe set
these in the SDK... need to understand that better.

We could deprecate this method and introduce a new `buildModel()` method...

```java
// Deprecate
public SyncPoller<FormRecognizerOperationResult, CustomFormModel> beginTraining(String trainingFilesUrl,
  boolean useTrainingLabels)
  
// Additive
public SyncPoller<FormRecognizerOperationResult, CustomFormModel> beginBuildModel(trainingFilesUrl,
 new TrainingOptions().setTemplateTechnique("fixedTemplate-2021-07-30"))
  
# Custom model information
print("Model ID: {}".format(model.model_id))

print("Recognized doc types:")
for doc_type, fields in model.doc_types.items():
    print("Doc type {} can recognize fields:".format(doc_type))
    for name, field in fields.field_schema.items():  # should confidence be at this level?
        print("Name: {}, type: {}".format(name, field.type))
    for name, confidence in fields.field_confidence.items():
        print("Name: {}, confidence: {}".format(name, confidence))
```

### 4) v3.0 deprecates `includeFieldElements`.
We used `includeFieldElements` as an optional parameter in API's to include the element references in the recognition result.
With v3.0 `includeFieldElements` would be defaulted to be `true`. In doing so, the service always returns the span information which can be then translated/computed to the element references.
This potentially could be a behavioral breaking change for customers thinking of it as an "opt-in" feature.

```java
beginRecognizeReceipts(receipt, receipt.length(),
  new RecognizeReceiptsOptions()
    .setContentType(FormContentType.IMAGE_JPEG)
    ~~.setFieldElementsIncluded(includeFieldElements)~~
    .setLocale(FormRecognizerLocale.EN_US)
    .setPollInterval(Duration.ofSeconds(5)))
```
### 5) Cross page elements mean that pages can't be accurately tied to documents
In our SDK design we'd take the page range values of a document result and then populate the corresponding pages under the `pages`
property. Seeing as v3.0 will have cross-page elements, including the support for multiple documents per page (e.g. license
and passport on one page), we can't accurately return the pages for a document anymore (they may include other information
not pertaining to the document).

For example, here we have a one page form with two documents on it (license and a business card):
![img_11.png](img_11.png)

v3.0 will treat this as two separate documents, each with their own bounding region.

Our current return type, `RecognizedForm`, has a `pages` property which currently includes the pages for the document.
With detection of multiple documents per page, now we will return information in `pages` which doesn't pertain to the
analyzed document (e.g. lines/words/metadata for the business card under the license document).

![image](https://user-images.githubusercontent.com/16845631/128783921-85c0a11d-f299-4a74-adea-4879d4640d6e.png)

### 6) v3.0 will support cross-page elements leading to bounding regions instead of bounding boxes
A cross-page element might be something like a table that spans across two pages like this:

![img_7.png](img_7.png)

Our FormTable type that represents a table in a document has only a bounding box property:

![image](https://user-images.githubusercontent.com/16845631/128783616-b1b8f896-57a0-426c-9f88-7197c6754a30.png)

We could add bounding_region next to bounding box, but will probably lead to a lot of confusion for which to use.

```json
{
    "page":1,
    "boundingBox": [...],
    "boundingRegions":[
      {"page": 1, "boundingBox": [...]},
      {"page": 2, "boundingBox": [...]},
    ]
}
```

Additionally, since we put `tables` under pages it calls into question which page the table should fall under when it
spans multiple pages?

![image](https://user-images.githubusercontent.com/16845631/128783714-28343c8b-9040-4986-8b40-c9165175dd44.png)

# Changes we can take in existing SDKs

### 2) Style is no longer tied to a line
Style used to be returned on a line in the response and so we exposed this as an `Appearance` on `FormLine` in the SDK.
It is now a top-level attribute of the entire analyze result and spans are used to understand the text (line, word, etc)
which has the particular style.

In the SDKs we can keep the property in the line and do the respective mapping with the spans. If we ever need to do it at the word level, we can add the property (additive change) and use spans again.
We will not expose Style in pages.

![img_6.png](img_6.png)

```json
{
    "status": "succeeded",
    "createdDateTime": "2021-08-05T01:47:55Z",
    "lastUpdatedDateTime": "2021-08-05T01:48:03Z",
    "analyzeResult": {
      "apiVersion": "2021-07-30-preview",
      "modelId": "prebuilt-receipt",
      "stringIndexType": "textElements",
      "content": "Contoso\nContoso\n123 Main Street\nRedmond, WA 98052\n987-654-3210\n6/10/2019 13:59\nSales Associate: Paul\n1 Cappuccino\n$2.20\n1 BACON & EGGS",
      "pages": [
        {
          "pageNumber": 1,
          "angle": 1.4879,
          "width": 8.5,
          "height": 11,
          "unit": "inch",
          "words": [...],
          "lines": [...]
        }
      ],
      "styles": [
        {
          "isHandwritten": true,
          "confidence": 0.9,
          "spans": [
            {
              "offset": 188,
              "length": 7
            }
          ]
        }
      ]
    }
}
```

### 3) v3.0 may in the future return both key-value pairs and documents analysis for a document

![img_13.png](img_13.png)

The SDK exposes these values under the `field` property in `RecognizedForm`. It assumes that prebuilt models will return fields only under
`fields` and trained models will return `key-value pairs`. Therefore we have logic to look at one or another and present the types
as one under the `fields` property.
In v3.0+ if _both_ `key value pairs` and `field/document analysis` fields were returned we
would need to decide which would get populated as `fields` and possibly add properties to make clear the distinction between fields by default the service
recognizes, and other fields that were also recognized.

### 4) Lines and words separated
`Lines` used to contain `Words` and now these two have been separated into their own lists in the response.
While we can index into the content directly to get the text, we will need to search the words, lines, etc to get the rest of
the information (`PageNumber`, `Confidence`, etc) to populate our existing model types `FormWord`, `FormLine`, `FormSelectionMark`.

```json
     "words": [
        {
          "text": "CONTOSO",            
          "boundingBox": [ ... ],       
          "confidence": 0.99,           
          "span": { ... }               
        }, ...
      ],

      // List of lines in page
      "lines": [
        {
          "content": "CONTOSO LTD.",    
          "boundingBox": [ ... ],       
          "spans": [ ... ],             
        }, ...
      ]
```

### 5) isHeader/isFooter -> rowHeader, rowFooter, columnHeader, columnFooter
Service v3.0, does not support binary header or footer specification for a  `FormTableCell`.
Since, SDK's already expose this as a binary property we could have additive values to support `{rowHeader, rowFooter, columnHeader, columnFooter}` and also map it to the already existing `isHeader/isFooter` properties.

# Room for improvement

### 1) Plan to add a new prebuilt model every month. Our SDK surface area will grow out of control.
In Java, we add 4 new client methods for every prebuilt model added (url and file stream input).

E.g. business cards:

![image](https://user-images.githubusercontent.com/16845631/128783248-4f20f90e-d68a-4d1f-af5d-d1d9950562f9.png)

With v3 we can unify prebuilts under a single method (or possibly two -- another for file streams) and just pass
in the model_id for which prebuilt or custom model you want to use for analysis.

```java
formRecognizerClient.beginAnalyzeDocument(modelId="prebuilt-businessCard", document=doc)
```

### 2) v3.0 makes the field schema programmatically accessible and SDK can leverage this to strongly type prebuilt/custom model fields
