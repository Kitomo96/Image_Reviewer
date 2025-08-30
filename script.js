class ImageReviewer {
    constructor() {
        this.images = [];
        this.currentIndex = 0;
        this.reviewHistory = [];
        this.resumeUrl = null;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.currentY = 0;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.showScreen('loading-screen');
    }

    bindEvents() {
        // Get Images button
        document.getElementById('get-images-btn').addEventListener('click', () => {
            this.fetchImages();
        });

        // Control buttons
        document.getElementById('approve-btn').addEventListener('click', () => {
            this.approveImage();
        });

        document.getElementById('disapprove-btn').addEventListener('click', () => {
            this.disapproveImage();
        });

        document.getElementById('undo-btn').addEventListener('click', () => {
            this.undoLastAction();
        });

        // Submission buttons
        document.getElementById('submit-review-btn').addEventListener('click', () => {
            this.submitReview();
        });

        document.getElementById('review-again-btn').addEventListener('click', () => {
            this.resetReview();
        });

        document.getElementById('retry-btn').addEventListener('click', () => {
            this.showScreen('loading-screen');
        });

        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (this.getCurrentScreen() !== 'review-screen') return;
            
            switch(e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.disapproveImage();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.approveImage();
                    break;
                case 'Backspace':
                    e.preventDefault();
                    this.undoLastAction();
                    break;
            }
        });

        // Touch and mouse events for swiping
        this.bindSwipeEvents();
    }

    bindSwipeEvents() {
        const cardStack = document.getElementById('card-stack');

        // Mouse events
        cardStack.addEventListener('mousedown', (e) => this.handleStart(e));
        document.addEventListener('mousemove', (e) => this.handleMove(e));
        document.addEventListener('mouseup', (e) => this.handleEnd(e));

        // Touch events
        cardStack.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
        document.addEventListener('touchmove', (e) => this.handleMove(e), { passive: false });
        document.addEventListener('touchend', (e) => this.handleEnd(e));
    }

    handleStart(e) {
        if (this.getCurrentScreen() !== 'review-screen') return;
        if (this.currentIndex >= this.images.length) return;

        this.isDragging = true;
        const touch = e.touches ? e.touches[0] : e;
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.currentX = this.startX;
        this.currentY = this.startY;

        const currentCard = this.getCurrentCard();
        if (currentCard) {
            currentCard.classList.add('dragging');
        }

        e.preventDefault();
    }

    handleMove(e) {
        if (!this.isDragging) return;

        const touch = e.touches ? e.touches[0] : e;
        this.currentX = touch.clientX;
        this.currentY = touch.clientY;

        const deltaX = this.currentX - this.startX;
        const deltaY = this.currentY - this.startY;
        const rotation = deltaX * 0.1;

        const currentCard = this.getCurrentCard();
        if (currentCard) {
            currentCard.style.transform = `translateX(${deltaX}px) translateY(${deltaY}px) rotate(${rotation}deg)`;
            currentCard.style.opacity = 1 - Math.abs(deltaX) / 300;

            // Add card fanning effect
            this.updateCardFanning(deltaX);

            // Show swipe indicators
            this.updateSwipeIndicators(deltaX);
        }

        e.preventDefault();
    }

    handleEnd(e) {
        if (!this.isDragging) return;

        this.isDragging = false;
        const deltaX = this.currentX - this.startX;
        const currentCard = this.getCurrentCard();

        if (currentCard) {
            currentCard.classList.remove('dragging');
            
            // Determine if swipe threshold was met
            const threshold = 100;
            
            if (Math.abs(deltaX) > threshold) {
                if (deltaX > 0) {
                    this.approveImage();
                } else {
                    this.disapproveImage();
                }
            } else {
                // Snap back to center
                currentCard.style.transform = '';
                currentCard.style.opacity = '';
            }
        }

        this.hideSwipeIndicators();
        this.clearCardFanning();
        e.preventDefault();
    }

    updateSwipeIndicators(deltaX) {
        const approveIndicator = document.querySelector('.swipe-indicator.approve');
        const disapproveIndicator = document.querySelector('.swipe-indicator.disapprove');

        if (!approveIndicator || !disapproveIndicator) {
            // Create indicators if they don't exist
            this.createSwipeIndicators();
            return;
        }

        const threshold = 50;
        
        if (deltaX > threshold) {
            approveIndicator.classList.add('visible');
            disapproveIndicator.classList.remove('visible');
        } else if (deltaX < -threshold) {
            disapproveIndicator.classList.add('visible');
            approveIndicator.classList.remove('visible');
        } else {
            approveIndicator.classList.remove('visible');
            disapproveIndicator.classList.remove('visible');
        }
    }

    createSwipeIndicators() {
        const currentCard = this.getCurrentCard();
        if (!currentCard) return;

        // Remove existing indicators
        const existingIndicators = currentCard.querySelectorAll('.swipe-indicator');
        existingIndicators.forEach(indicator => indicator.remove());

        // Create approve indicator
        const approveIndicator = document.createElement('div');
        approveIndicator.className = 'swipe-indicator approve';
        approveIndicator.textContent = 'APPROVE';
        currentCard.appendChild(approveIndicator);

        // Create disapprove indicator
        const disapproveIndicator = document.createElement('div');
        disapproveIndicator.className = 'swipe-indicator disapprove';
        disapproveIndicator.textContent = 'DISAPPROVE';
        currentCard.appendChild(disapproveIndicator);
    }

    hideSwipeIndicators() {
        const indicators = document.querySelectorAll('.swipe-indicator');
        indicators.forEach(indicator => indicator.classList.remove('visible'));
    }

    updateCardFanning(deltaX) {
        const cardStack = document.getElementById('card-stack');
        const cards = cardStack.querySelectorAll('.image-card');
        
        // Clear existing fanning classes
        cards.forEach(card => {
            card.classList.remove('fanning-left', 'fanning-right');
        });

        // Add fanning effect based on swipe direction
        const threshold = 30;
        if (Math.abs(deltaX) > threshold) {
            const direction = deltaX > 0 ? 'fanning-right' : 'fanning-left';
            cards.forEach(card => {
                card.classList.add(direction);
            });
        }
    }

    clearCardFanning() {
        const cardStack = document.getElementById('card-stack');
        const cards = cardStack.querySelectorAll('.image-card');
        cards.forEach(card => {
            card.classList.remove('fanning-left', 'fanning-right');
        });
    }

    async fetchImages() {
        try {
            this.showLoading('Fetching images...');
            
            // Get folder ID from input field, URL parameter, or use mock for development
            const folderId = this.getFolderId();
            
            if (!folderId) {
                throw new Error('Please enter a Google Drive folder ID');
            }
            
            const response = await fetch('https://n8n.jacopogomarasca.it/webhook/7c46aa4d-1163-49f2-85f3-0e4c3dcc74f0', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ folderId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.assets || !Array.isArray(data.assets)) {
                throw new Error('Invalid response format');
            }

            this.images = data.assets.map(asset => ({
                id: asset.id,
                status: 'undecided'
            }));
            
            this.resumeUrl = data.resumeUrl;
            
            if (this.images.length === 0) {
                throw new Error('No images found in the folder');
            }

            this.currentIndex = 0;
            this.reviewHistory = [];
            this.startReview();
            
        } catch (error) {
            console.error('Error fetching images:', error);
            this.showError('Failed to fetch images. Please check the folder ID and try again.');
        }
    }

    getFolderId() {
        // First check the input field
        const inputField = document.getElementById('folder-id-input');
        const inputValue = inputField ? inputField.value.trim() : '';
        
        if (inputValue) {
            return this.extractFolderIdFromInput(inputValue);
        }
        
        // Fallback to URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('folderId');
    }

    extractFolderIdFromInput(input) {
        // Extract folder ID from various Google Drive URL formats or return as-is if already an ID
        
        // Full URL: https://drive.google.com/drive/folders/1ABC123...
        const folderMatch = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
        if (folderMatch) {
            return folderMatch[1];
        }
        
        // Sharing URL: https://drive.google.com/drive/u/0/folders/1ABC123...
        const shareMatch = input.match(/\/u\/\d+\/folders\/([a-zA-Z0-9_-]+)/);
        if (shareMatch) {
            return shareMatch[1];
        }
        
        // Direct folder ID (assume it's already clean if no URL pattern found)
        if (input.match(/^[a-zA-Z0-9_-]+$/)) {
            return input;
        }
        
        return null;
    }

    validateFolderId(folderId) {
        // Google Drive folder IDs are typically 25-44 characters long and contain letters, numbers, underscores, and hyphens
        return folderId && folderId.length >= 25 && folderId.length <= 44 && /^[a-zA-Z0-9_-]+$/.test(folderId);
    }

    startReview() {
        this.showScreen('review-screen');
        this.updateProgress();
        this.loadNextImages();
        this.updateUndoButton();
    }

    loadNextImages() {
        const cardStack = document.getElementById('card-stack');
        cardStack.innerHTML = '';

        // Load next 3 images for buffer
        const imagesToLoad = Math.min(3, this.images.length - this.currentIndex);
        
        for (let i = 0; i < imagesToLoad; i++) {
            const imageIndex = this.currentIndex + i;
            if (imageIndex < this.images.length) {
                this.createImageCard(this.images[imageIndex], i);
            }
        }
    }

    createImageCard(image, stackPosition) {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.dataset.imageId = image.id;

        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';

        // Create loading spinner
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        cardContent.appendChild(spinner);

        // Set low-res background immediately
        const lowResUrl = `https://drive.google.com/thumbnail?id=${image.id}&sz=w400`;
        cardContent.style.backgroundImage = `url(${lowResUrl})`;

        card.appendChild(cardContent);

        // Load high-res image
        this.loadHighResImage(image.id, cardContent);

        // Add to stack
        const cardStack = document.getElementById('card-stack');
        cardStack.appendChild(card);

        // Create swipe indicators for the top card
        if (stackPosition === 0) {
            this.createSwipeIndicators();
        }
    }

    loadHighResImage(imageId, cardContent) {
        const hiResImage = new Image();
        const hiResUrl = `https://drive.google.com/thumbnail?id=${imageId}&sz=w1200`;
        
        hiResImage.onload = () => {
            // Remove spinner
            const spinner = cardContent.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }

            // Create and show high-res image
            const img = document.createElement('img');
            img.src = hiResUrl;
            img.className = 'card-image';
            img.alt = 'Review image';
            
            cardContent.appendChild(img);
            
            // Fade in the image
            setTimeout(() => {
                img.classList.add('loaded');
            }, 50);
        };

        hiResImage.onerror = () => {
            // Remove spinner and show error
            const spinner = cardContent.querySelector('.loading-spinner');
            if (spinner) {
                spinner.remove();
            }

            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'Image could not be loaded';
            cardContent.appendChild(errorMsg);
        };

        hiResImage.src = hiResUrl;
    }

    approveImage() {
        this.triggerKeyboardAnimation('right');
        setTimeout(() => this.processImageDecision('approved'), 280);
    }

    disapproveImage() {
        this.triggerKeyboardAnimation('left');
        setTimeout(() => this.processImageDecision('not approved'), 280);
    }

    triggerKeyboardAnimation(direction) {
        const currentCard = this.getCurrentCard();
        if (!currentCard) return;

        // Add fanning effect
        this.updateCardFanning(direction === 'right' ? 100 : -100);

        // Animate the current card
        currentCard.classList.add('dragging');
        const translateX = direction === 'right' ? 100 : -100;
        currentCard.style.transform = `translateX(${translateX}px) rotate(${direction === 'right' ? 30 : -30}deg)`;
        currentCard.style.opacity = '0.5';

        // Show swipe indicators
        this.updateSwipeIndicators(translateX);

        // Remove animation after delay
        setTimeout(() => {
            this.clearCardFanning();
            this.hideSwipeIndicators();
        }, 250);
    }

    processImageDecision(decision) {
        if (this.currentIndex >= this.images.length) return;

        const currentImage = this.images[this.currentIndex];
        const previousStatus = currentImage.status;
        
        // Update image status
        currentImage.status = decision;
        
        // Add to history for undo functionality
        this.reviewHistory.push({
            index: this.currentIndex,
            previousStatus,
            newStatus: decision
        });

        // Add to sidebar history
        this.addToSidebarHistory(currentImage, decision);

        // Animate card out
        const currentCard = this.getCurrentCard();
        if (currentCard) {
            const direction = decision === 'approved' ? 'right' : 'left';
            currentCard.classList.add(`swiped-${direction}`);
            
            setTimeout(() => {
                currentCard.remove();
            }, 300);
        }

        this.currentIndex++;
        this.updateProgress();

        if (this.currentIndex >= this.images.length) {
            // Review complete
            setTimeout(() => {
                this.showSubmissionScreen();
            }, 300);
        } else {
            // Load next image if needed
            setTimeout(() => {
                this.loadNextImageIfNeeded();
            }, 100);
        }

        this.updateUndoButton();
    }

    loadNextImageIfNeeded() {
        const cardStack = document.getElementById('card-stack');
        const currentCards = cardStack.children.length;
        
        // Always try to maintain 3 cards in the stack
        const nextImageIndex = this.currentIndex + currentCards;
        
        if (nextImageIndex < this.images.length) {
            this.createImageCard(this.images[nextImageIndex], currentCards);
        }
    }

    undoLastAction() {
        if (this.reviewHistory.length === 0) return;

        const lastAction = this.reviewHistory.pop();
        const undoneImage = this.images[lastAction.index];
        
        // Restore previous status
        undoneImage.status = lastAction.previousStatus;
        
        // Remove from sidebar history
        this.removeFromSidebarHistory(undoneImage.id);
        
        // Go back to previous image
        this.currentIndex = lastAction.index;
        
        // Reload the card stack
        this.loadNextImages();
        this.updateProgress();
        this.updateUndoButton();
    }

    updateUndoButton() {
        const undoBtn = document.getElementById('undo-btn');
        undoBtn.disabled = this.reviewHistory.length === 0;
    }

    getCurrentCard() {
        const cardStack = document.getElementById('card-stack');
        return cardStack.querySelector('.image-card:first-child');
    }

    updateProgress() {
        const progressFill = document.getElementById('progress-fill');
        const currentImageSpan = document.getElementById('current-image');
        const totalImagesSpan = document.getElementById('total-images');
        
        const progress = (this.currentIndex / this.images.length) * 100;
        progressFill.style.width = `${progress}%`;
        
        currentImageSpan.textContent = this.currentIndex + 1;
        totalImagesSpan.textContent = this.images.length;

        // Update sidebar progress
        this.updateSidebarProgress();
    }

    updateSidebarProgress() {
        const sidebarCurrent = document.getElementById('sidebar-current');
        const sidebarTotal = document.getElementById('sidebar-total');
        
        if (sidebarCurrent && sidebarTotal) {
            sidebarCurrent.textContent = this.reviewHistory.length;
            sidebarTotal.textContent = this.images.length;
        }
    }

    addToSidebarHistory(image, decision) {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.dataset.imageId = image.id;

        // Create thumbnail
        const thumbnail = document.createElement('img');
        thumbnail.className = 'history-thumbnail';
        thumbnail.src = `https://drive.google.com/thumbnail?id=${image.id}&sz=w80`;
        thumbnail.alt = 'Review thumbnail';

        // Create status indicator
        const status = document.createElement('span');
        status.className = `history-status ${decision === 'approved' ? 'approved' : 'disapproved'}`;
        status.textContent = decision === 'approved' ? '✓' : '✕';

        historyItem.appendChild(thumbnail);
        historyItem.appendChild(status);

        // Add to top of list
        historyList.insertBefore(historyItem, historyList.firstChild);

        this.updateSidebarProgress();
    }

    removeFromSidebarHistory(imageId) {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;

        const historyItem = historyList.querySelector(`[data-image-id="${imageId}"]`);
        if (historyItem) {
            historyItem.remove();
        }

        this.updateSidebarProgress();
    }

    showSubmissionScreen() {
        const approvedCount = this.images.filter(img => img.status === 'approved').length;
        const disapprovedCount = this.images.filter(img => img.status === 'not approved').length;
        
        document.getElementById('approved-count').textContent = approvedCount;
        document.getElementById('disapproved-count').textContent = disapprovedCount;
        
        this.showScreen('submission-screen');
    }

    async submitReview() {
        if (!this.resumeUrl) {
            this.showError('No submission URL available');
            return;
        }

        try {
            this.showLoading('Submitting review...');
            
            // Prepare submission data - only disapproved images
            const submissionData = this.images
                .filter(image => image.status === 'not approved')
                .map(image => ({
                    fileId: image.id,
                    "approval status": image.status
                }));

            const response = await fetch(this.resumeUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(submissionData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Show success message
            this.showSuccess('Review submitted successfully!');
            
        } catch (error) {
            console.error('Error submitting review:', error);
            this.showError('Failed to submit review. Please try again.');
        }
    }

    resetReview() {
        this.currentIndex = 0;
        this.reviewHistory = [];
        this.images.forEach(image => image.status = 'undecided');
        this.startReview();
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    getCurrentScreen() {
        const activeScreen = document.querySelector('.screen.active');
        return activeScreen ? activeScreen.id : null;
    }

    showLoading(message) {
        // You could implement a loading overlay here
        console.log('Loading:', message);
    }

    showError(message) {
        document.getElementById('error-message').textContent = message;
        this.showScreen('error-screen');
    }

    showSuccess(message) {
        // You could implement a success message here
        console.log('Success:', message);
        setTimeout(() => {
            this.showScreen('loading-screen');
        }, 2000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ImageReviewer();
});