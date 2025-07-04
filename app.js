// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const trendingAnimeGrid = document.getElementById('trending-anime');
const popularAnimeGrid = document.getElementById('popular-anime');
const playerModal = document.getElementById('player-modal');
const closeBtn = document.querySelector('.close-btn');
const animePlayer = document.getElementById('anime-player');
const playerTitle = document.getElementById('player-title');
const playerDescription = document.getElementById('player-description');
const episodeList = document.getElementById('episode-list');

// Global Variables
let currentAnimeId = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    fetchTrendingAnime();
    fetchPopularAnime();
    setupEventListeners();
    
    // Add video player styles
    const videoStyles = document.createElement('style');
    videoStyles.textContent = `
        .video-player {
            width: 100%;
            max-height: 70vh;
            background: #000;
        }
        .loading-video {
            color: white;
            text-align: center;
            padding: 20px;
            background: #222;
        }
        .video-error {
            color: #ff4444;
            padding: 20px;
            text-align: center;
            background: rgba(255, 0, 0, 0.1);
        }
        .video-error button {
            background: #3498db;
            color: white;
            border: none;
            padding: 5px 10px;
            margin: 5px;
            border-radius: 3px;
            cursor: pointer;
        }
    `;
    document.head.appendChild(videoStyles);
});

// Event Listeners
function setupEventListeners() {
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    closeBtn.addEventListener('click', () => {
        playerModal.style.display = 'none';
        const video = animePlayer.querySelector('video');
        if (video) video.pause();
    });
    window.addEventListener('click', (e) => {
        if (e.target === playerModal) {
            playerModal.style.display = 'none';
            const video = animePlayer.querySelector('video');
            if (video) video.pause();
        }
    });
}

// API Functions
async function fetchTrendingAnime() {
    try {
        trendingAnimeGrid.innerHTML = '<div class="loading">Loading trending anime...</div>';
        
        const query = `
            query {
                Page(page: 1, perPage: 10) {
                    media(sort: TRENDING_DESC, type: ANIME) {
                        id
                        title {
                            romaji
                            english
                        }
                        coverImage {
                            large
                        }
                        episodes
                    }
                }
            }
        `;

        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        displayAnime(data.data.Page.media, trendingAnimeGrid);
    } catch (error) {
        console.error('Error fetching trending anime:', error);
        trendingAnimeGrid.innerHTML = '<div class="error">Failed to load trending anime</div>';
    }
}

async function fetchPopularAnime() {
    try {
        popularAnimeGrid.innerHTML = '<div class="loading">Loading popular anime...</div>';
        
        const query = `
            query {
                Page(page: 1, perPage: 10) {
                    media(sort: POPULARITY_DESC, type: ANIME) {
                        id
                        title {
                            romaji
                            english
                        }
                        coverImage {
                            large
                        }
                        episodes
                    }
                }
            }
        `;

        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query })
        });

        const data = await response.json();
        displayAnime(data.data.Page.media, popularAnimeGrid);
    } catch (error) {
        console.error('Error fetching popular anime:', error);
        popularAnimeGrid.innerHTML = '<div class="error">Failed to load popular anime</div>';
    }
}

async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    try {
        popularAnimeGrid.innerHTML = '<div class="loading">Searching anime...</div>';
        
        const searchQuery = `
            query ($search: String) {
                Page(page: 1, perPage: 10) {
                    media(search: $search, type: ANIME) {
                        id
                        title {
                            romaji
                            english
                        }
                        coverImage {
                            large
                        }
                        episodes
                    }
                }
            }
        `;

        const response = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: searchQuery,
                variables: { search: query }
            })
        });

        const data = await response.json();
        trendingAnimeGrid.innerHTML = '';
        popularAnimeGrid.innerHTML = '<h2>Search Results</h2>';
        displayAnime(data.data.Page.media, popularAnimeGrid);
    } catch (error) {
        console.error('Error searching anime:', error);
        popularAnimeGrid.innerHTML = '<div class="error">Failed to search anime</div>';
    }
}

// Display Functions
function displayAnime(animeList, container) {
    container.innerHTML = '';

    animeList.forEach(anime => {
        const animeCard = document.createElement('div');
        animeCard.className = 'anime-card';
        animeCard.dataset.id = anime.id;

        const title = anime.title.english || anime.title.romaji;
        const coverImage = anime.coverImage?.large || 'assets/placeholder.jpg';

        animeCard.innerHTML = `
            <img src="${coverImage}" alt="${title}" class="anime-cover">
            <div class="anime-info">
                <h3 class="anime-title">${title}</h3>
                <div class="anime-meta">
                    <span>${anime.episodes || '?'} eps</span>
                    <span><i class="fas fa-star"></i> 0.0</span>
                </div>
            </div>
        `;

        animeCard.addEventListener('click', () => {
            openAnimePlayer(anime.id, title);
        });

        container.appendChild(animeCard);
    });
}

async function openAnimePlayer(animeId, animeTitle) {
    currentAnimeId = animeId;
    playerTitle.textContent = animeTitle;
    playerDescription.textContent = 'Loading description...';
    episodeList.innerHTML = 'Loading episodes...';

    // Show modal immediately
    playerModal.style.display = 'block';

    try {
        // Fetch anime details
        const detailQuery = `
            query ($id: Int) {
                Media(id: $id) {
                    description
                    episodes
                }
            }
        `;

        const detailResponse = await fetch('https://graphql.anilist.co', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                query: detailQuery,
                variables: { id: animeId }
            })
        });

        const detailData = await detailResponse.json();
        const description = detailData.data?.Media?.description || 'No description available.';
        const totalEpisodes = detailData.data?.Media?.episodes || 12;

        playerDescription.innerHTML = description.replace(/<br>/g, '');

        // Try to fetch episodes
        try {
            const episodesResponse = await fetch(`https://api.consumet.org/anime/gogoanime/info/${animeId}`);
            const episodesData = await episodesResponse.json();

            if (episodesData.episodes?.length > 0) {
                displayEpisodes(episodesData.episodes);
                loadEpisode(episodesData.episodes[0].id);
            } else {
                createPlaceholderEpisodes(totalEpisodes, animeId);
            }
        } catch (episodesError) {
            console.error('Error loading episodes:', episodesError);
            createPlaceholderEpisodes(totalEpisodes, animeId);
        }
    } catch (detailError) {
        console.error('Error loading anime details:', detailError);
        playerDescription.textContent = 'Failed to load anime details. Please try again later.';
        createPlaceholderEpisodes(12, animeId);
    }
}

function createPlaceholderEpisodes(totalEpisodes, animeId) {
    episodeList.innerHTML = '';
    for (let i = 1; i <= totalEpisodes; i++) {
        const episodeBtn = document.createElement('button');
        episodeBtn.className = 'episode-btn';
        episodeBtn.textContent = `Episode ${i}`;
        episodeBtn.dataset.episodeNum = i;
        episodeBtn.addEventListener('click', () => {
            loadEpisode(`${animeId}-episode-${i}`);
        });
        episodeList.appendChild(episodeBtn);
    }
}

function displayEpisodes(episodes) {
    episodeList.innerHTML = '';
    episodes.forEach(episode => {
        const episodeBtn = document.createElement('button');
        episodeBtn.className = 'episode-btn';
        episodeBtn.textContent = `Ep ${episode.number}`;
        episodeBtn.dataset.episodeId = episode.id;
        episodeBtn.addEventListener('click', () => loadEpisode(episode.id));
        episodeList.appendChild(episodeBtn);
    });
}

async function loadEpisode(episodeId) {
    try {
        animePlayer.innerHTML = '<div class="loading-video">Loading video player...</div>';
        
        const streamResponse = await fetch(`https://api.consumet.org/anime/gogoanime/watch/${episodeId}`);
        const streamData = await streamResponse.json();

        if (streamData.sources?.length > 0) {
            // Find the best playable source
            const playableSource = streamData.sources.find(source => 
                source.url.includes('.mp4') || source.url.includes('.m3u8'));
            
            if (playableSource) {
                // Create new video element
                animePlayer.innerHTML = `
                    <video controls autoplay class="video-player">
                        Your browser does not support the video tag.
                    </video>
                `;
                
                const videoElement = animePlayer.querySelector('video');
                
                // Handle different source types
                if (playableSource.url.includes('.m3u8')) {
                    // For HLS streams
                    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                        const hls = new Hls();
                        hls.loadSource(playableSource.url);
                        hls.attachMedia(videoElement);
                        hls.on(Hls.Events.MANIFEST_PARSED, () => {
                            videoElement.play().catch(e => {
                                console.error('Autoplay failed:', e);
                                videoElement.muted = true;
                                videoElement.play();
                            });
                        });
                    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                        // For Safari/iOS
                        videoElement.src = playableSource.url;
                        videoElement.addEventListener('loadedmetadata', () => {
                            videoElement.play().catch(e => {
                                console.error('Autoplay failed:', e);
                                videoElement.muted = true;
                                videoElement.play();
                            });
                        });
                    } else {
                        throw new Error('HLS not supported in this browser');
                    }
                } else {
                    // For direct MP4 links
                    videoElement.src = playableSource.url;
                    videoElement.addEventListener('loadeddata', () => {
                        videoElement.play().catch(e => {
                            console.error('Autoplay failed:', e);
                            videoElement.muted = true;
                            videoElement.play();
                        });
                    });
                }
                
                // Highlight selected episode
                document.querySelectorAll('.episode-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.episodeId === episodeId || 
                        btn.dataset.episodeNum === episodeId.split('-').pop()) {
                        btn.classList.add('active');
                    }
                });
                
                // Error handling for video element
                videoElement.addEventListener('error', (e) => {
                    console.error('Video error:', e);
                    animePlayer.innerHTML = `
                        <div class="video-error">
                            Error playing video. 
                            <button onclick="loadEpisode('${episodeId}')">Retry</button>
                            or try another episode.
                        </div>
                    `;
                });
                
            } else {
                throw new Error('No playable video source found');
            }
        } else {
            throw new Error('No streaming sources available');
        }
    } catch (error) {
        console.error('Error loading episode:', error);
        animePlayer.innerHTML = `
            <div class="video-error">
                ${error.message}
                <button onclick="loadEpisode('${episodeId}')">Retry</button>
                or try another episode.
            </div>
        `;
    }
}