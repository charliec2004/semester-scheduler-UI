/**
 * Scheduler Download Page Script
 * Fetches latest release from GitHub API and populates download links
 * @version 1.0.3
 */

(function() {
  'use strict';

  const REPO_OWNER = 'charliec2004';
  const REPO_NAME = 'semester-scheduler-UI';
  const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;

  // Asset name patterns for each platform
  // Patterns use .* to match ANY version format (1.0.0, 1.0.0-beta.1, 10.0.0, etc.)
  // 
  // Expected file naming (from electron-builder.yml):
  //   macOS: Scheduler-{version}-{arch}-mac.dmg, Scheduler-{version}-{arch}-mac.zip
  //   Windows: Scheduler-{version}-x64-win.exe, Scheduler-{version}-x64-win.zip
  //   Linux: Scheduler-{version}-x64.AppImage, semester-scheduler_{version}_amd64.deb
  const ASSET_PATTERNS = {
    // macOS - files have -mac suffix
    'mac-arm64-dmg': /Scheduler-.*-arm64(-mac)?\.dmg$/i,
    'mac-x64-dmg': /Scheduler-.*-x64(-mac)?\.dmg$/i,
    'mac-arm64-zip': /Scheduler-.*-arm64-mac\.zip$/i,
    'mac-x64-zip': /Scheduler-.*-x64-mac\.zip$/i,
    
    // Windows - files have -win suffix
    'win-installer': /Scheduler-.*-x64-win\.exe$|Scheduler[.\-]?Setup[.\-]?.*\.exe$/i,
    'win-portable': /Scheduler-.*-x64-win\.zip$/i,
    
    // Linux - standard naming
    'linux-appimage': /Scheduler-.*\.AppImage$/i,
    'linux-deb': /semester-scheduler_.*_amd64\.deb$/i,
    
    // Checksums
    'checksums': /SHA256SUMS\.txt$/i
  };

  /**
   * Format file size in human-readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Format date for display
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date
   */
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Find asset matching a pattern
   * @param {Array} assets - Release assets array
   * @param {RegExp} pattern - Pattern to match
   * @returns {Object|null} Matching asset or null
   */
  function findAsset(assets, pattern) {
    return assets.find(asset => pattern.test(asset.name)) || null;
  }

  /**
   * Enable a download link with asset info
   * @param {string} id - Element ID
   * @param {Object} asset - GitHub asset object
   */
  function enableLink(id, asset) {
    const link = document.getElementById(id);
    if (!link || !asset) return;

    link.href = asset.browser_download_url;
    link.classList.remove('disabled');
    link.removeAttribute('aria-disabled');

    // Update size indicator if exists
    const sizeEl = document.getElementById(id + '-size');
    if (sizeEl) {
      sizeEl.textContent = formatSize(asset.size);
    }
  }

  /**
   * Show toast notification
   * @param {string} message - Message to display
   */
  function showToast(message) {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Remove after delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  /**
   * Fetch and display release information
   */
  async function fetchRelease() {
    const versionBadge = document.getElementById('version-badge');
    const releaseDate = document.getElementById('release-date');
    const errorState = document.getElementById('error-state');
    const checksumsSection = document.getElementById('checksums-section');
    const checksumsContent = document.getElementById('checksums-content');

    try {
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        if (response.status === 404) {
          // No releases yet
          versionBadge.textContent = 'No releases yet';
          releaseDate.textContent = 'Coming soon!';
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const release = await response.json();
      const assets = release.assets || [];

      // Update version info
      versionBadge.textContent = release.tag_name || release.name;
      releaseDate.textContent = `Released ${formatDate(release.published_at)}`;

      // Enable download links for found assets
      for (const [id, pattern] of Object.entries(ASSET_PATTERNS)) {
        if (id === 'checksums') continue;
        const asset = findAsset(assets, pattern);
        if (asset) {
          enableLink(id, asset);
        }
      }

      // Handle checksums
      const checksumsAsset = findAsset(assets, ASSET_PATTERNS.checksums);
      if (checksumsAsset) {
        try {
          const checksumsResponse = await fetch(checksumsAsset.browser_download_url);
          if (checksumsResponse.ok) {
            const checksumsText = await checksumsResponse.text();
            checksumsContent.textContent = checksumsText.trim();
            checksumsSection.hidden = false;

            // Copy button handler
            const copyBtn = document.getElementById('copy-checksums');
            if (copyBtn) {
              copyBtn.addEventListener('click', async () => {
                try {
                  await navigator.clipboard.writeText(checksumsText.trim());
                  showToast('Checksums copied to clipboard!');
                } catch (err) {
                  // Fallback for older browsers
                  const textarea = document.createElement('textarea');
                  textarea.value = checksumsText.trim();
                  document.body.appendChild(textarea);
                  textarea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textarea);
                  showToast('Checksums copied to clipboard!');
                }
              });
            }
          }
        } catch (e) {
          // Checksums fetch failed, hide section
          console.warn('Could not fetch checksums:', e);
        }
      }

      // Remove loading state
      document.body.classList.remove('loading');

    } catch (error) {
      console.error('Failed to fetch release:', error);
      
      // Show error state, hide platforms
      document.querySelectorAll('.platform-card').forEach(card => {
        card.style.opacity = '0.5';
      });
      errorState.hidden = false;
      versionBadge.textContent = 'Error loading';
      
      document.body.classList.remove('loading');
    }
  }

  /**
   * Detect user's OS and highlight relevant card
   */
  function highlightUserPlatform() {
    const ua = navigator.userAgent.toLowerCase();
    let platform = null;

    if (ua.includes('mac')) {
      platform = 'macos-card';
    } else if (ua.includes('win')) {
      platform = 'windows-card';
    } else if (ua.includes('linux')) {
      platform = 'linux-card';
    }

    if (platform) {
      const card = document.getElementById(platform);
      if (card) {
        card.style.borderColor = 'var(--accent)';
        card.style.boxShadow = '0 0 0 1px var(--accent)';
      }
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    document.body.classList.add('loading');
    highlightUserPlatform();
    fetchRelease();
  }
})();
