export async function fetchAnimeEpisodes(animeId) {
    try {
        const response = await fetch(`https://api.consumet.org/anime/animefox/info?id=${animeId}`);
        if (!response.ok) throw new Error('Failed to fetch episodes');
        
        const data = await response.json();
        return {
            episodes: data.episodes || [],
            provider: 'animefox'
        };
    } catch (error) {
        console.error('Error fetching anime episodes:', error);
        throw error;
    }
}

export async function fetchStreamingLinks(episodeId) {
    try {
        const response = await fetch(`https://api.consumet.org/anime/animefox/watch?episodeId=${episodeId}`);
        if (!response.ok) throw new Error('Failed to fetch streaming links');
        
        const data = await response.json();
        return data.sources || [];
    } catch (error) {
        console.error('Error fetching streaming links:', error);
        throw error;
    }
}