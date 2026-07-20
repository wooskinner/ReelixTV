// ============================================================
// REELIX TV - Main Application Logic
// ============================================================

// ─── CONFIG ───
const TMDB_API_KEY = '1d3ae144acfb6bfcb25f70361cedcf29';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_W = 'https://image.tmdb.org/t/p/w500';
const IMG_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// ─── STATE ───
let heroPlaylist = [];
let heroIndex = 0;
let heroTimer = null;
let myList = JSON.parse(localStorage.getItem('reelix-mylist') || '[]');
let browsePage = 1;
let browseType = 'movie';
let browseGenre = '';

// ─── DOM REFS ───
const $ = id => document.getElementById(id);

// ─── NAVIGATION ───
document.querySelectorAll('.tv-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function switchView(view) {
    document.querySelectorAll('.tv-nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tv-nav-btn[data-view="${view}"]`)?.classList.add('active');
    
    document.querySelectorAll('.tv-view').forEach(v => v.classList.remove('active'));
    const target = $(`tv-${view}`);
    if (target) target.classList.add('active');
    
    if (view === 'browse') loadBrowse(true);
    if (view === 'mylist') renderMyList();
    if (view === 'search') $('tv-search-input')?.focus();
}

// ─── REMOTE CONTROL ───
document.addEventListener('keydown', (e) => {
    const key = e.key;
    
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        e.preventDefault();
        navigateFocus(key);
    }
    
    if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        document.activeElement?.click();
    }
    
    if (key === 'Escape') {
        closeModal();
        closePaywall();
    }
    
    if (key === 'Backspace' || key === 'BrowserBack') {
        e.preventDefault();
        if ($('tv-modal').classList.contains('open')) {
            closeModal();
        } else {
            switchView('home');
        }
    }
});

function navigateFocus(direction) {
    const current = document.activeElement;
    if (!current) return;
    
    const focusable = document.querySelectorAll(
        'button, [tabindex="0"], input, select, .tv-poster'
    );
    const currentIndex = Array.from(focusable).indexOf(current);
    const cols = 5;
    
    const moves = {
        'ArrowRight': 1,
        'ArrowLeft': -1,
        'ArrowDown': cols,
        'ArrowUp': -cols
    };
    
    const newIndex = Math.max(0, Math.min(currentIndex + (moves[direction] || 0), focusable.length - 1));
    focusable[newIndex]?.focus();
}

// ─── HERO ───
async function loadHero() {
    try {
        const res = await fetch(`${TMDB_BASE}/trending/movie/week?api_key=${TMDB_API_KEY}`);
        const data = await res.json();
        heroPlaylist = (data.results || []).filter(m => m.backdrop_path).slice(0, 8);
        
        if (!heroPlaylist.length) throw new Error('No hero content');
        
        renderHeroSlide(0);
        startHeroAutoRotate();
        
        const dotsContainer = $('tv-hero-dots');
        dotsContainer.innerHTML = '';
        heroPlaylist.forEach((_, i) => {
            const dot = document.createElement('button');
            dot.className = 'tv-hero-dot' + (i === 0 ? ' active' : '');
            dot.addEventListener('click', () => goToHeroSlide(i));
            dotsContainer.appendChild(dot);
        });
        
    } catch (e) {
        console.error('Hero failed:', e);
        $('tv-hero-title').textContent = 'Welcome to Reelix TV';
    }
}

function renderHeroSlide(index) {
    const movie = heroPlaylist[index];
    if (!movie) return;
    
    const bg = $('tv-hero-bg');
    bg.style.backgroundImage = `url(${IMG_ORIGINAL + movie.backdrop_path})`;
    bg.style.opacity = '0';
    setTimeout(() => bg.style.opacity = '1', 50);
    
    $('tv-hero-title').textContent = movie.title || 'Loading...';
    $('tv-hero-desc').textContent = movie.overview || '';
    $('tv-hero-rating').textContent = `★ ${movie.vote_average?.toFixed(1) || 'N/A'}`;
    $('tv-hero-year').textContent = movie.release_date?.slice(0, 4) || '';
    
    const genreMap = {28:'Action',35:'Comedy',18:'Drama',27:'Horror',10749:'Romance',878:'Sci-Fi'};
    const genre = (movie.genre_ids || []).map(id => genreMap[id]).filter(Boolean)[0];
    $('tv-hero-genre').textContent = genre || '';
    
    $('tv-hero-play').onclick = () => {
        window.location.href = `/ReelixTV/watch.html?id=${movie.id}&type=movie`;
    };
    $('tv-hero-info').onclick = () => openModal(movie.id, 'movie');
    
    document.querySelectorAll('.tv-hero-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
}

function goToHeroSlide(index) {
    clearInterval(heroTimer);
    heroIndex = index;
    renderHeroSlide(index);
    startHeroAutoRotate();
}

function startHeroAutoRotate() {
    clearInterval(heroTimer);
    if (heroPlay
