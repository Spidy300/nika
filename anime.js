export class AnimeManager {
    static async fetchTrending() {
        const query = `{
            Page(page: 1, perPage: 10) {
                media(sort: TRENDING_DESC, type: ANIME) {
                    id
                    title { romaji english }
                    coverImage { large }
                    episodes
                }
            }
        }`;

        const response = await this._fetchAniList(query);
        return response.data.Page.media;
    }

    static async fetchPopular() {
        const query = `{
            Page(page: 1, perPage: 10) {
                media(sort: POPULARITY_DESC, type: ANIME) {
                    id
                    title { romaji english }
                    coverImage { large }
                    episodes
                }
            }
        }`;

        const response = await this._fetchAniList(query);
        return response.data.Page.media;
    }

    static async search(query) {
        const searchQuery = `query ($search: String) {
            Page(page: 1, perPage: 10) {
                media(search: $search, type: ANIME) {
                    id
                    title { romaji english }
                    coverImage { large }
                    episodes
                }
            }
        }`;

        const response = await this._fetchAniList(searchQuery, { search: query });
        return response.data.Page.media;
    }

    static async fetchInfo(animeId) {
        const query = `query ($id: Int) {
            Media(id: $id) {
                description
                episodes
            }
        }`;

        const response = await this._fetchAniList(query, { id: animeId });
        return response.data.Media;
    }

    static async _fetchAniList(query, variables = {}) {
        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables })
        });
        return await response.json();
    }
}