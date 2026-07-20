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
    if (heroPlaylist.length <= 1) return;
    heroTimer = setInterval(() => {
        heroIndex = (heroIndex + 1) % heroPlaylist.length;
        renderHeroSlide(heroIndex);
    }, 7000);
}

// ─── ROWS ───
const ROW_CONFIG = [
    { id: 'trending', emoji: '🔥', title: 'Trending Now', 
      url: `${TMDB_BASE}/trending/movie/week?api_key=${TMDB_API_KEY}` },
    { id: 'popular', emoji: '⭐', title: 'Popular on Reelix',
      url: `${TMDB_BASE}/movie/popular?api_key=${TMDB_API_KEY}` },
    { id: 'action', emoji: '💥', title: 'Action & Adventure',
      url: `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=28` },
    { id: 'comedy', emoji: '😂', title: 'Comedies',
      url: `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=35` },
    { id: 'african', emoji: '🌍', title: 'African Movies',
      url: `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_origin_country=NG|GH|KE|ZA` },
    { id: 'tvshows', emoji: '📺', title: 'TV Shows',
      url: `${TMDB_BASE}/tv/popular?api_key=${TMDB_API_KEY}` }
];

async function loadRows() {
    const container = $('tv-rows');
    container.innerHTML = '';
    
    for (const row of ROW_CONFIG) {
        try {
            const res = await fetch(row.url);
            const data = await res.json();
            const items = (data.results || []).filter(i => i.poster_path || i.backdrop_path).slice(0, 12);
            
            if (!items.length) continue;
            
            const rowEl = document.createElement('div');
            rowEl.className = 'tv-row';
            rowEl.innerHTML = `
                <div class="tv-row-header">
                    <h2>${row.emoji} ${row.title}</h2>
                </div>
                <div class="tv-row-scroll" id="tv-row-${row.id}">
                    ${items.map(item => createPosterHTML(item, 'movie')).join('')}
                </div>
            `;
            container.appendChild(rowEl);
            
            rowEl.querySelectorAll('.tv-poster').forEach((poster, i) => {
                const item = items[i];
                poster.addEventListener('click', () => openModal(item.id, 'movie'));
                poster.setAttribute('tabindex', '0');
            });
            
        } catch (e) {
            console.error(`Row ${row.id} failed:`, e);
        }
    }
}

function createPosterHTML(item, type) {
    const img = item.poster_path || item.backdrop_path;
    if (!img) return '';
    const title = item.title || item.name || 'Untitled';
    return `
        <div class="tv-poster" data-id="${item.id}" data-type="${type}">
            <img src="${IMG_W + img}" alt="${title}" loading="lazy">
            <div class="tv-poster-title">${title}</div>
            <div class="tv-poster-overlay">
                <button class="tv-poster-play">▶</button>
            </div>
        </div>
    `;
}

// ─── BROWSE ───
async function loadBrowse(reset = true) {
    if (reset) {
        browsePage = 1;
        $('tv-grid').innerHTML = '';
    }
    
    try {
        let url = `${TMDB_BASE}/discover/${browseType}?api_key=${TMDB_API_KEY}&sort_by=popularity.desc&page=${browsePage}`;
        if (browseGenre) url += `&with_genres=${browseGenre}`;
        
        const res = await fetch(url);
        const data = await res.json();
        const items = (data.results || []).filter(i => i.poster_path);
        
        const grid = $('tv-grid');
        items.forEach(item => {
            const poster = document.createElement('div');
            poster.className = 'tv-poster';
            poster.innerHTML = `
                <img src="${IMG_W + item.poster_path}" alt="${item.title || item.name}" loading="lazy">
                <div class="tv-poster-title">${item.title || item.name}</div>
                <div class="tv-poster-overlay">
                    <button class="tv-poster-play">▶</button>
                </div>
            `;
            poster.addEventListener('click', () => openModal(item.id, browseType));
            poster.setAttribute('tabindex', '0');
            grid.appendChild(poster);
        });
        
        browsePage++;
        
    } catch (e) {
        console.error('Browse failed:', e);
    }
}

// Browse filters
document.querySelectorAll('.tv-pill[data-filter]').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.tv-pill[data-filter]').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        
        const filter = pill.dataset.filter;
        const genreMap = { action: 28, comedy: 35, drama: 18, horror: 27, african: 'NG|GH|KE|ZA' };
        
        if (filter === 'all') { browseGenre = ''; browseType = 'movie'; }
        else if (filter === 'movie' || filter === 'tv') { browseType = filter; browseGenre = ''; }
        else { browseGenre = genreMap[filter] || ''; browseType = 'movie'; }
        
        loadBrowse(true);
    });
});

// Infinite scroll for browse
$('tv-browse')?.addEventListener('scroll', () => {
    const el = $('tv-browse');
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
        loadBrowse(false);
    }
});

// ─── MY LIST ───
function renderMyList() {
    const grid = $('tv-mylist-grid');
    grid.innerHTML = '';
    
    if (!myList.length) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 0;color:#A79BC0;">
                <h3 style="font-size:24px;margin-bottom:12px;">Your list is empty</h3>
                <p>Add movies and shows to watch later</p>
            </div>
        `;
        return;
    }
    
    myList.forEach(item => {
        const poster = document.createElement('div');
        poster.className = 'tv-poster';
        poster.innerHTML = `
            <img src="${IMG_W + (item.poster || item.backdrop)}" alt="${item.title}" loading="lazy">
            <div class="tv-poster-title">${item.title}</div>
            <div class="tv-poster-overlay">
                <button class="tv-poster-play">▶</button>
            </div>
        `;
        poster.addEventListener('click', () => openModal(item.id, item.type));
        poster.setAttribute('tabindex', '0');
        grid.appendChild(poster);
    });
}

// ─── SEARCH ───
let searchTimeout;
$('tv-search-input')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (!query) { $('tv-search-results').innerHTML = ''; return; }
    searchTimeout = setTimeout(() => performSearch(query), 400);
});

$('tv-search-btn')?.addEventListener('click', () => {
    const query = $('tv-search-input').value.trim();
    if (query) performSearch(query);
});

async function performSearch(query) {
    try {
        const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
        const data = await res.json();
        const items = (data.results || []).filter(i => i.poster_path && ['movie', 'tv'].includes(i.media_type));
        
        const container = $('tv-search-results');
        container.innerHTML = '';
        items.slice(0, 20).forEach(item => {
            const poster = document.createElement('div');
            poster.className = 'tv-poster';
            poster.innerHTML = `
                <img src="${IMG_W + item.poster_path}" alt="${item.title || item.name}" loading="lazy">
                <div class="tv-poster-title">${item.title || item.name}</div>
                <div class="tv-poster-overlay">
                    <button class="tv-poster-play">▶</button>
                </div>
            `;
            poster.addEventListener('click', () => openModal(item.id, item.media_type));
            poster.setAttribute('tabindex', '0');
            container.appendChild(poster);
        });
        
    } catch (e) {
        console.error('Search failed:', e);
    }
}

// ─── MODAL ───
async function openModal(id, type) {
    try {
        const res = await fetch(`${TMDB_BASE}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=videos`);
        const data = await res.json();
        
        const modal = $('tv-modal');
        $('tv-modal-poster').src = data.backdrop_path ? IMG_ORIGINAL + data.backdrop_path : IMG_W + data.poster_path;
        $('tv-modal-title').textContent = data.title || data.name || '';
        $('tv-modal-overview').textContent = data.overview || '';
        
        $('tv-modal-play').onclick = () => {
            window.location.href = `/ReelixTV/watch.html?id=${id}&type=${type}`;
        };
        
        const inList = myList.some(x => String(x.id) === String(id));
        const listBtn = $('tv-modal-mylist');
        listBtn.textContent = inList ? '✓ In My List' : '+ Add to List';
        listBtn.onclick = () => {
            const idx = myList.findIndex(x => String(x.id) === String(id));
            if (idx > -1) {
                myList.splice(idx, 1);
                showToast('Removed from My List');
            } else {
                myList.push({ id, type, title: data.title || data.name, poster: data.poster_path, backdrop: data.backdrop_path });
                showToast('Added to My List');
            }
            localStorage.setItem('reelix-mylist', JSON.stringify(myList));
            openModal(id, type);
        };
        
        modal.classList.add('open');
        $('tv-modal-play').focus();
        
    } catch (e) {
        console.error('Modal failed:', e);
        showToast('Could not load details');
    }
}

function closeModal() {
    $('tv-modal').classList.remove('open');
}

// ─── PAYWALL ───
function showPaywall() { $('tv-paywall').classList.add('visible'); }
function closePaywall() { $('tv-paywall').classList.remove('visible'); }

// ─── TOAST ───
function showToast(msg) {
    const existing = document.querySelector('.tv-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'tv-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2500);
}

// ─── AUTH (Simplified) ───
function checkAuth() {
    // Check localStorage for trial/subscription
    const isPaid = localStorage.getItem('reelix-paid') === 'true';
    const trial = localStorage.getItem('reelix-trial');
    
    if (isPaid) {
        const sub = localStorage.getItem('reelix-sub');
        if (sub) {
            try {
                const data = JSON.parse(sub);
                if (new Date(data.end) > new Date()) {
                    $('tv-paywall').classList.remove('visible');
                    updateStatusPill('subscribed', data.end);
                    return;
                }
            } catch {}
        }
    }
    
    if (trial) {
        try {
            const data = JSON.parse(trial);
            if (new Date(data.end) > new Date()) {
                $('tv-paywall').classList.remove('visible');
                updateStatusPill('trial', data.end);
                return;
            }
        } catch {}
    }
    
    $('tv-paywall').classList.add('visible');
}

function updateStatusPill(type, endDate) {
    const pill = $('tv-status-pill');
    if (!pill) return;
    
    const days = Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24));
    
    if (type === 'subscribed') {
        pill.innerHTML = `✅ ${days}d left`;
        pill.style.cssText = 'color: #4FD8AE; font-weight: 600; background: rgba(79,216,174,0.1); border: 1px solid rgba(79,216,174,0.2);';
    } else if (type === 'trial') {
        pill.innerHTML = `🎯 Trial ${days}d`;
        pill.style.cssText = 'color: #E3B873; font-weight: 600; background: rgba(227,184,115,0.1); border: 1px solid rgba(227,184,115,0.2);';
    }
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    await loadHero();
    await loadRows();
    await loadBrowse(true);
    renderMyList();
    
    $('tv-modal-close')?.addEventListener('click', closeModal);
    $('tv-modal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
    
    // Ctrl+K for search
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            switchView('search');
            $('tv-search-input')?.focus();
        }
    });
});

// ─── SERVICE WORKER ───
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/ReelixTV/tv/tv-worker.js')
        .catch(() => console.log('SW not available'));
}
