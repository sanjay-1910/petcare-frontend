class VetFinder {
    constructor() {
        this.selectedPlaceId = null;
        this.selectedLocation = null;
        this.autocompleteTimeout = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const locationInput = document.getElementById('locationInput');
        const searchBtn = document.getElementById('searchBtn');
        const autocompleteDropdown = document.getElementById('autocompleteDropdown');

        // Search functionality
        searchBtn.addEventListener('click', () => this.handleSearch());
        locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch();
            }
        });

        // Autocomplete functionality
        locationInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length > 2) {
                this.debounceAutocomplete(query);
            } else {
                this.hideAutocomplete();
            }
        });

        // Hide autocomplete when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-input-container')) {
                this.hideAutocomplete();
            }
        });
    }

    debounceAutocomplete(query) {
        clearTimeout(this.autocompleteTimeout);
        this.autocompleteTimeout = setTimeout(() => {
            this.fetchAutocomplete(query);
        }, 300);
    }

    async fetchAutocomplete(query) {
        try {
            const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            if (data.error) {
                console.error('Autocomplete error:', data.error);
                return;
            }
            
            this.displayAutocomplete(data.predictions || []);
        } catch (error) {
            console.error('Autocomplete fetch error:', error);
        }
    }

    displayAutocomplete(predictions) {
        const dropdown = document.getElementById('autocompleteDropdown');
        
        if (predictions.length === 0) {
            this.hideAutocomplete();
            return;
        }

        dropdown.innerHTML = predictions.map(prediction => `
            <div class="autocomplete-item" data-place-id="${prediction.place_id}" data-description="${prediction.description}">
                <i class="fas fa-map-marker-alt"></i>
                ${prediction.description}
            </div>
        `).join('');

        // Add click event listeners to autocomplete items
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectedPlaceId = item.dataset.placeId;
                this.selectedLocation = item.dataset.description;
                document.getElementById('locationInput').value = this.selectedLocation;
                this.hideAutocomplete();
            });
        });

        dropdown.classList.add('show');
    }

    hideAutocomplete() {
        const dropdown = document.getElementById('autocompleteDropdown');
        dropdown.classList.remove('show');
    }

    async handleSearch() {
        const locationInput = document.getElementById('locationInput');
        const location = locationInput.value.trim();
        
        if (!location) {
            this.showError('Please enter a location to search');
            return;
        }

        this.showLoading();
        this.hideAllSections();

        try {
            const searchData = {
                location: this.selectedLocation || location,
                placeId: this.selectedPlaceId
            };

            const response = await fetch('/api/search/veterinary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchData)
            });

            const data = await response.json();
            
            if (data.error) {
                this.showError(data.error);
                return;
            }

            this.hideLoading();
            this.displayResults(data.results || [], location);
            
        } catch (error) {
            console.error('Search error:', error);
            this.hideLoading();
            this.showError('Failed to search veterinary hospitals. Please try again.');
        }
    }

    displayResults(results, location) {
        if (results.length === 0) {
            this.showNoResults();
            return;
        }

        const resultsSection = document.getElementById('resultsSection');
        const resultsTitle = document.getElementById('resultsTitle');
        const resultsCount = document.getElementById('resultsCount');
        const resultsGrid = document.getElementById('resultsGrid');

        resultsTitle.textContent = `Veterinary Hospitals near ${location}`;
        resultsCount.textContent = `Found ${results.length} veterinary hospital${results.length === 1 ? '' : 's'}`;

        resultsGrid.innerHTML = results.map(hospital => this.createHospitalCard(hospital)).join('');

        // Add click event listeners to hospital cards
        resultsGrid.querySelectorAll('.hospital-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.openGoogleMaps(results[index].place_id);
            });
        });

        // Add click event listeners to maps buttons
        resultsGrid.querySelectorAll('.maps-btn').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openGoogleMaps(results[index].place_id);
            });
        });

        resultsSection.classList.add('show');
    }

    createHospitalCard(hospital) {
        const rating = hospital.rating || 0;
        const userRatingsTotal = hospital.user_ratings_total || 0;
        const openNow = hospital.opening_hours?.open_now;
        
        let statusClass = 'status-unknown';
        let statusText = 'Hours not available';
        let statusIcon = 'fas fa-clock';
        
        if (openNow === true) {
            statusClass = 'status-open';
            statusText = 'Open now';
            statusIcon = 'fas fa-clock';
        } else if (openNow === false) {
            statusClass = 'status-closed';
            statusText = 'Closed now';
            statusIcon = 'fas fa-clock';
        }

        const stars = this.generateStars(rating);
        const imageElement = hospital.photo_url 
            ? `<img src="${hospital.photo_url}" alt="${hospital.name}" class="card-image">`
            : `<div class="card-image placeholder"><i class="fas fa-hospital"></i></div>`;

        return `
            <div class="hospital-card" data-place-id="${hospital.place_id}">
                ${imageElement}
                <div class="card-content">
                    <h3>${hospital.name}</h3>
                    <div class="card-address">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${hospital.formatted_address || hospital.vicinity}</span>
                    </div>
                    <div class="card-rating">
                        <div class="stars">${stars}</div>
                        <span class="rating-text">${rating.toFixed(1)} (${userRatingsTotal} reviews)</span>
                    </div>
                    <div class="card-status ${statusClass}">
                        <i class="${statusIcon}"></i>
                        <span>${statusText}</span>
                    </div>
                    <div class="card-actions">
                        <button class="maps-btn" onclick="event.stopPropagation()">
                            <i class="fas fa-map-marked-alt"></i>
                            <span>View on Maps</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';
        
        // Full stars
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star star"></i>';
        }
        
        // Half star
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt star"></i>';
        }
        
        // Empty stars
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star star empty"></i>';
        }
        
        return stars;
    }

    openGoogleMaps(placeId) {
        const url = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
        window.open(url, '_blank');
    }

    showLoading() {
        document.getElementById('loadingSection').classList.add('show');
    }

    hideLoading() {
        document.getElementById('loadingSection').classList.remove('show');
    }

    showNoResults() {
        document.getElementById('noResultsSection').classList.add('show');
    }

    showError(message) {
        const errorSection = document.getElementById('errorSection');
        const errorMessage = document.getElementById('errorMessage');
        errorMessage.textContent = message;
        errorSection.classList.add('show');
    }

    hideAllSections() {
        const sections = [
            'loadingSection',
            'resultsSection',
            'noResultsSection',
            'errorSection'
        ];
        
        sections.forEach(sectionId => {
            document.getElementById(sectionId).classList.remove('show');
        });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VetFinder();
});