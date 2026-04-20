# Architecture — azure-cosmos

## Repository Layout

```
sdk/cosmos/azure-cosmos/
├── pom.xml                          # Maven build (groupId: com.azure, artifactId: azure-cosmos)
├── CHANGELOG.md
├── README.md
├── src/
│   ├── main/java/com/azure/cosmos/
│   │   ├── CosmosClientBuilder.java         # @ServiceClientBuilder — builds sync + async clients
│   │   ├── CosmosAsyncClient.java           # @ServiceClient(isAsync=true) — reactive entry point
│   │   ├── CosmosClient.java                # @ServiceClient — sync wrapper over CosmosAsyncClient
│   │   ├── CosmosAsyncDatabase.java         # Database-level async operations
│   │   ├── CosmosDatabase.java              # Database-level sync wrapper
│   │   ├── CosmosAsyncContainer.java        # Container-level async operations (CRUD, query, bulk, batch)
│   │   ├── CosmosContainer.java             # Container-level sync wrapper
│   │   ├── ChangeFeedProcessor.java         # Interface for distributed change feed processing
│   │   ├── ChangeFeedProcessorBuilder.java  # Builder for ChangeFeedProcessor instances
│   │   ├── BridgeInternal.java              # Package-private bridge to implementation types
│   │   ├── CosmosBridgeInternal.java        # Additional bridge helpers
│   │   ├── DirectConnectionConfig.java      # Direct mode (RNTBD/TCP) configuration
│   │   ├── GatewayConnectionConfig.java     # Gateway mode (HTTPS) configuration
│   │   ├── CosmosException.java             # Base exception type
│   │   ├── CosmosDiagnostics*.java          # Diagnostics and telemetry types
│   │   ├── CosmosItemSerializer.java        # Custom serialization support
│   │   ├── implementation/                  # Internal implementation (see below)
│   │   ├── models/                          # Public request/response model POJOs
│   │   └── util/                            # Utilities: Beta annotation, CosmosPagedFlux/Iterable
│   └── samples/java/com/azure/cosmos/       # Code snippets for README
└── docs/                                    # Additional documentation
```

## Implementation Subdirectories

| Directory | Purpose |
|---|---|
| `apachecommons/` | Shaded Apache Commons (lang, collections). Use these, NOT external deps |
| `batch/` | Transactional batch and bulk execution internals |
| `caches/` | Routing map and metadata caches |
| `changefeed/` | Change feed processing internals (lease management, observers) |
| `clienttelemetry/` | Metrics emission, Micrometer integration, telemetry pipeline |
| `cpu/` | JVM CPU monitoring for diagnostics |
| `directconnectivity/` | RNTBD binary protocol transport, TCP connection management |
| `faultinjection/` | Fault injection framework for testing |
| `feedranges/` | Feed range abstraction (partition key ranges, continuation tokens) |
| `guava25/` | Shaded Guava 25 utilities. Use these, NOT external Guava |
| `http/` | HTTP client integration layer |
| `interceptor/` | Transport client interceptors |
| `patch/` | Partial document update (patch) operation internals |
| `perPartitionAutomaticFailover/` | Per-partition automatic failover logic |
| `perPartitionCircuitBreaker/` | Per-partition circuit breaker for availability |
| `query/` | Query engine: parsing, pipeline, aggregation, pagination |
| `routing/` | Partition key range resolution, collection routing maps |
| `spark/` | Spark connector support utilities |
| `throughputControl/` | Client-side and server-side throughput control/rate limiting |

## Public Client Hierarchy

```
CosmosClientBuilder
├── buildAsyncClient() → CosmosAsyncClient
│   ├── getDatabase() → CosmosAsyncDatabase
│   │   ├── getContainer() → CosmosAsyncContainer
│   │   │   └── getScripts() → CosmosAsyncScripts
│   │   └── CRUD: createContainer, readAllContainers, ...
│   └── CRUD: createDatabase, readAllDatabases, ...
└── buildClient() → CosmosClient (wraps CosmosAsyncClient)
    ├── getDatabase() → CosmosDatabase (wraps CosmosAsyncDatabase)
    │   ├── getContainer() → CosmosContainer (wraps CosmosAsyncContainer)
    │   │   └── getScripts() → CosmosScripts
    │   └── ...
    └── ...
```

## Sync-Over-Async Pattern

`CosmosClient` delegates to `CosmosAsyncClient` by calling `.block()` on reactive types. When adding features:

1. Implement in the async client/container first
2. Add the sync mirror method that calls the async version and blocks
3. Ensure `CosmosPagedFlux` (async) has a corresponding `CosmosPagedIterable` (sync) path

## ImplementationBridgeHelpers Registration

When creating a new public type that needs internal field access:

1. Add a `XxxHelper` interface with `XxxAccessor` in `ImplementationBridgeHelpers.java`
2. In the new public class, add a static initializer:
   ```java
   static {
       ImplementationBridgeHelpers.XxxHelper.setXxxAccessor(new ImplementationBridgeHelpers.XxxHelper.XxxAccessor() {
           // implement accessor methods
       });
   }
   ```
3. Implementation code calls `ImplementationBridgeHelpers.XxxHelper.getXxxAccessor()` to access internals

## Models Package Pattern

All public models follow this naming:
- `Cosmos<Entity>Properties` — domain object properties (container, database, stored proc, etc.)
- `Cosmos<Entity>RequestOptions` — per-request options
- `Cosmos<Entity>Response` — response wrapper with status code, diagnostics, properties
- `ModelBridgeInternal` — bridge for internal access to model fields

## Key Dependencies

- `azure-core` — HTTP pipeline, credentials, serialization
- `reactor-core` — Reactive Streams implementation
- `io.micrometer:micrometer-core` — Metrics (optional)
- `io.netty` — Network transport for RNTBD direct mode
- `com.fasterxml.jackson` — JSON serialization

## Tests (Separate Module)

Tests are in `sdk/cosmos/azure-cosmos-tests/`:
- Top-level: `CosmosAsyncClientTest`, `CosmosItemTest`, `CosmosBulkAsyncTest`, `PatchAsyncTest`, etc.
- `faultinjection/` — Chaos testing with `FaultInjectionTestBase`
- `cris/` — Cross-region integration scenarios
- `rx/` — Reactive test utilities
- `implementation/` — Implementation-level tests
