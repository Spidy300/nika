// app.js - Main Application File
import { AnimeManager } from './anime.js';
import { EpisodeManager } from './episodes.js';
import { VideoPlayer } from './player.js';

// DOM Elements
const elements = {
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    trendingAnimeGrid: document.getElementById('trending-anime'),
    popularAnimeGrid: document.getElementById('popular-anime'),
    playerModal: document.getElementById('player-modal'),
    closeBtn: document.querySelector('.close-btn'),
    animePlayer: document.getElementById('anime-player'),
    playerTitle: document.getElementById('player-title'),
    playerDescription: document.getElementById('player-description'),
    episodeList: document.getElementById('episode-list'),
    providerBadge: document.getElementById('provider-badge')
};

// App State
const state = {
    currentAnime: null,
    currentEpisode: null,
    currentProviderIndex: 0,
    retryCount: 0,
    isRetrying: false
};

// Initialize App
function init() {
    VideoPlayer.init(elements.animePlayer);
    setupEventListeners();
    loadInitialData();
    setupGlobalFunctions();
}

function setupEventListeners() {
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => e.key === 'Enter' && handleSearch());
    elements.closeBtn.addEventListener('click', closePlayer);
    window.addEventListener('click', (e) => e.target === elements.playerModal && closePlayer());
}

function setupGlobalFunctions() {
    window.retryLoading = retryLoading;
    window.openExternalSite = openExternalSite;
    window.loadEpisode = loadEpisode;
}

// Data Loading
async function loadInitialData() {
    try {
        showLoader(elements.trendingAnimeGrid, 'Loading trending anime...');
        showLoader(elements.popularAnimeGrid, 'Loading popular anime...');
        
        const [trending, popular] = await Promise.all([
            AnimeManager.fetchTrending(),
            AnimeManager.fetchPopular()
        ]);
        
        displayAnime(trending, elements.trendingAnimeGrid);
        displayAnime(popular, elements.popularAnimeGrid);
    } catch (error) {
        console.error('Initial data load failed:', error);
        showError(elements.trendingAnimeGrid, 'Failed to load anime. Pull down to refresh.');
        showError(elements.popularAnimeGrid, 'Failed to load anime. Pull down to refresh.');
    }
}

// Player Functions
async function openAnimePlayer(anime) {
    resetPlayerState();
    state.currentAnime = anime;
    elements.playerTitle.textContent = anime.title.english || anime.title.romaji;
    elements.playerModal.style.display = 'block';

    try {
        // First try to get anime info
        const animeInfo = await fetchWithRetry(
            () => AnimeManager.fetchInfo(anime.id),
            'Failed to load anime info'
        );
        
        elements.playerDescription.innerHTML = animeInfo.description?.replace(/<br>/g, '') || 'No description available.';
        
        // Then try to get episodes
        const { episodes, provider } = await fetchWithRetry(
            () => EpisodeManager.fetchEpisodes(anime.id),
            'Failed to load episodes'
        );
        
        state.currentProviderIndex = EpisodeManager.providers.findIndex(p => p.name === provider);
        
        if (episodes.length > 0) {
            displayEpisodes(episodes);
            await loadEpisode(episodes[0].id);
        } else {
            createPlaceholderEpisodes(animeInfo.totalEpisodes || 12, anime.id);
        }
    } catch (error) {
        console.error('Failed to open player:', error);
        VideoPlayer.showError(`
            <div class="error-content">
                <p>Failed to load anime data</p>
                <div class="error-actions">
                    <button onclick="retryLoading()">
                        <i class="fas fa-sync-alt"></i> Retry
                    </button>
                    <button onclick="openExternalSite()">
                        <i class="fas fa-external-link-alt"></i> Open Website
                    </button>
                </div>
            </div>
        `);
    }
}

async function loadEpisode(episodeId, providerIndex = state.currentProviderIndex) {
    if (state.isRetrying) return;
    
    state.currentEpisode = episodeId;
    state.currentProviderIndex = providerIndex;
    state.retryCount = 0;
    
    try {
        await attemptPlayback(episodeId, providerIndex);
    } catch (error) {
        handlePlaybackError(error, episodeId, providerIndex);
    }
}

async function attemptPlayback(episodeId, providerIndex) {
    const provider = EpisodeManager.providers[providerIndex];
    VideoPlayer.showLoading(`Loading from ${provider.displayName}...`);
    elements.providerBadge.textContent = provider.displayName;

    const sources = await fetchWithRetry(
        () => EpisodeManager.fetchStreamingLinks(episodeId, providerIndex),
        `Failed to load from ${provider.displayName}`
    );

    const bestSource = selectBestSource(sources);
    if (!bestSource) throw new Error('No playable sources available');

    await VideoPlayer.play(bestSource.url, episodeId, provider.name);
    highlightActiveEpisode(episodeId);
}

function handlePlaybackError(error, episodeId, providerIndex) {
    console.error(`Playback failed with ${EpisodeManager.providers[providerIndex].name}:`, error);
    
    // Try next provider if available
    const nextProviderIndex = providerIndex + 1;
    if (nextProviderIndex < EpisodeManager.providers.length) {
        return loadEpisode(episodeId, nextProviderIndex);
    }
    
    // All providers failed
    showFinalErrorState();
}

// Helper Functions
async function fetchWithRetry(fetchFn, errorMessage, maxRetries = 2, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fetchFn();
        } catch (error) {
            lastError = error;
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw new Error(`${errorMessage}. ${lastError?.message || ''}`);
}

function selectBestSource(sources) {
    return sources.find(s => s.quality === 'default') || 
           sources.find(s => s.url.includes('.m3u8')) || 
           sources[0];
}

function highlightActiveEpisode(episodeId) {
    document.querySelectorAll('.episode-btn').forEach(btn => {
        btn.classList.toggle('active', 
            btn.dataset.episodeId === episodeId || 
            btn.dataset.episodeNum === episodeId?.split('-')?.pop()
        );
    });
}

function showFinalErrorState() {
    const providersList = EpisodeManager.providers.map((p, i) => `
        <div class="provider-status ${i <= state.currentProviderIndex ? 'attempted' : ''}">
            <span>${p.displayName}</span>
            <span class="status-icon">
                ${i < state.currentProviderIndex ? '❌' : i === state.currentProviderIndex ? '⚠️' : '➡️'}
            </span>
        </div>
    `).join('');

    VideoPlayer.showError(`
        <div class="error-content">
            <p>Couldn't load episode from any provider</p>
            <div class="providers-tried">
                ${providersList}
            </div>
            <div class="error-actions">
                <button class="retry-btn" onclick="retryLoading()">
                    <i class="fas fa-sync-alt"></i> Retry All
                </button>
                <button class="external-btn" onclick="openExternalSite()">
                    <i class="fas fa-external-link-alt"></i> Try on Website
                </button>
            </div>
        </div>
    `);
}

function retryLoading() {
    if (!state.currentAnime || state.isRetrying) return;
    
    state.isRetrying = true;
    VideoPlayer.showLoading('Retrying...');
    
    setTimeout(async () => {
        try {
            await openAnimePlayer(state.currentAnime);
        } finally {
            state.isRetrying = false;
        }
    }, 1000);
}

function openExternalSite() {
    if (!state.currentAnime) return;
    
    const provider = EpisodeManager.providers[state.currentProviderIndex];
    const searchUrl = provider.searchUrl || `https://www.google.com/search?q=${encodeURIComponent(state.currentAnime.title.english || state.currentAnime.title.romaji + ' anime')}`;
    window.open(searchUrl, '_blank');
}

function resetPlayerState() {
    state.currentAnime = null;
    state.currentEpisode = null;
    state.currentProviderIndex = 0;
    state.retryCount = 0;
    elements.playerDescription.textContent = 'Loading...';
    elements.episodeList.innerHTML = '';
    elements.providerBadge.textContent = '';
    VideoPlayer.clear();
}

function closePlayer() {
    elements.playerModal.style.display = 'none';
    VideoPlayer.clear();
}

// Initialize the app
document.addEventListener('DOMContentLoaded', init);