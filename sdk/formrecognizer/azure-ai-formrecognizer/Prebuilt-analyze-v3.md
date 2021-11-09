### Prebuilt Analyze V3

### Why consolidating into 1 method
- Prebuilt verticals do not have strongly typed result object, making discoverability of document fields difficult.
  - Using the programmatically accessible document type schema, we can apply code generation to create strongly typed {Vertical}Document object for each document type.  Developers can then easily cast the generic analyze output to the appropriate strongly typed document class.
  - Via FormRecognizer Studio, developers can download sample code that includes the strongly typed document classes. 

```json
{
  "docTypes": {
    "prebuilt:receipt": {
      "fieldSchema": {
        "ReceiptType": {
          "type": "string"
        },
        "Locale": {
          "type": "string"
        },
        "MerchantName": {
          "type": "string"
        },
        "MerchantPhoneNumber": {
          "type": "phoneNumber"
        },
        "MerchantAddress": {
          "type": "string"
        },
        "Total": {
          "type": "number"
        },
        "TransactionDate": {
          "type": "date"
        },
        "TransactionTime": {
          "type": "time"
        },
        "Subtotal": {
          "type": "number"
        },
        "Tax": {
          "type": "number"
        },
        "Tip": {
          "type": "number"
        },
        "ArrivalDate": {
          "type": "date"
        },
        "DepartureDate": {
          "type": "date"
        },
        "Currency": {
          "type": "currency"
        },
        "MerchantAliases": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "Items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "TotalPrice": {
                "type": "number"
              },
              "Name": {
                "type": "string"
              },
              "Quantity": {
                "type": "number"
              },
              "Price": {
                "type": "number"
              },
              "Description": {
                "type": "string"
              },
              "Date": {
                "type": "date"
              },
              "Category": {
                "type": "string"
              }
            }
          }
        }
      }
    }
  },
  "modelId": "prebuilt-receipt",
  "createdDateTime": "2021-07-30T00:00:00Z",
  "description": "Prebuilt model to extract key information from English receipts, including merchant name, transaction date, transaction total, and more."
}
```

### User model based on the receipt schema provided by the service:

```java
import com.azure.ai.formrecognizer.models.DocumentField;

class ReceiptDocument {
    public DocumentField merchantName;
    public DocumentField transactionDate;
    public List<DocumentField> items;
}
```

### Sample analysis code by user

```java
import com.azure.ai.formrecognizer.DocumentAnalysisClient;
import com.azure.ai.formrecognizer.models.AnalyzeResult;
import com.azure.ai.formrecognizer.models.AnalyzedDocument;

class AnalyzeReceipt {
    public static void main(String[] args) {
        DocumentAnalysisClient client = clientInitialization();
        SyncPoller<DocumentOperationResult, AnalyzeResult> analyzeReceiptPoller 
            = client.beginAnalyzeDocumentFromUrl("prebuilt-receipt", "receipt-url");

        AnalyzeResult analyzeResult = analyzeReceiptPoller.getFinalResult();
        
        analyzeResult.getDocuments().forEach(analyzedDocument -> {
           if (analyzedDocument.getDocType().equals("prebuilt-receipt")) {
               ReceiptDocument receiptDocument = analyzedDocument.getDocumentAs(ReceiptDocument.class);
               System.out.printf("----------- Analyzing receipt info %d -----------%n", i);
               DocumentField merchantNameField = receiptDocument.getMerchantName();
               if (merchantNameField != null) {
                   if (DocumentFieldType.STRING == merchantNameField.getType()) {
                       String merchantName = merchantNameField.getValueString();
                       System.out.printf("Merchant Name: %s, confidence: %.2f%n",
                           merchantName, merchantNameField.getConfidence());
                   }
               }

               DocumentField transactionDateField = receiptDocument.getTransactionDate();
               if (transactionDateField != null) {
                   if (DocumentFieldType.DATE == transactionDateField.getType()) {
                       LocalDate transactionDate = transactionDateField.getValueDate();
                       System.out.printf("Transaction Date: %s, confidence: %.2f%n",
                           transactionDate, transactionDateField.getConfidence());
                   }
               }
           } 
        });
    }
}
```


**Notes**
- For prebuilt-{layout,document}, all the information needed are available via the generic AnalyzeResult object.  Since the AnalyzeResult.Documents will always be empty, there is no risk of developers accidentally casting to an inappropriate document type. 
