export class VideoPlayer {
    static init(playerElement) {
        this.player = playerElement;
        this.currentHls = null;
    }

    static async play(sourceUrl, episodeId, providerName) {
        this.clear();

        const videoElement = document.createElement('video');
        videoElement.controls = true;
        videoElement.className = 'video-player';
        this.player.appendChild(videoElement);

        document.getElementById('provider-badge').textContent = providerName;

        if (sourceUrl.includes('.m3u8')) {
            if (Hls.isSupported()) {
                this.currentHls = new Hls();
                this.currentHls.loadSource(sourceUrl);
                this.currentHls.attachMedia(videoElement);
                this.currentHls.on(Hls.Events.MANIFEST_PARSED, () => {
                    this._attemptPlay(videoElement);
                });
            } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                videoElement.src = sourceUrl;
                videoElement.addEventListener('loadedmetadata', () => {
                    this._attemptPlay(videoElement);
                });
            } else {
                throw new Error('HLS not supported');
            }
        } else {
            videoElement.src = sourceUrl;
            videoElement.addEventListener('loadeddata', () => {
                this._attemptPlay(videoElement);
            });
        }

        videoElement.addEventListener('error', () => {
            this.showError(`Playback failed (${providerName})`, [
                { text: 'Retry', action: `VideoPlayer.retry('${episodeId}')` }
            ]);
        });
    }

    static _attemptPlay(videoElement) {
        videoElement.play()
            .catch(() => {
                videoElement.muted = true;
                videoElement.play();
            });
    }

    static showLoading(message) {
        this.player.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }

    static showError(message, buttons = []) {
        this.player.innerHTML = `
            <div class="error-state">
                <p>${message}</p>
                ${buttons.map(btn => `
                    <button onclick="${btn.action}">${btn.text}</button>
                `).join('')}
            </div>
        `;
    }

    static clear() {
        if (this.currentHls) {
            this.currentHls.destroy();
            this.currentHls = null;
        }
        this.player.innerHTML = '';
    }

    static retry(episodeId) {
        // This will be implemented in app.js
        console.log('Retrying episode:', episodeId);
    }
}