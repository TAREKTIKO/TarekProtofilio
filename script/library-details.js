// ============================================================
// library-details.js — Library Item Details Page Logic
// ============================================================
import { supabase } from "./supabase.js";

// ─── Constants ───────────────────────────────────────────────
const FAV_KEY    = "lib_favorites";
const RECENT_KEY = "lib_recently_viewed";
const RECENT_MAX = 6;
const DESC_LIMIT = 180;

// ─── Helpers ─────────────────────────────────────────────────
function escapeHtml(str = "") {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
}

function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
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

const LINK_ICONS = {
    download_zip:  { icon: "fa-solid fa-file-zipper",  label: "Download ZIP",    cls: "action-btn-primary" },
    github:        { icon: "fa-brands fa-github",       label: "GitHub Repo",     cls: "action-btn-secondary" },
    demo:          { icon: "fa-solid fa-rocket",         label: "Live Demo",       cls: "action-btn-primary" },
    doc:           { icon: "fa-solid fa-file-pdf",       label: "Documentation",   cls: "action-btn-secondary" },
    source:        { icon: "fa-solid fa-code",           label: "Source Code",     cls: "action-btn-secondary" },
    default:       { icon: "fa-solid fa-link",           label: "Visit Link",      cls: "action-btn-secondary" },
};
function getLinkMeta(type) {
    return LINK_ICONS[type] || LINK_ICONS.default;
}

// ─── Favorites ───────────────────────────────────────────────
function getFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch { return []; }
}
function toggleFav(id) {
    let favs = getFavs();
    const idx = favs.indexOf(id);
    if (idx === -1) favs.push(id); else favs.splice(idx, 1);
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    return idx === -1;
}
function isFav(id) { return getFavs().includes(id); }

// ─── Recently Viewed ─────────────────────────────────────────
function addRecentlyViewed(item) {
    try {
        let recent = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        recent = recent.filter(r => r.id !== item.id);
        recent.unshift({ id: item.id, title: item.title });
        if (recent.length > RECENT_MAX) recent = recent.slice(0, RECENT_MAX);
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    } catch {}
}

// ─── Fetch ────────────────────────────────────────────────────
async function fetchItem(id) {
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
                library_categories ( id, name )
            ),
            library_item_media ( id, media_url, sort_order ),
            library_item_sections ( id, title, description, code_content, code_language, notes, sort_order ),
            library_item_links ( id, title, url, link_type, sort_order )
        `)
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
}

async function fetchRelated(subcategoryId, currentId) {
    const { data } = await supabase
        .from("library_items")
        .select(`
            id, title, short_description, main_image, technologies,
            library_subcategories ( name, library_categories ( name ) )
        `)
        .eq("library_subcategories.id", subcategoryId) // filter via join
        .neq("id", currentId)
        .limit(4);
    return data || [];
}

// ─── Gallery ─────────────────────────────────────────────────
let galleryImages   = [];
let galleryIndex    = 0;

function initGallery(images) {
    galleryImages = images;
    const track   = document.getElementById("galleryTrack");
    const thumbs  = document.getElementById("thumbStrip");
    const counter = document.getElementById("galleryCounter");
    const prevBtn = document.getElementById("galleryPrev");
    const nextBtn = document.getElementById("galleryNext");

    if (!images.length) {
        track.innerHTML = `<div class="gallery-slide"><div class="w-full h-96 bg-gray-800 rounded-2xl flex items-center justify-center text-gray-600"><i class="fa-solid fa-image text-5xl"></i></div></div>`;
        document.getElementById("galleryPrev").classList.add("hidden");
        document.getElementById("galleryNext").classList.add("hidden");
        return;
    }

    // Build slides
    track.innerHTML = images.map((img, i) => `
        <div class="gallery-slide">
            <img src="${escapeHtml(img)}" alt="Screenshot ${i + 1}" loading="${i === 0 ? "eager" : "lazy"}"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="w-full h-[420px] bg-gray-800 rounded-2xl flex items-center justify-center text-gray-600 hidden" style="display: none;">
                 <i class="fa-solid fa-image text-4xl"></i>
            </div>
        </div>`).join("");

    // Build thumbnails
    thumbs.innerHTML = images.map((img, i) => `
        <img src="${escapeHtml(img)}" alt="Thumbnail ${i + 1}" class="thumb ${i === 0 ? "active" : ""}" data-index="${i}" loading="lazy"
             onerror="this.style.display='none'">`).join("");

    const updateGallery = () => {
        track.style.transform = `translateX(-${galleryIndex * 100}%)`;
        counter.textContent   = `${galleryIndex + 1} / ${images.length}`;
        thumbs.querySelectorAll(".thumb").forEach((t, i) => t.classList.toggle("active", i === galleryIndex));
        prevBtn.style.opacity = galleryIndex === 0 ? "0.4" : "1";
        nextBtn.style.opacity = galleryIndex === images.length - 1 ? "0.4" : "1";
    };

    prevBtn.addEventListener("click", () => {
        if (galleryIndex > 0) { galleryIndex--; updateGallery(); }
    });
    nextBtn.addEventListener("click", () => {
        if (galleryIndex < images.length - 1) { galleryIndex++; updateGallery(); }
    });

    thumbs.querySelectorAll(".thumb").forEach(t => {
        t.addEventListener("click", () => { galleryIndex = parseInt(t.dataset.index); updateGallery(); });
    });

    // Click image → lightbox
    track.querySelectorAll("img").forEach((img, i) => {
        img.addEventListener("click", () => openLightbox(i));
    });

    // Swipe support
    let touchStartX = 0;
    track.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener("touchend", e => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) {
            if (dx < 0 && galleryIndex < images.length - 1) galleryIndex++;
            if (dx > 0 && galleryIndex > 0) galleryIndex--;
            updateGallery();
        }
    });

    updateGallery();
}

// ─── Lightbox ─────────────────────────────────────────────────
function openLightbox(index) {
    galleryIndex = index;
    const lb  = document.getElementById("lightbox");
    const img = document.getElementById("lightboxImg");
    img.src   = galleryImages[index] || "";
    lb.classList.add("show");
    document.body.style.overflow = "hidden";
}
function closeLightbox() {
    document.getElementById("lightbox").classList.remove("show");
    document.body.style.overflow = "";
}

function initLightbox() {
    document.getElementById("lightboxClose")?.addEventListener("click", closeLightbox);
    document.getElementById("lightbox")?.addEventListener("click", e => {
        if (e.target === document.getElementById("lightbox")) closeLightbox();
    });
    document.getElementById("lightboxPrev")?.addEventListener("click", () => {
        if (galleryIndex > 0) { galleryIndex--; document.getElementById("lightboxImg").src = galleryImages[galleryIndex]; }
    });
    document.getElementById("lightboxNext")?.addEventListener("click", () => {
        if (galleryIndex < galleryImages.length - 1) { galleryIndex++; document.getElementById("lightboxImg").src = galleryImages[galleryIndex]; }
    });
    document.addEventListener("keydown", e => {
        if (!document.getElementById("lightbox").classList.contains("show")) return;
        if (e.key === "Escape") closeLightbox();
        if (e.key === "ArrowLeft" && galleryIndex > 0) { galleryIndex--; document.getElementById("lightboxImg").src = galleryImages[galleryIndex]; }
        if (e.key === "ArrowRight" && galleryIndex < galleryImages.length - 1) { galleryIndex++; document.getElementById("lightboxImg").src = galleryImages[galleryIndex]; }
    });
}

// ─── Content Sections ─────────────────────────────────────────
function buildSections(sections = []) {
    const container = document.getElementById("sectionsContainer");
    if (!sections.length) { container.innerHTML = `<p class="text-gray-500 text-sm italic">No content sections available yet.</p>`; return; }

    container.innerHTML = sections
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map((sec, idx) => buildSection(sec, idx))
        .join("");

    // Bind show more
    container.querySelectorAll(".show-more-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const desc    = btn.closest(".section-card").querySelector(".section-desc");
            const codeEl  = btn.closest(".section-card").querySelector(".collapsible-code");
            const isOpen  = btn.dataset.open === "true";
            if (desc) desc.classList.toggle("collapsed", isOpen);
            if (codeEl) codeEl.classList.toggle("collapsed", isOpen);
            btn.textContent = isOpen ? "Show More" : "Show Less";
            btn.dataset.open = String(!isOpen);
        });
    });

    // Bind copy buttons
    container.querySelectorAll(".copy-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const code = btn.dataset.code;
            navigator.clipboard.writeText(code || "").then(() => {
                btn.textContent = "✓ Copied!";
                btn.classList.add("copied");
                setTimeout(() => { btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy'; btn.classList.remove("copied"); }, 2000);
            });
        });
    });

    // Re-highlight with Prism
    if (typeof Prism !== "undefined") Prism.highlightAll();
}

function buildSection(sec, idx) {
    const hasCode  = sec.code_content && sec.code_content.trim().length > 0;
    const hasDesc  = sec.description && sec.description.trim().length > 0;
    const hasNotes = sec.notes && sec.notes.trim().length > 0;
    const longDesc = hasDesc && sec.description.length > DESC_LIMIT;
    const lang     = (sec.code_language || "markup").toLowerCase();
    const prismLang = { html: "markup", css: "css", js: "javascript", javascript: "javascript", jsx: "jsx", bash: "bash", shell: "bash" }[lang] || "markup";
    const codeEncoded = hasCode ? escapeHtml(sec.code_content) : "";

    return `
    <div class="section-card">
        <!-- Section header -->
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-800/60">
            <h3 class="font-bold text-white flex items-center gap-2.5">
                <span class="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 text-xs font-mono font-bold flex-shrink-0">
                    ${idx + 1}
                </span>
                ${escapeHtml(sec.title)}
            </h3>
        </div>

        <!-- Body -->
        <div class="px-5 py-4 space-y-4">
            ${hasDesc ? `
            <div>
                <div class="section-desc ${longDesc ? "collapsed" : ""} text-gray-400 text-sm leading-relaxed">
                    ${escapeHtml(sec.description).replace(/\n/g, "<br>")}
                </div>
                ${longDesc ? `
                <button class="show-more-btn mt-2 text-amber-500 hover:text-amber-400 text-xs font-semibold transition" data-open="false">
                    Show More
                </button>` : ""}
            </div>` : ""}

            ${hasCode ? `
            <div class="code-block-wrapper">
                <div class="flex items-center justify-between px-4 py-2 bg-gray-800/80 border-b border-gray-700/50">
                    <span class="text-xs text-gray-500 font-mono uppercase tracking-wider">${escapeHtml(sec.code_language || "code")}</span>
                    <div class="flex gap-2">
                        <button class="copy-btn" data-code="${codeEncoded}">
                            <i class="fa-regular fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
                <pre class="collapsible-code language-${prismLang} ${sec.code_content.split("\n").length > 20 ? "collapsed" : ""}"><code class="language-${prismLang}">${codeEncoded}</code></pre>
                ${sec.code_content.split("\n").length > 20 ? `
                <div class="flex justify-center py-2 bg-gray-900 border-t border-gray-800">
                    <button class="show-more-btn text-amber-500 hover:text-amber-400 text-xs font-semibold transition" data-open="false">
                        Show More Code
                    </button>
                </div>` : ""}
            </div>` : ""}

            ${hasNotes ? `
            <div class="flex gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
                <i class="fa-solid fa-lightbulb text-amber-500 flex-shrink-0 mt-0.5"></i>
                <p class="text-sm text-gray-400 leading-relaxed">${escapeHtml(sec.notes).replace(/\n/g, "<br>")}</p>
            </div>` : ""}
        </div>
    </div>`;
}

// ─── Links Sidebar ────────────────────────────────────────────
function buildLinks(links = []) {
    const card = document.getElementById("linksCard");
    const list = document.getElementById("linksList");
    if (!links.length) { card.classList.add("hidden"); return; }
    card.classList.remove("hidden");

    list.innerHTML = links
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        .map(link => {
            const meta = getLinkMeta(link.link_type);
            const isDownload = link.link_type?.startsWith("download");
            return `
            <a href="${escapeHtml(link.url)}" 
               ${isDownload ? "download" : 'target="_blank" rel="noopener noreferrer"'}
               class="action-btn ${meta.cls} w-full justify-center">
                <i class="${meta.icon}"></i>
                ${escapeHtml(link.title || meta.label)}
            </a>`;
        }).join("");
}

// ─── Related Resources ────────────────────────────────────────
function buildRelated(items) {
    const section = document.getElementById("relatedSection");
    const grid    = document.getElementById("relatedGrid");
    if (!items.length) { section.classList.add("hidden"); return; }
    section.classList.remove("hidden");

    grid.innerHTML = items.map(item => {
        const sub  = item.library_subcategories;
        const cat  = sub?.library_categories;
        const img  = item.main_image;
        const techs = (item.technologies || []).slice(0, 3);
        return `
        <a href="./library-details.html?id=${item.id}" class="related-card block group">
            <div class="h-36 bg-gray-800 overflow-hidden">
                ${img
                    ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(item.title)}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" loading="lazy">`
                    : `<div class="w-full h-full flex items-center justify-center text-gray-700"><i class="fa-solid fa-code text-2xl"></i></div>`}
            </div>
            <div class="p-4">
                ${cat?.name ? `<span class="text-xs text-amber-500/80 font-semibold">${escapeHtml(cat.name)}</span>` : ""}
                <h4 class="text-sm font-bold text-white mt-1 mb-2 line-clamp-2 group-hover:text-amber-400 transition">${escapeHtml(item.title)}</h4>
                <div class="flex flex-wrap gap-1">
                    ${techs.map(t => `<span class="tech-badge ${techBadgeClass(t)}">${escapeHtml(t)}</span>`).join("")}
                </div>
            </div>
        </a>`;
    }).join("");
}

// ─── Populate Header ──────────────────────────────────────────
function populateHeader(item) {
    const sub = item.library_subcategories;
    const cat = sub?.library_categories;

    // Title
    document.getElementById("detailTitle").textContent      = item.title || "—";
    document.title = `${item.title || "Library Item"} | Tarek Ahmed`;
    document.getElementById("detailShortDesc").textContent  = item.short_description || "";

    // Breadcrumb
    document.getElementById("breadcrumbCategory").textContent = cat?.name || "Library";
    document.getElementById("breadcrumbTitle").textContent    = item.title || "—";

    // Badges
    const badgesEl = document.getElementById("detailBadges");
    badgesEl.innerHTML = [
        cat?.name  ? `<span class="tech-badge bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm px-3 py-1">${escapeHtml(cat.name)}</span>` : "",
        sub?.name  ? `<span class="tech-badge bg-gray-700/60 text-gray-300 border border-gray-600/40 text-sm px-3 py-1">${escapeHtml(sub.name)}</span>` : "",
    ].join("");

    // Tech tags
    const tagsEl = document.getElementById("detailTechTags");
    tagsEl.innerHTML = (item.technologies || []).map(t =>
        `<span class="tech-badge ${techBadgeClass(t)} text-sm px-3 py-1">${escapeHtml(t)}</span>`
    ).join("");

    // Date
    const dateStr = formatDate(item.updated_at || item.created_at);
    document.getElementById("detailUpdated").innerHTML = `<i class="fa-solid fa-calendar-days text-amber-500/70"></i> Last updated: ${dateStr}`;

    // Sidebar info
    document.getElementById("infoCategory").textContent    = cat?.name || "—";
    document.getElementById("infoSubcategory").textContent = sub?.name || "—";
    document.getElementById("infoUpdated").textContent     = dateStr;

    // Fav button
    const favBtn = document.getElementById("detailFavBtn");
    const updateFavBtn = (fav) => {
        favBtn.innerHTML = fav
            ? `<i class="fa-solid fa-bookmark text-amber-500"></i> Saved`
            : `<i class="fa-regular fa-bookmark"></i> Save`;
        favBtn.classList.toggle("border-amber-500", fav);
        favBtn.classList.toggle("text-amber-500", fav);
    };
    updateFavBtn(isFav(item.id));
    favBtn.addEventListener("click", () => {
        const now = toggleFav(item.id);
        updateFavBtn(now);
        favBtn.classList.add("fav-pulse");
        setTimeout(() => favBtn.classList.remove("fav-pulse"), 400);
    });
}

// ─── Main Init ────────────────────────────────────────────────
async function init() {
    const params = new URLSearchParams(window.location.search);
    const id     = params.get("id");

    if (!id) {
        document.getElementById("detailTitle").textContent = "Item not found";
        document.getElementById("sectionsContainer").innerHTML = `
            <p class="text-red-400">No item ID specified. <a href="./library.html" class="text-amber-500 underline">Return to Library</a></p>`;
        return;
    }

    initLightbox();

    try {
        const item = await fetchItem(id);

        // Track recently viewed
        addRecentlyViewed(item);

        // Populate header
        populateHeader(item);

        // Build gallery
        const galleryMedia = (item.library_item_media || [])
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            .map(m => m.media_url);
        // Prepend main image if not in gallery
        const mainImg = item.main_image;
        if (mainImg && !galleryMedia.includes(mainImg)) galleryMedia.unshift(mainImg);
        initGallery(galleryMedia);

        // Build sections
        buildSections(item.library_item_sections || []);

        // Build links
        buildLinks(item.library_item_links || []);

        // Fetch related
        if (item.library_subcategories?.id) {
            const related = await fetchRelated(item.library_subcategories.id, id);
            buildRelated(related);
        }

    } catch (err) {
        console.error("Error loading item:", err);
        document.getElementById("detailTitle").textContent = "Failed to load item";
        document.getElementById("sectionsContainer").innerHTML = `
            <div class="text-red-400 text-sm">
                <i class="fa-solid fa-triangle-exclamation mr-2"></i>
                ${escapeHtml(err?.message || "Unknown error")}
                <br><a href="./library.html" class="text-amber-500 underline mt-2 inline-block">← Back to Library</a>
            </div>`;
    }
}

window.addEventListener("load", () => {
    document.getElementById("pageLoader")?.classList.add("hidden");
    init();
});
