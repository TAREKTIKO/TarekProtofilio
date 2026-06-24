// ============================================================
// library.js — Main Library Page Logic
// ============================================================
import { supabase } from "./supabase.js";

// ─── Admin Auth Guard ────────────────────────────────────────
const _userRole = localStorage.getItem("userRole");
const _adminAuth = localStorage.getItem("adminAuthenticated");
if (_userRole !== "admin" || _adminAuth !== "true") {
    window.location.replace("admin-login.html?redirect=library.html");
}

// ─── State ───────────────────────────────────────────────────
const ITEMS_PER_PAGE   = 6;
const FAV_KEY          = "lib_favorites";
const RECENT_KEY       = "lib_recently_viewed";
const RECENT_MAX       = 6;

let allItems           = [];   // raw data from DB
let filteredItems      = [];   // after search / category filter
let currentPage        = 1;
let activeCategory     = null; // { id, name } or null = All
let activeSubcategory  = null; // { id, name } or null
let searchQuery        = "";
let quickFilter        = "all";
let sortMode           = "latest";

// ─── DOM refs ────────────────────────────────────────────────
const grid             = document.getElementById("libCardsGrid");
const searchInput      = document.getElementById("libSearchInput");
const clearBtn         = document.getElementById("clearSearchBtn");
const sortSelect       = document.getElementById("libSortSelect");
const categoryTitle    = document.getElementById("currentCategoryTitle");
const resultsCount     = document.getElementById("resultsCount");
const paginationWrap   = document.getElementById("paginationContainer");
const prevPageBtn      = document.getElementById("prevPageBtn");
const nextPageBtn      = document.getElementById("nextPageBtn");
const pageNumbers      = document.getElementById("pageNumbers");
const accordionRoot    = document.getElementById("categoryAccordion");
const allCategoryBtn   = document.getElementById("allCategoryBtn");
const sidebarToggle    = document.getElementById("sidebarToggleBtn");
const sidebar          = document.getElementById("libSidebar");
const sidebarOverlay   = document.getElementById("sidebarOverlay");
const closeSidebarBtn  = document.getElementById("closeSidebarBtn");
const statCategories   = document.getElementById("statCategories");
const statItems        = document.getElementById("statItems");
const statFavs         = document.getElementById("statFavs");
const recentSection    = document.getElementById("recentlyViewedSection");
const recentList       = document.getElementById("recentlyViewedList");

// ─── Favorites ───────────────────────────────────────────────
function getFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
    catch { return []; }
}
function toggleFav(id) {
    let favs = getFavs();
    const idx = favs.indexOf(id);
    if (idx === -1) favs.push(id); else favs.splice(idx, 1);
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    statFavs.textContent = favs.length;
    return idx === -1; // true = added
}
function isFav(id) { return getFavs().includes(id); }

// ─── Recently Viewed ─────────────────────────────────────────
function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
    catch { return []; }
}
function renderRecentlyViewed() {
    const recent = getRecent();
    if (!recent.length) { recentSection.classList.add("hidden"); return; }
    recentSection.classList.remove("hidden");
    recentList.innerHTML = recent.map(r => `
        <li>
            <a href="./library-details.html?id=${r.id}"
               class="sub-item flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 transition cursor-pointer">
                <i class="fa-solid fa-clock text-amber-500/50 w-3"></i>
                <span class="truncate">${escapeHtml(r.title)}</span>
            </a>
        </li>`).join("");
}

// ─── Helpers ─────────────────────────────────────────────────
function escapeHtml(str = "") {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
}

function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const TECH_COLORS = {
    html:       "bg-orange-500/15 text-orange-400 border border-orange-500/30",
    css:        "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    js:         "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    javascript: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
    react:      "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
    vue:        "bg-green-500/15 text-green-400 border border-green-500/30",
    tailwind:   "bg-teal-500/15 text-teal-400 border border-teal-500/30",
    typescript: "bg-blue-400/15 text-blue-300 border border-blue-400/30",
    node:       "bg-green-600/15 text-green-400 border border-green-600/30",
    python:     "bg-yellow-400/15 text-yellow-300 border border-yellow-400/30",
    php:        "bg-purple-500/15 text-purple-400 border border-purple-500/30",
    default:    "bg-gray-700/50 text-gray-300 border border-gray-600/40",
};
function techBadgeClass(tech) {
    return TECH_COLORS[(tech || "").toLowerCase()] || TECH_COLORS.default;
}

function buildTechBadges(techs = []) {
    return techs.map(t => `<span class="tech-badge ${techBadgeClass(t)}">${escapeHtml(t)}</span>`).join("");
}

// ─── Fetch Data ───────────────────────────────────────────────
async function fetchCategoriesTree() {
    const { data: cats, error: catErr } = await supabase
        .from("library_categories")
        .select("id, name, icon, sort_order")
        .order("sort_order", { ascending: true });

    if (catErr) throw catErr;

    const { data: subs, error: subErr } = await supabase
        .from("library_subcategories")
        .select("id, name, category_id, sort_order")
        .order("sort_order", { ascending: true });

    if (subErr) throw subErr;

    return (cats || []).map(cat => ({
        ...cat,
        subcategories: (subs || []).filter(s => s.category_id === cat.id),
    }));
}

async function fetchAllItems() {
    const { data, error } = await supabase
        .from("library_items")
        .select(`
            id,
            title,
            short_description,
            main_image,
            technologies,
            created_at,
            updated_at,
            library_subcategories (
                id,
                name,
                library_categories (
                    id,
                    name
                )
            ),
            library_item_media (
                media_url,
                sort_order
            )
        `)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

// ─── Build Sidebar ────────────────────────────────────────────
function buildSidebar(tree) {
    statCategories.textContent = tree.length;

    accordionRoot.innerHTML = tree.map(cat => {
        const iconClass = cat.icon || "fa-solid fa-folder";
        const hasSubs   = cat.subcategories.length > 0;
        return `
        <div class="category-group" data-cat-id="${cat.id}">
            <button class="cat-header w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-300 hover:text-white hover:bg-gray-800/60 transition text-left"
                    data-cat-id="${cat.id}" data-cat-name="${escapeHtml(cat.name)}">
                <span class="flex items-center gap-2.5">
                    <i class="${iconClass} text-amber-500/70 w-4 text-center"></i>
                    ${escapeHtml(cat.name)}
                </span>
                ${hasSubs ? `<i class="fa-solid fa-chevron-down category-chevron text-xs text-gray-600 flex-shrink-0"></i>` : ""}
            </button>
            ${hasSubs ? `
            <div class="category-content pl-2 mt-0.5">
                ${cat.subcategories.map(sub => `
                <button class="sub-item w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-amber-400 hover:bg-amber-500/8 transition text-left"
                        data-sub-id="${sub.id}" data-sub-name="${escapeHtml(sub.name)}" data-cat-id="${cat.id}" data-cat-name="${escapeHtml(cat.name)}">
                    <i class="fa-solid fa-angle-right text-gray-700 w-2 flex-shrink-0"></i>
                    ${escapeHtml(sub.name)}
                </button>`).join("")}
            </div>` : ""}
        </div>`;
    }).join("");

    bindSidebarEvents();
}

function bindSidebarEvents() {
    // Category headers — toggle accordion + filter
    accordionRoot.querySelectorAll(".cat-header").forEach(btn => {
        btn.addEventListener("click", () => {
            const catId   = btn.dataset.catId;
            const catName = btn.dataset.catName;
            const group   = btn.closest(".category-group");
            const content = group?.querySelector(".category-content");
            const chevron = btn.querySelector(".category-chevron");

            // Toggle accordion
            if (content) {
                const isOpen = content.classList.contains("open");
                // Close all
                accordionRoot.querySelectorAll(".category-content").forEach(c => c.classList.remove("open"));
                accordionRoot.querySelectorAll(".category-chevron").forEach(c => c.classList.remove("open"));
                if (!isOpen) { content.classList.add("open"); chevron?.classList.add("open"); }
            }

            // Set active category filter
            setActiveCategory(catId, catName);
            activeSubcategory = null;
        });
    });

    // Subcategory items
    accordionRoot.querySelectorAll(".sub-item").forEach(btn => {
        btn.addEventListener("click", () => {
            const subId   = btn.dataset.subId;
            const subName = btn.dataset.subName;
            const catId   = btn.dataset.catId;
            const catName = btn.dataset.catName;

            // Highlight
            accordionRoot.querySelectorAll(".sub-item").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            setActiveCategory(catId, catName);
            activeSubcategory = { id: subId, name: subName };
            categoryTitle.textContent = subName;
            applyFilters();
            closeMobileSidebar();
        });
    });
}

function setActiveCategory(catId, catName) {
    activeCategory = { id: catId, name: catName };
    categoryTitle.textContent = catName;
    currentPage = 1;
    quickFilter = "all";
    // Reset quick filter UI
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    document.querySelector(".filter-btn[data-filter='all']")?.classList.add("active");
    // Reset "All" button highlight
    allCategoryBtn.classList.remove("active");
    // Highlight active cat header
    accordionRoot.querySelectorAll(".cat-header").forEach(b => {
        b.classList.toggle("active", b.dataset.catId === catId);
    });
    applyFilters();
    closeMobileSidebar();
}

// ─── Filtering & Search ───────────────────────────────────────
function applyFilters() {
    let result = [...allItems];

    // Category filter
    if (activeCategory) {
        result = result.filter(item =>
            item.library_subcategories?.library_categories?.id === activeCategory.id
        );
    }

    // Subcategory filter
    if (activeSubcategory) {
        result = result.filter(item =>
            item.library_subcategories?.id === activeSubcategory.id
        );
    }

    // Quick filter (tech keyword)
    if (quickFilter && quickFilter !== "all") {
        result = result.filter(item => {
            const techs = (item.technologies || []).map(t => t.toLowerCase());
            const catName = (item.library_subcategories?.library_categories?.name || "").toLowerCase();
            return techs.includes(quickFilter) || catName.includes(quickFilter);
        });
    }

    // Search
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        result = result.filter(item =>
            (item.title || "").toLowerCase().includes(q) ||
            (item.short_description || "").toLowerCase().includes(q) ||
            (item.technologies || []).some(t => t.toLowerCase().includes(q)) ||
            (item.library_subcategories?.name || "").toLowerCase().includes(q) ||
            (item.library_subcategories?.library_categories?.name || "").toLowerCase().includes(q)
        );
    }

    // Sort
    if (sortMode === "latest") {
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortMode === "oldest") {
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortMode === "name") {
        result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    }

    filteredItems = result;
    currentPage   = 1;
    renderCards();
    renderPagination();
}

// ─── Render Cards ─────────────────────────────────────────────
function renderCards() {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const page  = filteredItems.slice(start, start + ITEMS_PER_PAGE);

    resultsCount.textContent = `${filteredItems.length} resource${filteredItems.length !== 1 ? "s" : ""} found`;

    if (!page.length) {
        grid.innerHTML = `
            <div class="col-span-full py-20 flex flex-col items-center gap-4 text-center">
                <div class="empty-icon w-20 h-20 rounded-2xl flex items-center justify-center text-amber-500/60 text-3xl">
                    <i class="fa-solid fa-box-open"></i>
                </div>
                <h3 class="text-lg font-semibold text-gray-400">No resources found</h3>
                <p class="text-sm text-gray-600 max-w-xs">
                    Try adjusting your search query or clearing the filters.
                </p>
                <button id="resetFiltersBtn" class="mt-2 px-5 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-xl text-sm font-semibold hover:bg-amber-500/20 transition">
                    Reset Filters
                </button>
            </div>`;
        document.getElementById("resetFiltersBtn")?.addEventListener("click", resetFilters);
        return;
    }

    const favs = getFavs();
    grid.innerHTML = page.map(item => buildCard(item, favs)).join("");

    // Bind fav buttons
    grid.querySelectorAll(".lib-fav-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            e.preventDefault();
            e.stopPropagation();
            const id    = btn.dataset.id;
            const added = toggleFav(id);
            const icon  = btn.querySelector("i");
            icon.className = added ? "fa-solid fa-bookmark text-amber-500" : "fa-regular fa-bookmark";
            btn.classList.add("fav-pulse");
            setTimeout(() => btn.classList.remove("fav-pulse"), 400);
        });
    });
}

function buildCard(item, favs) {
    const sub      = item.library_subcategories;
    const cat      = sub?.library_categories;
    
    // Sort media by sort_order and fallback to the first one if main_image is empty
    const media = item.library_item_media ? [...item.library_item_media].sort((a,b) => a.sort_order - b.sort_order) : [];
    const image    = item.main_image || (media.length > 0 ? media[0].media_url : "");
    const techs    = item.technologies || [];
    const favored  = favs.includes(item.id);
    const subLabel = sub?.name ? `<span class="tech-badge bg-gray-700/50 text-gray-300 border border-gray-600/40">${escapeHtml(sub.name)}</span>` : "";

    return `
    <a href="./library-details.html?id=${item.id}" class="lib-card rounded-2xl flex flex-col group block">
        <!-- Image -->
        <div class="relative overflow-hidden h-48 bg-gray-800 rounded-t-2xl flex-shrink-0">
            ${image
                ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.title)}"
                       class="w-full h-full object-cover group-hover:scale-105 transition duration-400"
                       loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                   <div class="w-full h-full flex items-center justify-center text-gray-600 hidden" style="display: none;">
                        <i class="fa-solid fa-image text-3xl"></i>
                   </div>`
                : `<div class="w-full h-full flex items-center justify-center text-gray-600">
                        <i class="fa-solid fa-code text-3xl"></i>
                   </div>`}
            <!-- Category badge overlay -->
            ${cat?.name ? `<span class="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/70 text-amber-400 border border-amber-500/30 backdrop-blur-sm">
                ${escapeHtml(cat.name)}</span>` : ""}
            <!-- Fav button -->
            <button class="lib-fav-btn absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 border border-gray-700 flex items-center justify-center hover:border-amber-500 transition backdrop-blur-sm" data-id="${item.id}" aria-label="Save to favorites">
                <i class="${favored ? "fa-solid text-amber-500" : "fa-regular text-gray-400"} fa-bookmark text-xs"></i>
            </button>
        </div>

        <!-- Body -->
        <div class="relative z-10 p-5 flex flex-col gap-3 flex-1">
            <!-- Subcategory + tech badges -->
            <div class="flex flex-wrap gap-1.5">
                ${subLabel}
            </div>

            <h3 class="font-bold text-white text-base leading-snug group-hover:text-amber-400 transition line-clamp-2">
                ${escapeHtml(item.title)}
            </h3>

            <p class="text-gray-400 text-xs leading-relaxed line-clamp-3 flex-1">
                ${escapeHtml(item.short_description || "No description provided.")}
            </p>

            <!-- Tech badges -->
            <div class="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-gray-800">
                ${buildTechBadges(techs.slice(0, 4))}
                ${techs.length > 4 ? `<span class="tech-badge bg-gray-700/40 text-gray-500 border border-gray-700">+${techs.length - 4}</span>` : ""}
            </div>
        </div>
    </a>`;
}

function resetFilters() {
    searchQuery       = "";
    activeCategory    = null;
    activeSubcategory = null;
    quickFilter       = "all";
    searchInput.value = "";
    clearBtn.classList.add("hidden");
    categoryTitle.textContent = "All Resources";
    allCategoryBtn.classList.add("active");
    accordionRoot.querySelectorAll(".cat-header").forEach(b => b.classList.remove("active"));
    accordionRoot.querySelectorAll(".sub-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    document.querySelector(".filter-btn[data-filter='all']")?.classList.add("active");
    applyFilters();
}

// ─── Pagination ───────────────────────────────────────────────
function renderPagination() {
    const total = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
    paginationWrap.classList.toggle("hidden", total <= 1);
    if (total <= 1) return;

    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === total;

    let html = "";
    for (let i = 1; i <= total; i++) {
        if (total > 7 && i > 2 && i < total - 1 && Math.abs(i - currentPage) > 1) {
            if (i === 3 || i === total - 2) html += `<span class="px-2 text-gray-600">…</span>`;
            continue;
        }
        html += `<button class="page-btn ${i === currentPage ? "active" : ""} w-9 h-9 rounded-lg border border-gray-700 text-sm transition hover:border-amber-500 hover:text-amber-500" data-page="${i}">${i}</button>`;
    }
    pageNumbers.innerHTML = html;

    pageNumbers.querySelectorAll(".page-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentPage = parseInt(btn.dataset.page);
            renderCards();
            renderPagination();
            window.scrollTo({ top: 300, behavior: "smooth" });
        });
    });
}

// ─── Mobile Sidebar ───────────────────────────────────────────
function openMobileSidebar() {
    sidebar.classList.add("mobile-open");
    sidebarOverlay.classList.add("show");
    document.body.style.overflow = "hidden";
}
function closeMobileSidebar() {
    sidebar.classList.remove("mobile-open");
    sidebarOverlay.classList.remove("show");
    document.body.style.overflow = "";
}

// ─── Init ─────────────────────────────────────────────────────
async function init() {
    // Wire events
    searchInput.addEventListener("input", () => {
        searchQuery = searchInput.value.trim();
        clearBtn.classList.toggle("hidden", !searchQuery);
        currentPage = 1;
        applyFilters();
    });

    clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        searchQuery = "";
        clearBtn.classList.add("hidden");
        applyFilters();
    });

    sortSelect.addEventListener("change", () => {
        sortMode = sortSelect.value;
        applyFilters();
    });

    prevPageBtn.addEventListener("click", () => {
        if (currentPage > 1) { currentPage--; renderCards(); renderPagination(); window.scrollTo({ top: 300, behavior: "smooth" }); }
    });
    nextPageBtn.addEventListener("click", () => {
        const total = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
        if (currentPage < total) { currentPage++; renderCards(); renderPagination(); window.scrollTo({ top: 300, behavior: "smooth" }); }
    });

    // All category button
    allCategoryBtn.addEventListener("click", () => {
        activeCategory = null;
        activeSubcategory = null;
        categoryTitle.textContent = "All Resources";
        allCategoryBtn.classList.add("active");
        accordionRoot.querySelectorAll(".cat-header").forEach(b => b.classList.remove("active"));
        accordionRoot.querySelectorAll(".sub-item").forEach(b => b.classList.remove("active"));
        accordionRoot.querySelectorAll(".category-content").forEach(c => c.classList.remove("open"));
        accordionRoot.querySelectorAll(".category-chevron").forEach(c => c.classList.remove("open"));
        currentPage = 1;
        applyFilters();
        closeMobileSidebar();
    });

    // Quick filters
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            quickFilter = btn.dataset.filter;
            currentPage = 1;
            applyFilters();
        });
    });

    // Mobile sidebar
    sidebarToggle?.addEventListener("click", openMobileSidebar);
    closeSidebarBtn?.addEventListener("click", closeMobileSidebar);
    sidebarOverlay?.addEventListener("click", closeMobileSidebar);

    // Fetch
    try {
        const [tree, items] = await Promise.all([fetchCategoriesTree(), fetchAllItems()]);

        buildSidebar(tree);
        allItems = items;
        statItems.textContent = items.length;
        statFavs.textContent  = getFavs().length;

        applyFilters();
    } catch (err) {
        console.error("Library load error:", err);
        grid.innerHTML = `
            <div class="col-span-full py-20 text-center text-red-400">
                <i class="fa-solid fa-triangle-exclamation text-3xl mb-3 block"></i>
                <p class="font-semibold">Failed to load library</p>
                <p class="text-sm text-gray-500 mt-1">${escapeHtml(err?.message || "Unknown error")}</p>
            </div>`;
    }

    renderRecentlyViewed();
}

window.addEventListener("load", () => {
    document.getElementById("pageLoader")?.classList.add("hidden");
    init();
});
