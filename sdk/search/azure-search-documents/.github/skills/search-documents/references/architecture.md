# azure-search-documents SDK Architecture (Java)

## Overview

`azure-search-documents` is the Java client library for [Azure AI Search](https://learn.microsoft.com/azure/search/) (formerly Azure Cognitive Search). It supports querying search indexes, uploading/managing documents, managing indexes, indexers, skillsets, aliases, and knowledge bases.

- **Maven coordinates**: `com.azure:azure-search-documents`
- **Current version**: `12.0.0-beta.1`
- **Java target**: Java 8+ (compiled via `azure-client-sdk-parent`)
- **Project file**: [pom.xml](../../../../pom.xml)

---

## Repository Layout

```
sdk/search/azure-search-documents/
├── tsp-location.yaml                     # TypeSpec generation pin (repo, commit, directory)
├── pom.xml                               # Maven project file (dependencies, build config)
├── CHANGELOG.md                          # Version history
├── README.md                             # Getting-started guide
├── TROUBLESHOOTING.md                    # Common issues and diagnostics
├── assets.json                           # Test recording pointer (Azure/azure-sdk-assets)
├── checkstyle-suppressions.xml           # Checkstyle suppressions
├── spotbugs-exclude.xml                  # SpotBugs exclusions
├── customizations/                       # Post-generation AST customizations
│   ├── pom.xml                           # Customization module build config
│   └── src/main/java/
│       └── SearchCustomizations.java     # JavaParser-based post-gen modifications
├── .github/skills/                       # Copilot agent skills (repo-local AI agent docs)
├── src/
│   ├── main/java/                        # Library source (see below)
│   ├── main/resources/                   # SDK properties, metadata
│   ├── samples/java/                     # Code samples linked from README
│   └── test/java/                        # Unit and live tests
└── target/                               # Maven build output (not committed)
```

---

## Source Layout (`src/main/java/`)


Post-generation modifications are applied via `SearchCustomizations.java` (JavaParser AST manipulation at code-generation time), not by editing generated files.

```
src/main/java/
├── module-info.java                      # Java module descriptor
│
└── com/azure/search/documents/
    ├── package-info.java
    ├── SearchClient.java                 # Sync document operations client (GENERATED)
    ├── SearchAsyncClient.java            # Async document operations client (GENERATED)
    ├── SearchClientBuilder.java          # Builder for SearchClient/SearchAsyncClient (GENERATED + customized)
    ├── SearchServiceVersion.java         # Service version enum (GENERATED + customized via SearchCustomizations)
    ├── SearchAudience.java               # Audience configuration
    ├── SearchIndexingBufferedSender.java      # Sync batched document upload sender
    ├── SearchIndexingBufferedAsyncSender.java # Async batched document upload sender
    │
    ├── implementation/                   # Internal implementation (not public API)
    │   ├── SearchClientImpl.java         # Generated HTTP client implementation
    │   ├── SearchIndexClientImpl.java
    │   ├── SearchIndexerClientImpl.java
    │   ├── KnowledgeBaseRetrievalClientImpl.java
    │   ├── SearchUtils.java              # Internal helpers (request/response conversion)
    │   ├── FieldBuilder.java             # Reflects over model types → SearchField list
    │   ├── batching/                     # Buffered indexing internals
    │   │   ├── SearchIndexingPublisher.java
    │   │   ├── SearchIndexingAsyncPublisher.java
    │   │   ├── IndexingDocumentManager.java
    │   │   ├── SearchBatchingUtils.java
    │   │   └── ...
    │   └── models/                       # Internal/wire-only models (GENERATED)
    │       ├── AutocompletePostRequest.java
    │       ├── SearchPostRequest.java
    │       ├── SuggestPostRequest.java
    │       └── CountRequestAccept*.java / CreateOrUpdateRequestAccept*.java
    │
    ├── models/                           # Public document operation models (GENERATED)
    │   ├── SearchOptions.java
    │   ├── SuggestOptions.java
    │   ├── AutocompleteOptions.java
    │   ├── SearchPagedFlux.java / SearchPagedIterable.java / SearchPagedResponse.java
    │   ├── SearchResult.java / SuggestResult.java / AutocompleteResult.java
    │   ├── IndexDocumentsBatch.java / IndexAction.java
    │   ├── VectorQuery.java / VectorizedQuery.java / VectorizableTextQuery.java
    │   ├── FacetResult.java
    │   ├── CountRequestAccept.java / CreateOrUpdateRequestAccept*.java  # Optional header models
    │   └── ...
    │
    ├── indexes/                          # Index & indexer management clients
    │   ├── SearchIndexClient.java        # Sync index management client (GENERATED)
    │   ├── SearchIndexAsyncClient.java   # Async index management client (GENERATED)
    │   ├── SearchIndexClientBuilder.java # Builder (GENERATED + customized)
    │   ├── SearchIndexerClient.java      # Sync indexer management client (GENERATED)
    │   ├── SearchIndexerAsyncClient.java # Async indexer management client (GENERATED)
    │   ├── SearchIndexerClientBuilder.java # Builder (GENERATED + customized)
    │   ├── BasicField.java / ComplexField.java  # Field helper types
    │   └── models/                       # Index/indexer/skillset models (GENERATED, ~230+ files)
    │       ├── SearchIndex.java
    │       ├── SearchField.java / SearchFieldDataType.java
    │       ├── SearchIndexer.java / SearchIndexerDataSourceConnection.java
    │       ├── SearchIndexerSkillset.java / SearchIndexerSkill.java
    │       ├── ChatCompletionSkill.java / ContentUnderstandingSkill.java
    │       ├── BM25SimilarityAlgorithm.java / VectorSearch.java
    │       ├── SearchAlias.java
    │       ├── KnowledgeBase.java / KnowledgeSource.java
    │       └── ...
    │
    ├── knowledgebases/                   # Knowledge base retrieval clients
    │   ├── KnowledgeBaseRetrievalClient.java       # Sync client (GENERATED)
    │   ├── KnowledgeBaseRetrievalAsyncClient.java   # Async client (GENERATED)
    │   ├── KnowledgeBaseRetrievalClientBuilder.java # Builder (GENERATED + customized)
    │   └── models/                       # Knowledge base models (GENERATED, ~40 files)
    │       ├── KnowledgeBaseRetrievalRequest.java / KnowledgeBaseRetrievalResponse.java
    │       ├── KnowledgeBaseMessage.java / KnowledgeBaseMessageContent.java
    │       ├── KnowledgeBaseActivityRecord.java / KnowledgeBaseAgenticReasoningActivityRecord.java
    │       └── ...
    │
    └── options/                          # Buffered sender callback option types
        ├── OnActionAddedOptions.java
        ├── OnActionErrorOptions.java
        ├── OnActionSentOptions.java
        └── OnActionSucceededOptions.java
```

---

## Code Generation

### TypeSpec-based generation

All source in `src/main/java/` is produced by the **Azure TypeSpec Java emitter** from the `azure-rest-api-specs` repository. The toolchain is:

```
azure-rest-api-specs (TypeSpec spec)
    → @azure-tools/typespec-java emitter
        → src/main/java/ in this repo
```

**Key file**: `tsp-location.yaml` — pins the exact spec commit used for generation.

```yaml
directory: specification/search/data-plane/Search
commit: <SHA>
repo: Azure/azure-rest-api-specs
cleanup: true
```

To regenerate, use:
```powershell
# From the repo root
tsp-client update --local-spec-repo <path-to-azure-rest-api-specs> --commit <SHA>
# OR for standard regeneration from the pinned commit:
tsp-client update
```

> **Rule**: Never hand-edit generated files (files with `// Code generated by Microsoft (R) TypeSpec Code Generator.` header). All post-generation modifications must go into `customizations/src/main/java/SearchCustomizations.java`.

### Generated vs. Custom

| Mechanism | Where | When to use |
|---|---|---|
| `SearchCustomizations.java` (JavaParser AST) | `customizations/src/main/java/` | Rename/hide/modify generated code at generation time |
| Non-generated source files | Alongside generated files | Add completely new types not produced by the generator |

The `SearchCustomizations.java` file runs during code generation and manipulates the generated Java AST using [JavaParser](https://javaparser.org/). It can:
- Add/remove/rename methods and fields
- Change access modifiers (public → package-private)
- Add new enum constants
- Modify method bodies


---

## Post-Generation Customizations (SearchCustomizations.java)

`customizations/src/main/java/SearchCustomizations.java` contains all post-generation modifications. It extends `Customization` and uses the `LibraryCustomization` API.

### Current customizations

| Method | What it does |
|---|---|
| `hideGeneratedSearchApis()` | Hides `searchWithResponse`, `autocompleteWithResponse`, `suggestWithResponse` on `SearchClient`/`SearchAsyncClient` — these are generated but should not be public (SearchOptions quirk) |
| `addSearchAudienceScopeHandling()` | Adds mutable `scopes` field to all builders, replacing `DEFAULT_SCOPES` in `createHttpPipeline()` — workaround for [typespec#9458](https://github.com/microsoft/typespec/issues/9458) |
| `includeOldApiVersions()` | Adds older `ServiceVersion` enum constants (`V2020_06_30`, `V2023_11_01`, `V2024_07_01`, `V2025_09_01`) to `SearchServiceVersion` — Java TypeSpec gen doesn't support partial updates to generated enums |
| `removeGetApis()` | Removes `searchGet*`, `suggestGet*`, `autocompleteGet*` methods — GET equivalents of POST APIs that we never expose |
| `hideWithResponseBinaryDataApis()` | Hides all `WithResponse` methods that use `BinaryData` — renames them to `hiddenGenerated*` and rewires the convenience methods to call the renamed version |

### How customizations are structured

```java
public class SearchCustomizations extends Customization {
    @Override
    public void customize(LibraryCustomization libraryCustomization, Logger logger) {
        PackageCustomization documents = libraryCustomization.getPackage("com.azure.search.documents");
        PackageCustomization indexes = libraryCustomization.getPackage("com.azure.search.documents.indexes");
        PackageCustomization knowledge = libraryCustomization.getPackage("com.azure.search.documents.knowledgebases");

        // Apply customizations using ClassCustomization.customizeAst(ast -> { ... })
    }
}
```

Each customization method uses `ClassCustomization.customizeAst()` which provides the JavaParser `CompilationUnit` for AST manipulation.

---

## Public Client Types

Java generates separate sync and async client classes for each service client.

| Type | Package | Purpose |
|---|---|---|
| `SearchClient` | `com.azure.search.documents` | Sync document query/upload |
| `SearchAsyncClient` | `com.azure.search.documents` | Async document query/upload |
| `SearchClientBuilder` | `com.azure.search.documents` | Builder for both search clients + buffered senders |
| `SearchIndexClient` | `com.azure.search.documents.indexes` | Sync index/synonym map/alias/knowledge base/knowledge source management |
| `SearchIndexAsyncClient` | `com.azure.search.documents.indexes` | Async equivalent |
| `SearchIndexClientBuilder` | `com.azure.search.documents.indexes` | Builder for index clients |
| `SearchIndexerClient` | `com.azure.search.documents.indexes` | Sync indexer/data source/skillset management |
| `SearchIndexerAsyncClient` | `com.azure.search.documents.indexes` | Async equivalent |
| `SearchIndexerClientBuilder` | `com.azure.search.documents.indexes` | Builder for indexer clients |
| `KnowledgeBaseRetrievalClient` | `com.azure.search.documents.knowledgebases` | Sync knowledge base retrieval (RAG) |
| `KnowledgeBaseRetrievalAsyncClient` | `com.azure.search.documents.knowledgebases` | Async equivalent |
| `KnowledgeBaseRetrievalClientBuilder` | `com.azure.search.documents.knowledgebases` | Builder for knowledge base clients |
| `SearchIndexingBufferedSender<T>` | `com.azure.search.documents` | Sync batched, retry-aware document upload |
| `SearchIndexingBufferedAsyncSender<T>` | `com.azure.search.documents` | Async equivalent |

---

## Service Version Management

`SearchServiceVersion.java` (generated) defines the service version enum implementing `com.azure.core.util.ServiceVersion`.

```java
public enum SearchServiceVersion implements ServiceVersion {
    V2020_06_30("2020-06-30"),    // Added by SearchCustomizations
    V2023_11_01("2023-11-01"),    // Added by SearchCustomizations
    V2024_07_01("2024-07-01"),    // Added by SearchCustomizations
    V2025_09_01("2025-09-01"),    // Added by SearchCustomizations
    V2026_04_01("2026-04-01");    // Generated by TypeSpec

    public static SearchServiceVersion getLatest() {
        return V2026_04_01;
    }
}
```

Old API versions are added by `SearchCustomizations.includeOldApiVersions()` during generation. To add a new old version, update the list in that method.

> **Rule**: When a new API version is introduced, the generator produces a new enum constant and updates `getLatest()`. Older versions must be added in `SearchCustomizations.java`.

---

## Known Generated Artifacts

### Optional header models (`CountRequestAccept*`, `CreateOrUpdateRequestAccept*`)

The TypeSpec spec declares optional `Accept` headers with single-value enums. The Java generator creates a model class for each one, resulting in many `CountRequestAccept*.java` and `CreateOrUpdateRequestAccept*.java` files in `models/` and `implementation/models/`. These are generated artifacts — they are wire-compatible and functional but verbose. This is tracked as a known generator issue.

### `@Generated` annotation

All generated members are annotated with `@Generated`. This annotation is used by:
- `SearchCustomizations.java` to identify which methods to modify
- Code review to distinguish generated from hand-written code

**Critical for post-regeneration fixes**: Generated files can contain BOTH `@Generated` methods and hand-written methods (without `@Generated`). After regeneration:
- `@Generated` methods are updated automatically by the generator
- Methods WITHOUT `@Generated` are hand-written convenience wrappers — the generator preserves them but does NOT update them
- If a generated type's constructor or signature changed, the hand-written methods referencing it will break
- **Look at how the `@Generated` method was updated** — the hand-written method should follow the same pattern

---

## Buffered Indexing (`implementation/batching/`)

`SearchIndexingBufferedSender<T>` / `SearchIndexingBufferedAsyncSender<T>` provide intelligent batch document upload with:

- Automatic batching and flushing (configurable via builder)
- Retry for failed individual index actions
- Callback-based notifications via `options/` package (`OnActionAddedOptions`, `OnActionErrorOptions`, `OnActionSentOptions`, `OnActionSucceededOptions`)
- Backed by custom Java async publisher (`SearchIndexingPublisher` / `SearchIndexingAsyncPublisher`)

Configuration defaults (from `SearchClientBuilder`):
- `DEFAULT_AUTO_FLUSH`: `true`
- `DEFAULT_INITIAL_BATCH_ACTION_COUNT`: `512`
- `DEFAULT_FLUSH_INTERVAL`: `60` seconds
- `DEFAULT_MAX_RETRIES_PER_ACTION`: `3`
- `DEFAULT_THROTTLING_DELAY`: `800` ms
- `DEFAULT_MAX_THROTTLING_DELAY`: `1` minute

---

## Key Supporting Files

| File | Purpose |
|---|---|
| `tsp-location.yaml` | Pins the TypeSpec spec commit for generation |
| `pom.xml` | Maven project definition, dependencies, build config |
| `customizations/src/main/java/SearchCustomizations.java` | All post-generation AST modifications |
| `customizations/pom.xml` | Customization module build config |
| `module-info.java` | Java module descriptor — exports and opens packages |
| `src/main/resources/azure-search-documents.properties` | SDK name/version properties loaded at runtime |
| `assets.json` | Points to the Azure SDK test recordings repo for playback tests |
| `CHANGELOG.md` | All version history; must be updated before each release |
| `checkstyle-suppressions.xml` | Checkstyle suppressions for generated code |
| `spotbugs-exclude.xml` | SpotBugs exclusions for generated code |

---

## Packages (Java Modules)

| Package | Contents |
|---|---|
| `com.azure.search.documents` | `SearchClient`, `SearchAsyncClient`, `SearchClientBuilder`, `SearchServiceVersion`, `SearchAudience`, buffered senders |
| `com.azure.search.documents.models` | Document operation models: `SearchOptions`, `SearchResult`, `IndexAction`, `VectorQuery`, etc. |
| `com.azure.search.documents.indexes` | `SearchIndexClient`, `SearchIndexAsyncClient`, `SearchIndexerClient`, `SearchIndexerAsyncClient`, builders, field helpers |
| `com.azure.search.documents.indexes.models` | Index/indexer/skillset models: `SearchIndex`, `SearchField`, `SearchIndexer`, skill types, vectorizers, etc. (~230+ classes) |
| `com.azure.search.documents.knowledgebases` | `KnowledgeBaseRetrievalClient`, `KnowledgeBaseRetrievalAsyncClient`, builder |
| `com.azure.search.documents.knowledgebases.models` | Knowledge base models: `KnowledgeBaseRetrievalRequest/Response`, `KnowledgeBaseMessage`, activity records, etc. (~40 classes) |
| `com.azure.search.documents.options` | Buffered sender callback options |
| `com.azure.search.documents.implementation` | Internal: HTTP client implementations, `SearchUtils`, `FieldBuilder` |
| `com.azure.search.documents.implementation.batching` | Internal: buffered indexing publisher/manager |
| `com.azure.search.documents.implementation.models` | Internal: wire-only request/response models |

---

## Dependencies

| Dependency | Scope | Purpose |
|---|---|---|
| `com.azure:azure-core` | compile | Core HTTP, pipeline, serialization framework |
| `com.azure:azure-json` | compile | JSON serialization (`JsonSerializable<T>`) |
| `com.azure:azure-core-http-netty` | compile | Default HTTP client (Netty) |
| `com.azure:azure-core-test` | test | Test framework integration |
| `com.azure:azure-identity` | test | AAD authentication for live tests |
| `com.azure:azure-ai-openai` | test | OpenAI integration for vector search tests |

---

## Tests

Tests live in `src/test/java/com/azure/search/documents/` and use JUnit 5 with `azure-core-test`.

```
src/test/java/com/azure/search/documents/
├── SearchTestBase.java                   # Base class with service setup
├── TestHelpers.java                      # Shared test utilities
├── SearchTests.java                      # Document search tests
├── LookupTests.java                      # Document lookup tests
├── IndexingTests.java                    # Document indexing tests
├── AutocompleteTests.java                # Autocomplete tests
├── SuggestTests.java                     # Suggest tests
├── VectorSearchTests.java               # Vector search tests
├── SearchAliasTests.java                 # Alias CRUD tests
├── KnowledgeBaseTests.java               # Knowledge base tests
├── KnowledgeSourceTests.java             # Knowledge source tests
├── SearchIndexingBufferedSenderTests.java
├── indexes/                              # Index/indexer management tests
│   ├── IndexManagementTests.java
│   ├── IndexerManagementTests.java
│   ├── SkillsetManagementTests.java
│   ├── DataSourceTests.java
│   └── ...
└── models/                               # Model serialization tests
```

Build and test commands:
```powershell
# Compile only
mvn clean compile -f sdk/search/azure-search-documents/pom.xml

# Run all tests (playback mode)
mvn test -f sdk/search/azure-search-documents/pom.xml

# Run a specific test class <!-- cspell:disable-next-line -->
mvn test -f sdk/search/azure-search-documents/pom.xml -pl :azure-search-documents -Dtest="SearchTests"
```
