import { fetchNewsCascade } from '../services/NewsService.js';

// In-memory cache
const newsCache = {
    data: null,
    source: null,
    timestamp: null
};

export const getTrendingNews = async (req, res) => {
    try {
        const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
        const now = Date.now();
        const forceRefresh = req.query.force === 'true';

        // Serve from cache if valid and not forced
        if (!forceRefresh && newsCache.data && newsCache.timestamp && (now - newsCache.timestamp < CACHE_DURATION_MS)) {
            console.log(`Serving news from cache (Origin: ${newsCache.source})`);
            return res.json({ success: true, source: newsCache.source, articles: newsCache.data, cached: true });
        }

        // Delegate to resilient service
        console.log("Cache missed or expired. Fetching fresh news via cascade engine...");
        const result = await fetchNewsCascade();
        
        // Cache the successful result
        newsCache.data = result.articles;
        newsCache.source = result.source;
        newsCache.timestamp = now;
        
        console.log(`Successfully fetched and cached news via: ${result.source}`);
        return res.json({ success: true, source: result.source, articles: result.articles, cached: false });

    } catch (error) {
        console.error("Critical error in news controller:", error.message);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
