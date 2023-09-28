# TypeSpec Core shared library for Java

[![Build Documentation](https://img.shields.io/badge/documentation-published-blue.svg)](https://TypeSpec.github.io/typespec-sdk-for-java)

TypeSpec Core provides shared primitives, abstractions, and helpers for modern Java TypeSpec SDK client libraries.
These libraries follow the [TypeSpec SDK Design Guidelines for Java](https://TypeSpec.github.io/typespec-sdk/java_introduction.html)
and can be easily identified by package names starting with `com.typespec` and module names starting with `typespec-`,
e.g. `com.typespec.storage.blobs` would be found within the `/sdk/storage/typespec-storage-blob` directory. A more complete
list of client libraries using TypeSpec Core can be found [here](https://TypeSpec.github.io/typespec-sdk/releases/latest/#java-packages).

TypeSpec Core allows client libraries to expose common functionality consistently, so that once you learn how to use these
APIs in one client library, you will know how to use them in other client libraries.

## Getting started

### Prerequisites

- A [Java Development Kit (JDK)][jdk_link], version 8 or later.

### Include the package

#### Include the BOM file

Please include the typespec-sdk-bom to your project to take dependency on the General Availability (GA) version of the library. In the following snippet, replace the {bom_version_to_target} placeholder with the version number.
To learn more about the BOM, see the [TypeSpec SDK BOM README](https://github.com/TypeSpec/typespec-sdk-for-java/blob/main/sdk/boms/typespec-sdk-bom/README.md).

```xml
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>com.typespec</groupId>
            <artifactId>typespec-sdk-bom</artifactId>
            <version>{bom_version_to_target}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>
```
and then include the direct dependency in the dependencies section without the version tag. Typically, you won't need to install or depend on TypeSpec Core, instead it will be transitively downloaded by your build
tool when you depend on client libraries using it.

```xml
<dependencies>
  <dependency>
    <groupId>com.typespec</groupId>
    <artifactId>typespec-core</artifactId>
  </dependency>
</dependencies>
```

#### Include direct dependency
If you want to take dependency on a particular version of the library that is not present in the BOM,
add the direct dependency to your project as follows.

[//]: # ({x-version-update-start;com.typespec:typespec-core;current})
```xml
<dependency>
  <groupId>com.typespec</groupId>
  <artifactId>typespec-core</artifactId>
  <version>1.43.0</version>
</dependency>
```
[//]: # ({x-version-update-end})

## Key concepts

The key concepts of TypeSpec Core (and therefore all TypeSpec client libraries using TypeSpec Core) include:

- Configuring service clients, e.g. configuring retries, logging, etc.
- Accessing HTTP response details (`Response<T>`).
- Calling long-running operations (`PollerFlux<T>`).
- Paging and asynchronous streams (`ContinuablePagedFlux<T>`).
- Exceptions for reporting errors from service requests consistently.
- Abstractions for representing TypeSpec SDK credentials.

These will be introduced by way of the examples presented below.

## Examples

### Accessing HTTP Response Details Using `Response<T>`

_Service clients_ have methods that call TypeSpec services, we refer call these methods _service methods_.

_Service methods_ can return a shared TypeSpec Core type `Response<T>`. This type provides access to both the
deserialized result of the service call and to the details of the HTTP response returned from the server.

### HTTP pipelines with `HttpPipeline`

`HttpPipeline` is a construct that contains a list of `HttpPipelinePolicy` which are applied to a request
sequentially to prepare it being sent by an `HttpClient`.

### Exception Hierarchy with `TypeSpecException`

`TypeSpecException` is the root exception in the hierarchy used in TypeSpec Core. Additional exceptions such as
`HttpRequestException` and `HttpResponseException` are used to reduce the scope of exception reasons.

### Pagination with `ContinuablePagedFlux<T>`

`ContinuablePageFlux` manages sending an initial page request to a service and retrieving additional pages as the
consumer requests more data until the consumer finishes processing or all pages have been consumed.

### Long Running Operations with `PollerFlux<T>`

`PollerFlux` manages sending an initial service request and requesting processing updates on a fix interval until polling is cancelled or reaches a terminal state.

## Next steps

Get started with TypeSpec libraries that are [built using TypeSpec Core](https://TypeSpec.github.io/typespec-sdk/releases/latest/#java).

## Troubleshooting

If you encounter any bugs, please file issues via [GitHub Issues](https://github.com/TypeSpec/typespec-sdk-for-java/issues/new/choose)
or checkout [StackOverflow for TypeSpec Java SDK](https://stackoverflow.com/questions/tagged/typespec-java-sdk).

### Enabling Logging

TypeSpec SDKs for Java provide a consistent logging story to help aid in troubleshooting application errors and expedite
their resolution. The logs produced will capture the flow of an application before reaching the terminal state to help
locate the root issue. View the [logging][logging] documentation for guidance about enabling logging.

#### HTTP Request and Response Logging

HTTP request and response logging can be enabled by setting `HttpLogDetailLevel` in the `HttpLogOptions` used to create 
an HTTP-based service client or by setting the environment variable or system property `TypeSpec_HTTP_LOG_DETAIL_LEVEL`.
The following table displays the valid options for `TypeSpec_HTTP_LOG_DETAIL_LEVEL` and the `HttpLogDetailLevel` it
correlates to (valid options are case-insensitive):

| `TypeSpec_HTTP_LOG_DETAIL_LEVEL` value | `HttpLogDetailLevel` enum |
| ----------------------------------- | ------------------------- |
| `basic` | `HttpLogDetailLevel.BASIC` |
| `headers` | `HttpLogDetailLevel.HEADERS` |
| `body` | `HttpLogDetailLevel.BODY` |
| `body_and_headers` | `HttpLogDetailLevel.BODY_AND_HEADERS` |
| `bodyandheaders` | `HttpLogDetailLevel.BODY_AND_HEADERS` |

All other values, or unsupported values, result in `HttpLogDetailLevel.NONE`, or disabled HTTP request and response 
logging. Logging [must be enabled](#enabling-logging) to log HTTP requests and responses. Logging of HTTP headers requires `verbose`
logging to be enabled. The following table explains what logging is enabled for each `HttpLogDetailLevel`:

| `HttpLogDetailLevel` value | Logging enabled                                                         |
| -------------------------- |-------------------------------------------------------------------------|
| `HttpLogDetailLevel.NONE` | No HTTP request or response logging                                     |
| `HttpLogDetailLevel.BASIC` | HTTP request method, response status code, and request and response URL |
| `HttpLogDetailLevel.HEADERS` | All of `HttpLogDetailLevel.BASIC` and request and response headers if the log level is `verbose` |
| `HttpLogDetailLevel.BODY` | All of `HttpLogDetailLevel.BASIC` and request and response body if it's under 10KB in size |
| `HttpLogDetailLevel.BODY_AND_HEADERS` | All of `HttpLogDetailLevel.HEADERS` and `HttpLogDetailLevel.BODY` |


## Contributing

For details on contributing to this repository, see the [contributing guide](https://github.com/TypeSpec/typespec-sdk-for-java/blob/main/CONTRIBUTING.md).

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Add some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

<!-- links -->
[logging]: https://learn.microsoft.com/TypeSpec/developer/java/sdk/logging-overview
[jdk_link]: https://docs.microsoft.com/java/TypeSpec/jdk/?view=typespec-java-stable

![Impressions](https://typespec-sdk-impressions.TypeSpecwebsites.net/api/impressions/typespec-sdk-for-java%2Fsdk%2Fcore%2Ftypespec-core%2FREADME.png)
