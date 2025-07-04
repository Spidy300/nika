export class EpisodeManager {
    static providers = [
        {
            name: 'animefox',
            infoUrl: 'https://api.consumet.org/anime/animefox/info',
            watchUrl: 'https://api.consumet.org/anime/animefox/watch'
        },
        {
            name: 'gogoanime',
            infoUrl: 'https://api.consumet.org/anime/gogoanime/info',
            watchUrl: 'https://api.consumet.org/anime/gogoanime/watch'
        }
    ];

    static async fetchEpisodes(animeId, providerIndex = 0) {
        const provider = this.providers[providerIndex];
        try {
            const response = await fetch(`${provider.infoUrl}?id=${animeId}`);
            const data = await response.json();
            return {
                episodes: data.episodes || [],
                provider: provider.name
            };
        } catch (error) {
            console.error(`Failed with ${provider.name}:`, error);
            if (providerIndex < this.providers.length - 1) {
                return this.fetchEpisodes(animeId, providerIndex + 1);
            }
            throw new Error('All providers failed');
        }
    }

    static async fetchStreamingLinks(episodeId, providerIndex = 0) {
        const provider = this.providers[providerIndex];
        try {
            const response = await fetch(`${provider.watchUrl}?episodeId=${episodeId}`);
            const data = await response.json();
            return data.sources || [];
        } catch (error) {
            console.error(`Failed with ${provider.name}:`, error);
            if (providerIndex < this.providers.length - 1) {
                return this.fetchStreamingLinks(episodeId, providerIndex + 1);
            }
            throw new Error('All providers failed');
        }
    }
}