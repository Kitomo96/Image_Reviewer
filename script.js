class ImageEvaluator {
    constructor() {
        // State management
        this.images = [];
        this.currentIndex = 0;
        this.reviewHistory = [];
        this.resumeUrl = '';
        this.preloadedCards = new Map(); // Track preloaded cards
        
        // DOM elements
        this.initialScreen = document.getElementById('initial-screen');
        this.reviewScreen = document.getElementById('review-screen');
        this.completionScreen = document.getElementById('completion-screen');
        this.getImagesBtn = document.getElementById('get-images-btn');
        this.folderInput = document.getElementById('folder-id-input');
        this.folderInputSection = document.getElementById('folder-input-section');
        this.loadingEl = document.getElementById('loading');
        this.errorMessageEl = document.getElementById('error-message');
        this.cardContainer = document.getElementById('card-container');
        this.currentImageEl = document.getElementById('current-image');
        this.totalImagesEl = document.getElementById('total-images');
        this.undoBtn = document.getElementById('undo-btn');
        this.approveBtn = document.getElementById('approve-btn');
        this.disapproveBtn = document.getElementById('disapprove-btn');
        this.approvedCountEl = document.getElementById('approved-count');
        this.disapprovedCountEl = document.getElementById('disapproved-count');
        this.goBackBtn = document.getElementById('go-back-btn');
        this.submitReviewBtn = document.getElementById('submit-review-btn');
        
        // Drag state
        this.isDragging = false;
        this.startX = 0;
        this.currentX = 0;
        this.dragThreshold = 100;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.extractFolderIdFromUrl();
    }
    
    setupEventListeners() {
        // Initial screen
        this.getImagesBtn.addEventListener('click', () => this.fetchImages());
        
        // Review screen
        this.approveBtn.addEventListener('click', () => this.approveImage());
        this.disapproveBtn.addEventListener('click', () => this.disapproveImage());
        this.undoBtn.addEventListener('click', () => this.undoLastAction());
        
        // Completion screen
        this.goBackBtn.addEventListener('click', () => this.goBackToLastImage());
        this.submitReviewBtn.addEventListener('click', () => this.submitReview());
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyboardInput(e));
        
        // Mouse/touch events for swiping will be added dynamically to cards
    }
    
    extractFolderIdFromUrl() {
        // Extract folder ID from URL path (e.g., http://domain/{folder_id})
        const path = window.location.pathname;
        this.folderId = path.substring(1); // Remove leading slash
        
        // Check if we're running as a file:// URL (local development)
        const isFileProtocol = window.location.protocol === 'file:';
        
        if (!this.folderId || isFileProtocol) {
            // Show input field for manual folder ID entry
            this.folderInputSection.classList.remove('hidden');
            this.getImagesBtn.disabled = false;
            
            // If we have a folder ID from URL, pre-fill the input
            if (this.folderId && !isFileProtocol) {
                this.folderInput.value = this.folderId;
            }
            
            // Update button to use input value
            this.getImagesBtn.addEventListener('click', () => {
                const inputId = this.folderInput.value.trim();
                if (inputId) {
                    this.folderId = inputId;
                    this.fetchImages();
                } else {
                    this.showError('Please enter a Google Drive folder ID');
                }
            });
            
            // Allow Enter key to trigger fetch
            this.folderInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const inputId = this.folderInput.value.trim();
                    if (inputId) {
                        this.folderId = inputId;
                        this.fetchImages();
                    }
                }
            });
            
        } else {
            // Use URL-based folder ID
            this.folderInputSection.classList.add('hidden');
            this.getImagesBtn.disabled = false;
        }
    }
    
    async fetchImages() {
        if (!this.folderId) {
            this.showError('No folder ID available');
            return;
        }
        
        this.showLoading(true);
        this.hideError();
        
        try {
            const response = await fetch('https://n8n.jacopogomarasca.it/webhook-test/7c46aa4d-1163-49f2-85f3-0e4c3dcc74f0', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    folderId: this.folderId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.assets || !Array.isArray(data.assets)) {
                throw new Error('Invalid response format: missing assets array');
            }
            
            // Initialize image objects with status
            this.images = data.assets.map(asset => ({
                ...asset,
                status: 'undecided'
            }));
            
            this.resumeUrl = data.resumeUrl || '';
            this.currentIndex = 0;
            this.reviewHistory = [];
            
            if (this.images.length === 0) {
                throw new Error('No images found in the specified folder');
            }
            
            this.showLoading(false);
            this.startReview();
            
        } catch (error) {
            this.showLoading(false);
            this.showError(`Failed to fetch images: ${error.message}`);
            console.error('Fetch error:', error);
        }
    }
    
    startReview() {
        this.switchToScreen('review');
        this.renderImages();
        this.preloadNextImages();
        this.updateProgress();
        this.updateUndoButton();
    }
    
    renderImages() {
        this.cardContainer.innerHTML = '';
        
        this.cardContainer.innerHTML = '';
        
        // Render visible cards (current + next few for stacking effect)
        const visibleCards = 4;
        for (let i = 0; i < Math.min(visibleCards, this.images.length - this.currentIndex); i++) {
            const imageIndex = this.currentIndex + i;
            const image = this.images[imageIndex];
            
            // Check if we have a preloaded card
            let card = this.preloadedCards.get(imageIndex);
            
            if (!card) {
                // Create new card if not preloaded
                card = this.createImageCard(image, i === 0);
            } else {
                // Use preloaded card and update swipe handlers
                if (i === 0) {
                    this.addSwipeHandlers(card);
                }
                // Remove from preloaded map since it's now visible
                this.preloadedCards.delete(imageIndex);
            }
            
            this.cardContainer.appendChild(card);
        }
        
        // Preload next images after rendering current ones
        this.preloadNextImages();
    }
    
    preloadNextImages() {
        const preloadBuffer = 3; // Preload next 3 images
        
        for (let i = 1; i <= preloadBuffer; i++) {
            const preloadIndex = this.currentIndex + i;
            
            // Skip if index is out of bounds or already preloaded
            if (preloadIndex >= this.images.length || this.preloadedCards.has(preloadIndex)) {
                continue;
            }
            
            const image = this.images[preloadIndex];
            const preloadCard = this.createImageCard(image, false);
            
            // Hide preloaded card (position off-screen)
            preloadCard.style.position = 'absolute';
            preloadCard.style.left = '-9999px';
            preloadCard.style.top = '0';
            
            // Add to DOM to trigger loading, but keep hidden
            this.cardContainer.appendChild(preloadCard);
            
            // Store in preloaded cards map
            this.preloadedCards.set(preloadIndex, preloadCard);
        }
        
        // Clean up preloaded cards that are no longer needed
        this.cleanupPreloadedCards();
    }
    
    cleanupPreloadedCards() {
        const currentRangeStart = this.currentIndex;
        const currentRangeEnd = this.currentIndex + 6; // Keep buffer of 6 cards
        
        for (const [index, card] of this.preloadedCards.entries()) {
            if (index < currentRangeStart || index > currentRangeEnd) {
                // Remove card from DOM and map
                if (card.parentNode) {
                    card.parentNode.removeChild(card);
                }
                this.preloadedCards.delete(index);
            }
        }
    }
    
    createImageCard(image, isTopCard) {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.dataset.imageId = image.id;
        
        // Set thumbnail as background with blur effect
        if (image.thumbUrl) {
            card.style.backgroundImage = `url('${image.thumbUrl}')`;
            card.style.backgroundSize = 'cover';
            card.style.backgroundPosition = 'center';
            card.style.filter = 'blur(5px)';
        }
        
        const iframe = document.createElement('iframe');
        iframe.src = image.embedUrl;
        iframe.className = 'image-iframe';
        iframe.style.pointerEvents = 'none'; // Critical for swipe interaction
        iframe.style.opacity = '0'; // Start invisible
        
        // Add load event listener for smooth fade-in
        iframe.addEventListener('load', () => {
            iframe.style.opacity = '1';
            // Remove blur from background when iframe loads
            card.style.filter = 'none';
        });
        
        card.appendChild(iframe);
        
        // Add swipe handlers only to the top card
        if (isTopCard) {
            this.addSwipeHandlers(card);
        }
        
        return card;
    }
    
    addSwipeHandlers(card) {
        // Mouse events
        card.addEventListener('mousedown', (e) => this.handleStart(e, e.clientX));
        document.addEventListener('mousemove', (e) => this.handleMove(e, e.clientX));
        document.addEventListener('mouseup', () => this.handleEnd());
        
        // Touch events
        card.addEventListener('touchstart', (e) => this.handleStart(e, e.touches[0].clientX));
        document.addEventListener('touchmove', (e) => this.handleMove(e, e.touches[0].clientX));
        document.addEventListener('touchend', () => this.handleEnd());
        
        // Prevent default drag behavior
        card.addEventListener('dragstart', (e) => e.preventDefault());
    }
    
    handleStart(e, clientX) {
        this.isDragging = true;
        this.startX = clientX;
        this.currentX = clientX;
        
        const card = e.currentTarget;
        card.style.transition = 'none';
    }
    
    handleMove(e, clientX) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        this.currentX = clientX;
        const deltaX = this.currentX - this.startX;
        
        const topCard = this.cardContainer.querySelector('.image-card');
        if (topCard) {
            const rotation = deltaX * 0.1;
            topCard.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
            
            // Visual feedback
            if (Math.abs(deltaX) > this.dragThreshold) {
                if (deltaX > 0) {
                    topCard.classList.add('swiping-right');
                    topCard.classList.remove('swiping-left');
                } else {
                    topCard.classList.add('swiping-left');
                    topCard.classList.remove('swiping-right');
                }
            } else {
                topCard.classList.remove('swiping-right', 'swiping-left');
            }
        }
    }
    
    handleEnd() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        const deltaX = this.currentX - this.startX;
        const topCard = this.cardContainer.querySelector('.image-card');
        
        if (topCard) {
            topCard.style.transition = '';
            topCard.classList.remove('swiping-right', 'swiping-left');
            
            if (Math.abs(deltaX) > this.dragThreshold) {
                // Determine swipe direction and act accordingly
                if (deltaX > 0) {
                    this.approveImage();
                } else {
                    this.disapproveImage();
                }
            } else {
                // Snap back to center
                topCard.style.transform = '';
            }
        }
    }
    
    approveImage() {
        this.processImageDecision('approved');
    }
    
    disapproveImage() {
        this.processImageDecision('not approved');
    }
    
    processImageDecision(status) {
        if (this.currentIndex >= this.images.length) return;
        
        // Save to history for undo functionality
        this.reviewHistory.push({
            index: this.currentIndex,
            previousStatus: this.images[this.currentIndex].status
        });
        
        // Update image status
        this.images[this.currentIndex].status = status;
        
        // Animate card away
        const topCard = this.cardContainer.querySelector('.image-card');
        if (topCard) {
            if (status === 'approved') {
                topCard.classList.add('swiped-right');
            } else {
                topCard.classList.add('swiped-left');
            }
            
            // Remove card after animation
            setTimeout(() => {
                if (topCard.parentNode) {
                    topCard.parentNode.removeChild(topCard);
                }
            }, 500);
        }
        
        // Move to next image
        this.currentIndex++;
        
        // Update UI
        setTimeout(() => {
            if (this.currentIndex >= this.images.length) {
                this.showCompletionScreen();
            } else {
                this.renderImages();
                this.updateProgress();
            }
            this.updateUndoButton();
        }, 200);
    }
    
    undoLastAction() {
        if (this.reviewHistory.length === 0) return;
        
        const lastAction = this.reviewHistory.pop();
        
        // If we're at completion screen, go back to review
        if (this.currentIndex >= this.images.length) {
            this.switchToScreen('review');
        }
        
        // Restore previous state
        this.currentIndex = lastAction.index;
        this.images[this.currentIndex].status = lastAction.previousStatus;
        
        // Re-render
        this.renderImages();
        this.updateProgress();
        this.updateUndoButton();
    }
    
    goBackToLastImage() {
        this.undoLastAction();
    }
    
    updateProgress() {
        this.currentImageEl.textContent = this.currentIndex + 1;
        this.totalImagesEl.textContent = this.images.length;
    }
    
    updateUndoButton() {
        this.undoBtn.disabled = this.reviewHistory.length === 0;
    }
    
    showCompletionScreen() {
        // Calculate stats
        const approved = this.images.filter(img => img.status === 'approved').length;
        const disapproved = this.images.filter(img => img.status === 'not approved').length;
        
        this.approvedCountEl.textContent = approved;
        this.disapprovedCountEl.textContent = disapproved;
        
        this.switchToScreen('completion');
    }
    
    submitReview() {
        // For Phase 1, just log the results
        const reviewResults = {
            images: this.images.map(img => ({
                id: img.id,
                status: img.status
            })),
            resumeUrl: this.resumeUrl,
            summary: {
                total: this.images.length,
                approved: this.images.filter(img => img.status === 'approved').length,
                disapproved: this.images.filter(img => img.status === 'not approved').length
            }
        };
        
        console.log('Review Results:', reviewResults);
        alert('Review submitted! Check console for details.');
    }
    
    handleKeyboardInput(e) {
        // Only handle keyboard input when on review screen or completion screen
        if (!this.reviewScreen.classList.contains('active') && 
            !this.completionScreen.classList.contains('active')) {
            return;
        }
        
        switch (e.key) {
            case 'ArrowRight':
                e.preventDefault();
                if (this.reviewScreen.classList.contains('active') && this.currentIndex < this.images.length) {
                    this.approveImage();
                }
                break;
                
            case 'ArrowLeft':
                e.preventDefault();
                if (this.reviewScreen.classList.contains('active') && this.currentIndex < this.images.length) {
                    this.disapproveImage();
                }
                break;
                
            case 'Backspace':
                e.preventDefault();
                this.undoLastAction();
                break;
        }
    }
    
    switchToScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        
        // Show target screen
        switch (screenName) {
            case 'initial':
                this.initialScreen.classList.add('active');
                break;
            case 'review':
                this.reviewScreen.classList.add('active');
                break;
            case 'completion':
                this.completionScreen.classList.add('active');
                break;
        }
    }
    
    showLoading(show) {
        if (show) {
            this.loadingEl.classList.remove('hidden');
            this.getImagesBtn.disabled = true;
        } else {
            this.loadingEl.classList.add('hidden');
            this.getImagesBtn.disabled = false;
        }
    }
    
    showError(message) {
        this.errorMessageEl.textContent = message;
        this.errorMessageEl.classList.remove('hidden');
    }
    
    hideError() {
        this.errorMessageEl.classList.add('hidden');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ImageEvaluator();
});