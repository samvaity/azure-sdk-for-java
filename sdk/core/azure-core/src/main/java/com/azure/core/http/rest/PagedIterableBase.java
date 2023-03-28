// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.core.http.rest;

import com.azure.core.util.CoreUtils;
import com.azure.core.util.IterableStream;
import com.azure.core.util.paging.ContinuablePage;
import com.azure.core.util.paging.ContinuablePagedFluxCore;
import com.azure.core.util.paging.ContinuablePagedIterable;
import com.azure.core.util.paging.ContinuationState;
import com.azure.core.util.paging.PageRetriever;
import com.azure.core.util.paging.PageRetrieverSync;
import reactor.core.CoreSubscriber;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.function.Supplier;
import java.util.stream.Stream;

/**
 * This class provides utility to iterate over responses that extend {@link PagedResponse} using {@link Stream} and
 * {@link Iterable} interfaces.
 *
 * <p><strong>Code sample using {@link Stream} by page</strong></p>
 *
 * <!-- src_embed com.azure.core.http.rest.pagedIterableBase.streamByPage -->
 * <pre>
 * &#47;&#47; process the streamByPage
 * CustomPagedFlux&lt;String&gt; customPagedFlux = createCustomInstance&#40;&#41;;
 * PagedIterableBase&lt;String, PagedResponse&lt;String&gt;&gt; customPagedIterableResponse =
 *     new PagedIterableBase&lt;&gt;&#40;customPagedFlux&#41;;
 * customPagedIterableResponse.streamByPage&#40;&#41;.forEach&#40;resp -&gt; &#123;
 *     System.out.printf&#40;&quot;Response headers are %s. Url %s  and status code %d %n&quot;, resp.getHeaders&#40;&#41;,
 *         resp.getRequest&#40;&#41;.getUrl&#40;&#41;, resp.getStatusCode&#40;&#41;&#41;;
 *     resp.getElements&#40;&#41;.forEach&#40;value -&gt; System.out.printf&#40;&quot;Response value is %s %n&quot;, value&#41;&#41;;
 * &#125;&#41;;
 * </pre>
 * <!-- end com.azure.core.http.rest.pagedIterableBase.streamByPage -->
 *
 * <p><strong>Code sample using {@link Iterable} by page</strong></p>
 *
 * <!-- src_embed com.azure.core.http.rest.pagedIterableBase.iterableByPage -->
 * <pre>
 * &#47;&#47; process the iterableByPage
 * customPagedIterableResponse.iterableByPage&#40;&#41;.forEach&#40;resp -&gt; &#123;
 *     System.out.printf&#40;&quot;Response headers are %s. Url %s  and status code %d %n&quot;, resp.getHeaders&#40;&#41;,
 *         resp.getRequest&#40;&#41;.getUrl&#40;&#41;, resp.getStatusCode&#40;&#41;&#41;;
 *     resp.getElements&#40;&#41;.forEach&#40;value -&gt; System.out.printf&#40;&quot;Response value is %s %n&quot;, value&#41;&#41;;
 * &#125;&#41;;
 * </pre>
 * <!-- end com.azure.core.http.rest.pagedIterableBase.iterableByPage -->
 *
 * <p><strong>Code sample using {@link Iterable} by page and while loop</strong></p>
 *
 * <!-- src_embed com.azure.core.http.rest.pagedIterableBase.iterableByPage.while -->
 * <pre>
 * &#47;&#47; iterate over each page
 * for &#40;PagedResponse&lt;String&gt; resp : customPagedIterableResponse.iterableByPage&#40;&#41;&#41; &#123;
 *     System.out.printf&#40;&quot;Response headers are %s. Url %s  and status code %d %n&quot;, resp.getHeaders&#40;&#41;,
 *         resp.getRequest&#40;&#41;.getUrl&#40;&#41;, resp.getStatusCode&#40;&#41;&#41;;
 *     resp.getElements&#40;&#41;.forEach&#40;value -&gt; System.out.printf&#40;&quot;Response value is %s %n&quot;, value&#41;&#41;;
 * &#125;
 * </pre>
 * <!-- end com.azure.core.http.rest.pagedIterableBase.iterableByPage.while -->
 *
 * @param <T> The type of value contained in this {@link IterableStream}.
 * @param <P> The response extending from {@link PagedResponse}
 * @see PagedResponse
 * @see IterableStream
 */
public class PagedIterableBase<T, P extends PagedResponse<T>> extends ContinuablePagedIterable<String, T, P> {
    /**
     * Creates instance given {@link PagedFluxBase}.
     *
     * @param pagedFluxBase to use as iterable
     */
    @SuppressWarnings("deprecation")
    public PagedIterableBase(PagedFluxBase<T, P> pagedFluxBase) {
        super(pagedFluxBase);
    }

    /**
     * Creates instance given the {@link PageRetrieverSync page retriever} {@link Supplier}.
     *
     * @param provider The page retriever {@link Supplier}.
     */
    public PagedIterableBase(Supplier<PageRetrieverSync<String, P>> provider) {
        super(provider, null, token -> !CoreUtils.isNullOrEmpty(token));
    }

    /**
     * Creates a Flux of {@link PagedResponse} starting from the first page.
     *
     * <p><strong>Code sample</strong></p>
     * <!-- src_embed com.azure.core.http.rest.pagedfluxbase.bypage -->
     * <pre>
     * &#47;&#47; Start processing the results from first page
     * pagedFluxBase.byPage&#40;&#41;
     *     .log&#40;&#41;
     *     .doOnSubscribe&#40;ignoredVal -&gt; System.out.println&#40;
     *         &quot;Subscribed to paged flux processing pages starting from first page&quot;&#41;&#41;
     *     .subscribe&#40;page -&gt; System.out.printf&#40;&quot;Processing page containing item values: %s%n&quot;,
     *         page.getElements&#40;&#41;.stream&#40;&#41;.map&#40;String::valueOf&#41;.collect&#40;Collectors.joining&#40;&quot;, &quot;&#41;&#41;&#41;,
     *         error -&gt; System.err.println&#40;&quot;An error occurred: &quot; + error&#41;,
     *         &#40;&#41; -&gt; System.out.println&#40;&quot;Processing complete.&quot;&#41;&#41;;
     * </pre>
     * <!-- end com.azure.core.http.rest.pagedfluxbase.bypage -->
     *
     * @return A {@link PagedFluxBase} starting from the first page
     */
    public Stream<P> byPage() {
        return super.byPage();
    }

    /**
     * Creates a Flux of {@link PagedResponse} starting from the next page associated with the given continuation token.
     * To start from first page, use {@link #byPage()} instead.
     *
     * <p><strong>Code sample</strong></p>
     * <!-- src_embed com.azure.core.http.rest.pagedfluxbase.bypage#String -->
     * <pre>
     * &#47;&#47; Start processing the results from a page associated with the continuation token
     * String continuationToken = getContinuationToken&#40;&#41;;
     * pagedFluxBase.byPage&#40;continuationToken&#41;
     *     .log&#40;&#41;
     *     .doOnSubscribe&#40;ignoredVal -&gt; System.out.println&#40;
     *         &quot;Subscribed to paged flux processing page starting from &quot; + continuationToken&#41;&#41;
     *     .subscribe&#40;page -&gt; System.out.printf&#40;&quot;Processing page containing item values: %s%n&quot;,
     *         page.getElements&#40;&#41;.stream&#40;&#41;.map&#40;String::valueOf&#41;.collect&#40;Collectors.joining&#40;&quot;, &quot;&#41;&#41;&#41;,
     *         error -&gt; System.err.println&#40;&quot;An error occurred: &quot; + error&#41;,
     *         &#40;&#41; -&gt; System.out.println&#40;&quot;Processing complete.&quot;&#41;&#41;;
     * </pre>
     * <!-- end com.azure.core.http.rest.pagedfluxbase.bypage#String -->
     *
     * @param continuationToken The continuation token used to fetch the next page
     * @return A {@link PagedFluxBase} starting from the page associated with the continuation token
     */
    public Flux<P> byPage(String continuationToken) {
        return super.byPage(continuationToken);
    }
}
