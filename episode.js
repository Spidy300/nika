export class EpisodeManager {
    static providers = [
        {
            name: 'animefox',
            displayName: 'AnimeFox',
            infoUrl: 'https://api.consumet.org/anime/animefox/info',
            watchUrl: 'https://api.consumet.org/anime/animefox/watch',
            searchUrl: 'https://animefox.tv/search?q='
        },
        {
            name: 'gogoanime',
            displayName: 'Gogoanime',
            infoUrl: 'https://api.consumet.org/anime/gogoanime/info',
            watchUrl: 'https://api.consumet.org/anime/gogoanime/watch',
            searchUrl: 'https://gogoanime3.co/search.html?keyword='
        }
    ];
    // ... rest of the code
}