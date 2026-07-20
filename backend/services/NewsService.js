import axios from 'axios';

// Fallback mock data in case all APIs fail
const fallbackNews = [
    {
        id: "mock-1",
        title: "Chandrayaan-4 mission receives green light from ISRO for 2026 launch",
        source_name: "ISRO News",
        published_at: new Date().toISOString(),
        thumbnail_url: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?w=800&q=80",
        article_url: "#"
    },
    {
        id: "mock-2",
        title: "RBI announces new digital currency pilot for retail transactions",
        source_name: "Financial Express",
        published_at: new Date(Date.now() - 3600000).toISOString(),
        thumbnail_url: "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&q=80",
        article_url: "#"
    },
    {
        id: "mock-3",
        title: "Tata Motors unveils new lineup of affordable EV models for Indian market",
        source_name: "AutoCar India",
        published_at: new Date(Date.now() - 7200000).toISOString(),
        thumbnail_url: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800&q=80",
        article_url: "#"
    },
    {
        id: "mock-4",
        title: "Sensex hits fresh all-time high as IT and Banking sectors rally",
        source_name: "Moneycontrol",
        published_at: new Date(Date.now() - 10800000).toISOString(),
        thumbnail_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
        article_url: "#"
    },
    {
        id: "mock-5",
        title: "Bengaluru startups see 40% surge in early-stage funding this quarter",
        source_name: "YourStory",
        published_at: new Date(Date.now() - 14400000).toISOString(),
        thumbnail_url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
        article_url: "#"
    }
];

export const fetchNewsCascade = async () => {
    // Attempt 1: Currents API (Primary)
    if (process.env.CURRENTS_API_KEY) {
        try {
            const response = await axios.get(`https://api.currentsapi.services/v1/latest-news?country=IN&language=en&apiKey=${process.env.CURRENTS_API_KEY}`, { timeout: 5000 });
            if (response.data && response.data.news) {
                const normalized = response.data.news.map(article => ({
                    id: article.id || Math.random().toString(36).substring(7),
                    title: article.title,
                    source_name: article.author || "Currents News",
                    published_at: article.published,
                    thumbnail_url: article.image && article.image !== "None" ? article.image : null,
                    article_url: article.url || "#"
                }));
                if (normalized.length > 0) return { source: 'Currents', articles: normalized };
            }
        } catch (err) {
            console.warn("Currents API failed:", err.message);
        }
    }

    // Attempt 2: NewsData.io (Fallback)
    if (process.env.NEWSDATA_API_KEY) {
        try {
            const response = await axios.get(`https://newsdata.io/api/1/news?country=in&language=en&apikey=${process.env.NEWSDATA_API_KEY}`, { timeout: 5000 });
            if (response.data && response.data.results) {
                const normalized = response.data.results.map(article => ({
                    id: article.article_id || Math.random().toString(36).substring(7),
                    title: article.title,
                    source_name: article.source_id || "NewsData",
                    published_at: article.pubDate,
                    thumbnail_url: article.image_url || null,
                    article_url: article.link || "#"
                }));
                if (normalized.length > 0) return { source: 'NewsData.io', articles: normalized };
            }
        } catch (err) {
            console.warn("NewsData API failed:", err.message);
        }
    }

    // Fallback Mock Data
    console.warn("All external news APIs failed or keys missing. Using hardcoded Indian News fallback.");
    return { source: 'Mock Fallback', articles: fallbackNews };
};
