### 2) Style is no longer tied to a line
- Style used to be returned on a line in the response, and so we exposed this as an `Appearance` on `FormLine` in the SDK.
It is now a top-level attribute of the entire analyze result and spans are used to understand the text (line, word, etc)
which has the particular style.
- The service could return more than one style for a Line. 

![image](https://user-images.githubusercontent.com/16845631/129294492-b4fb42d5-7306-41f0-9a8c-80e7955efc76.png)

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

#### Non-Breaking change design:
https://github.com/samvaity/azure-sdk-for-java/compare/fr-3-design...samvaity:style-design-non-breaking?expand=1

We cannot be fully backwards compatible and support FormLines to have a **"single"** `TextAppearance` object _correctly_ without a breaking change.

In order to be fully backwards compatible,
we could map the "first/most-part" of the multiple appearances of the FormLine returned by the service so that, a `FormLine` has a single `TextAppearance` design.


In doing so, we definitely lose the character level resolution feature of the v3.0 service, and we will be doing a lossy translation of the appearances' data returned by the service.

#### Breaking change design:
https://github.com/samvaity/azure-sdk-for-java/compare/fr-3-design...samvaity:style-design-1?expand=1

Service now returns style as a page level element.

It poses a breaking change for the SDK since it is no longer true that a line could just have a single appearance/style.
More so, a **single** **word** could also have more than one style.

We could use a list of appearances to represent the multiple appearances a FormLine could have.
Further, add a `DocumentSpan` property to the `TextApperance` object to drill down into the character level resolution feature.
