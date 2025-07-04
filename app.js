// ======================
// DOM Elements
// ======================
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
const providerBadge = document.getElementById('provider-badge');

// ======================
// Configuration
// ======================
const CONFIG = {
  providers: {
    animefox: {
      infoUrl: 'https://api.consumet.org/anime/animefox/info',
      watchUrl: 'https://api.consumet.org/anime/animefox/watch',
      displayName: 'AnimeFox'
    },
    gogoanime: {
      infoUrl: 'https://api.consumet.org/anime/gogoanime/info',
      watchUrl: 'https://api.consumet.org/anime/gogoanime/watch',
      displayName: 'Gogoanime'
    }
  },
  defaultProvider: 'animefox',
  fallbackProvider: 'gogoanime'
};

// ======================
// State Management
// ======================
let appState = {
  currentAnime: null,
  currentEpisode: null,
  currentProvider: CONFIG.defaultProvider
};

// ======================
// Core Functions
// ======================

// Initialize the app
function init() {
  fetchTrendingAnime();
  fetchPopularAnime();
  setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
  searchBtn.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  closeBtn.addEventListener('click', closePlayer);
  window.addEventListener('click', (e) => {
    if (e.target === playerModal) closePlayer();
  });
}

// Close video player
function closePlayer() {
  playerModal.style.display = 'none';
  const video = animePlayer.querySelector('video');
  if (video) {
    video.pause();
    video.src = '';
  }
}

// ======================
// API Functions
// ======================

// Fetch anime info from provider
async function fetchAnimeInfo(animeId, provider = appState.currentProvider) {
  try {
    showLoading('Loading anime info...');
    const response = await fetch(`${CONFIG.providers[provider].infoUrl}?id=${animeId}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch anime info from ${provider}:`, error);
    throw error;
  }
}

// Fetch streaming links from provider
async function fetchStreamingLinks(episodeId, provider = appState.currentProvider) {
  try {
    showLoading('Loading video source...');
    const response = await fetch(`${CONFIG.providers[provider].watchUrl}?episodeId=${episodeId}`);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.sources || data.sources.length === 0) {
      throw new Error('No streaming sources available');
    }
    
    return data.sources;
  } catch (error) {
    console.error(`Failed to fetch streams from ${provider}:`, error);
    throw error;
  }
}

// ======================
// Player Functions
// ======================

// Open anime player with selected anime
async function openAnimePlayer(animeId, animeTitle) {
  appState.currentAnime = { id: animeId, title: animeTitle };
  playerTitle.textContent = animeTitle;
  playerDescription.textContent = 'Loading...';
  episodeList.innerHTML = '';
  providerBadge.textContent = '';
  playerModal.style.display = 'block';

  try {
    // Try primary provider first
    const animeInfo = await fetchAnimeInfo(animeId);
    
    // Update UI with anime info
    playerDescription.innerHTML = animeInfo.description?.replace(/<br>/g, '') || 'No description available.';
    
    if (animeInfo.episodes?.length > 0) {
      displayEpisodes(animeInfo.episodes);
      loadEpisode(animeInfo.episodes[0].id);
    } else {
      createPlaceholderEpisodes(animeInfo.totalEpisodes || 12, animeId);
    }
  } catch (error) {
    console.error('Failed to load anime:', error);
    playerDescription.textContent = 'Failed to load anime info';
    createPlaceholderEpisodes(12, animeId);
    
    // Try fallback provider if available
    if (appState.currentProvider !== CONFIG.fallbackProvider) {
      try {
        appState.currentProvider = CONFIG.fallbackProvider;
        const fallbackInfo = await fetchAnimeInfo(animeId, CONFIG.fallbackProvider);
        displayEpisodes(fallbackInfo.episodes);
      } catch (fallbackError) {
        console.error('Fallback provider also failed:', fallbackError);
      }
    }
  }
}

// Load specific episode
async function loadEpisode(episodeId) {
  appState.currentEpisode = episodeId;
  
  try {
    const sources = await fetchStreamingLinks(episodeId);
    setupVideoPlayer(sources, episodeId);
  } catch (error) {
    console.error('Failed to load episode:', error);
    
    // Try fallback provider if available
    if (appState.currentProvider !== CONFIG.fallbackProvider) {
      try {
        appState.currentProvider = CONFIG.fallbackProvider;
        providerBadge.textContent = CONFIG.providers[CONFIG.fallbackProvider].displayName;
        const sources = await fetchStreamingLinks(episodeId, CONFIG.fallbackProvider);
        setupVideoPlayer(sources, episodeId);
      } catch (fallbackError) {
        console.error('Fallback provider also failed:', fallbackError);
        showError(`
          Failed to load episode from all sources.
          <div class="fallback-actions">
            <button onclick="window.open('https://animefox.tv/search?q=${encodeURIComponent(appState.currentAnime.title)}', '_blank')">
              Try on AnimeFox
            </button>
            <button onclick="loadEpisode('${episodeId}')">
              Retry
            </button>
          </div>
        `);
      }
    } else {
      showError(`
        Failed to load episode. Please try again later.
        <button onclick="loadEpisode('${episodeId}')">Retry</button>
      `);
    }
  }
}

// Set up video player with sources
function setupVideoPlayer(sources, episodeId) {
  // Clear player
  animePlayer.innerHTML = '';
  
  // Create video element
  const videoElement = document.createElement('video');
  videoElement.controls = true;
  videoElement.autoplay = true;
  videoElement.className = 'video-player';
  
  // Find best source (prefer HLS)
  const hlsSource = sources.find(source => source.url.includes('.m3u8'));
  const mp4Source = sources.find(source => source.url.includes('.mp4'));
  const selectedSource = hlsSource || mp4Source || sources[0];
  
  if (selectedSource.url.includes('.m3u8') && Hls.isSupported()) {
    // HLS.js setup
    const hls = new Hls();
    hls.loadSource(selectedSource.url);
    hls.attachMedia(videoElement);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      videoElement.play().catch(err => {
        console.log('Autoplay blocked, trying muted...');
        videoElement.muted = true;
        videoElement.play();
      });
    });
  } else {
    // Standard MP4 or native HLS
    videoElement.src = selectedSource.url;
    videoElement.addEventListener('loadeddata', () => {
      videoElement.play().catch(err => {
        videoElement.muted = true;
        videoElement.play();
      });
    });
  }
  
  // Add to DOM
  animePlayer.appendChild(videoElement);
  
  // Highlight selected episode
  document.querySelectorAll('.episode-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.episodeId === episodeId) {
      btn.classList.add('active');
    }
  });
  
  // Error handling
  videoElement.addEventListener('error', () => {
    showError('Playback error. Trying fallback...');
    if (appState.currentProvider !== CONFIG.fallbackProvider) {
      loadEpisode(episodeId, CONFIG.fallbackProvider);
    }
  });
}

// ======================
// UI Functions
// ======================

// Display episodes list
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

// Create placeholder episodes
function createPlaceholderEpisodes(count, animeId) {
  episodeList.innerHTML = '';
  
  for (let i = 1; i <= count; i++) {
    const episodeBtn = document.createElement('button');
    episodeBtn.className = 'episode-btn';
    episodeBtn.textContent = `Ep ${i}`;
    episodeBtn.dataset.episodeNum = i;
    episodeBtn.addEventListener('click', () => {
      loadEpisode(`${animeId}-episode-${i}`);
    });
    episodeList.appendChild(episodeBtn);
  }
}

// Show loading state
function showLoading(message) {
  animePlayer.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

// Show error state
function showError(message) {
  animePlayer.innerHTML = `
    <div class="error-state">
      ${message}
    </div>
  `;
}

// ======================
// Search Functions
// ======================

// Fetch trending anime
async function fetchTrendingAnime() {
  try {
    trendingAnimeGrid.innerHTML = '<div class="loading">Loading trending anime...</div>';
    
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

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    displayAnimeCards(data.data.Page.media, trendingAnimeGrid);
  } catch (error) {
    trendingAnimeGrid.innerHTML = '<div class="error">Failed to load trending anime</div>';
    console.error('Error fetching trending anime:', error);
  }
}

// Fetch popular anime
async function fetchPopularAnime() {
  try {
    popularAnimeGrid.innerHTML = '<div class="loading">Loading popular anime...</div>';
    
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

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    displayAnimeCards(data.data.Page.media, popularAnimeGrid);
  } catch (error) {
    popularAnimeGrid.innerHTML = '<div class="error">Failed to load popular anime</div>';
    console.error('Error fetching popular anime:', error);
  }
}

// Handle search
async function handleSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  try {
    popularAnimeGrid.innerHTML = '<div class="loading">Searching anime...</div>';
    
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

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQuery,
        variables: { search: query }
      })
    });

    const data = await response.json();
    trendingAnimeGrid.innerHTML = '';
    popularAnimeGrid.innerHTML = '<h2>Search Results</h2>';
    displayAnimeCards(data.data.Page.media, popularAnimeGrid);
  } catch (error) {
    popularAnimeGrid.innerHTML = '<div class="error">Search failed</div>';
    console.error('Error searching anime:', error);
  }
}

// Display anime cards
function displayAnimeCards(animeList, container) {
  container.innerHTML = '';

  animeList.forEach(anime => {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.dataset.id = anime.id;

    const title = anime.title.english || anime.title.romaji;
    const coverImage = anime.coverImage?.large || 'assets/placeholder.jpg';

    card.innerHTML = `
      <img src="${coverImage}" alt="${title}" class="anime-cover">
      <div class="anime-info">
        <h3 class="anime-title">${title}</h3>
        <div class="anime-meta">
          <span>${anime.episodes || '?'} eps</span>
          <span><i class="fas fa-star"></i> 0.0</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => openAnimePlayer(anime.id, title));
    container.appendChild(card);
  });
}

// ======================
// Initialize App
// ======================
document.addEventListener('DOMContentLoaded', init);

// Make functions available globally
window.loadEpisode = loadEpisode;
window.openAnimePlayer = openAnimePlayer;