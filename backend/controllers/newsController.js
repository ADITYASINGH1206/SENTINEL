import axios from 'axios';

// In-memory cache
const newsCache = {
    data: null,
    timestamp: null
};

// Fallback mock data in case API key is missing or rate limits hit
const fallbackNews = [
    {
        id: "mock-1",
        title: "SpaceX launches latest Starship orbital test with full payload",
        source_name: "TechCrunch",
        published_at: new Date().toISOString(),
        thumbnail_url: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&q=80",
        article_url: "#"
    },
    {
        id: "mock-2",
        title: "Apple announces massive AI update for next-gen iPhones",
        source_name: "The Verge",
        published_at: new Date(Date.now() - 3600000).toISOString(),
        thumbnail_url: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80",
        article_url: "#"
    },
    {
        id: "mock-3",
        title: "OpenAI drops new multi-modal model handling live audio and video",
        source_name: "Wired",
        published_at: new Date(Date.now() - 7200000).toISOString(),
        thumbnail_url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80",
        article_url: "#"
    },
    {
        id: "mock-4",
        title: "Global markets rally as tech stocks hit all-time highs",
        source_name: "Bloomberg",
        published_at: new Date(Date.now() - 10800000).toISOString(),
        thumbnail_url: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80",
        article_url: "#"
    },
    {
        id: "mock-5",
        title: "New study shows remote work increases developer productivity by 25%",
        source_name: "Forbes",
        published_at: new Date(Date.now() - 14400000).toISOString(),
        thumbnail_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
        article_url: "#"
    }
];

export const getTrendingNews = async (req, res) => {
    try {
        const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
        const now = Date.now();

        if (newsCache.data && newsCache.timestamp && (now - newsCache.timestamp < CACHE_DURATION_MS)) {
            console.log("Serving news from cache");
            return res.json({ success: true, articles: newsCache.data });
        }

        const apiKey = process.env.NEWS_API_KEY;
        
        if (!apiKey) {
            console.log("No NEWS_API_KEY provided. Serving fallback mock data.");
            newsCache.data = fallbackNews;
            newsCache.timestamp = now;
            return res.json({ success: true, articles: fallbackNews });
        }

        // Fetch from NewsAPI
        const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&category=technology&apiKey=${apiKey}`);
        
        if (response.data && response.data.articles) {
            // Normalize data
            const normalizedData = response.data.articles.filter(a => a.title && a.title !== '[Removed]').map(article => ({
                id: article.url || Math.random().toString(36).substring(7),
                title: article.title,
                source_name: article.source?.name || "Unknown Source",
                published_at: article.publishedAt,
                thumbnail_url: article.urlToImage || null,
                article_url: article.url || "#"
            }));

            // Only cache and return if we have valid articles
            if (normalizedData.length > 0) {
                newsCache.data = normalizedData;
                newsCache.timestamp = now;
                return res.json({ success: true, articles: normalizedData });
            }
        }

        // If something went wrong but didn't throw, use fallback
        return res.json({ success: true, articles: fallbackNews });

    } catch (error) {
        console.error("Error fetching trending news:", error.message);
        // Fallback on error to ensure hackathon demo doesn't break
        return res.json({ success: true, articles: fallbackNews });
    }
};
