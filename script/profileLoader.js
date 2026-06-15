// ═════════════════════════════════════════════════════════════
// Profile Loader – index.html
// Fetches the admin user's profile from Supabase and hydrates
// all profile elements on the public-facing portfolio page.
// ═════════════════════════════════════════════════════════════

import { supabase } from './supabase.js';

// ─────────────────────────────────────────────────────────────
// Fetch admin profile from Supabase (queries profile_settings)
// Gets the profile_settings of the admin (ordered by created_at ascending)
// ─────────────────────────────────────────────────────────────
async function fetchAdminProfile() {
    if (!supabase) {
        console.warn('[ProfileLoader] Supabase not configured.');
        return null;
    }

    // Query profile_settings and inner join users to filter by admin role
    const { data: ps, error } = await supabase
        .from('profile_settings')
        .select(`
            bio, specialization, skills, contact_links, cv_url, theme, language,
            users!inner (
                id, name, avatar, role
            )
        `)
        .eq('users.role', 'admin')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('[ProfileLoader] Failed to fetch profile settings:', error.message);
        return null;
    }

    if (!ps) {
        console.warn('[ProfileLoader] No admin profile settings found.');
        return null;
    }

    // Merge and return in the expected format
    return {
        id:            ps.users.id,
        name:          ps.users.name          || '',
        avatar:        ps.users.avatar        || null,
        bio:           ps.bio                 || '',
        specialization: ps.specialization     || '',
        skills:        Array.isArray(ps.skills)        ? ps.skills        : [],
        contact_links: Array.isArray(ps.contact_links) ? ps.contact_links : [],
        cv_url:        ps.cv_url              || null,
        theme:         ps.theme               || 'dark',
        language:      ps.language            || 'en'
    };
}

// ─────────────────────────────────────────────────────────────
// Hydrate index.html with fetched profile data
// ─────────────────────────────────────────────────────────────
function hydrateProfile(profile) {
    if (!profile) return;

    // ── Name ──────────────────────────────────────────────
    if (profile.name) {
        const heroName = document.getElementById('profile-hero-name');
        if (heroName) heroName.textContent = profile.name;

        const cardName = document.getElementById('profile-card-name');
        if (cardName) cardName.textContent = profile.name;

        const footerName = document.getElementById('footer-profile-name');
        if (footerName) footerName.textContent = profile.name;

        // Navbar brand
        const navBrand = document.querySelector('nav h3');
        if (navBrand) navBrand.textContent = profile.name;

        // Page title
        document.title = profile.name;
    }

    // ── Specialization ────────────────────────────────────
    if (profile.specialization) {
        const cardSpec = document.getElementById('profile-card-spec');
        if (cardSpec) cardSpec.textContent = profile.specialization;

        const footerSpec = document.getElementById('footer-profile-spec');
        if (footerSpec) footerSpec.textContent = profile.specialization;
    }

    // ── Bio ───────────────────────────────────────────────
    if (profile.bio) {
        const heroBio = document.getElementById('profile-hero-bio');
        if (heroBio) heroBio.textContent = profile.bio;
    }

    // ── Avatar ────────────────────────────────────────────
    if (profile.avatar) {
        const avatarImg = document.getElementById('profile-avatar-img');
        if (avatarImg) avatarImg.src = profile.avatar;
    }

    // ── CV Link ───────────────────────────────────────────
    if (profile.cv_url) {
        const cvLink = document.getElementById('profile-cv-link');
        if (cvLink) {
            cvLink.href = profile.cv_url;
            cvLink.removeAttribute('download'); // open in new tab
            cvLink.setAttribute('target', '_blank');
            cvLink.setAttribute('rel', 'noopener noreferrer');
        }
    }

    // ── Skills ────────────────────────────────────────────
    if (Array.isArray(profile.skills) && profile.skills.length > 0) {
        hydrateSkills(profile.skills);
    }

    // ── Contact Links ─────────────────────────────────────
    if (Array.isArray(profile.contact_links) && profile.contact_links.length > 0) {
        hydrateContactLinks(profile.contact_links);
    }
}

function hydrateSkills(skills) {
    const slider = document.getElementById('skillsSlider');
    if (!slider) return;

    // Build pages of 9 skills each
    const pages = [];
    for (let i = 0; i < skills.length; i += 9) {
        pages.push(skills.slice(i, i + 9));
    }

    slider.innerHTML = '';
    pages.forEach(pageSkills => {
        const page = document.createElement('div');
        page.className = 'grid grid-cols-3 gap-6 text-center min-w-full snap-start';

        pageSkills.forEach(skill => {
            page.innerHTML += `
                <div class="flex flex-col items-center gap-2 hover:scale-110 transition">
                    <i class="${skill.icon} text-3xl text-amber-500"></i>
                    <span class="text-sm text-gray-400">${skill.name}</span>
                </div>`;
        });

        slider.appendChild(page);
    });

    // Rebuild dots
    const dotsContainer = document.getElementById('dots');
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        pages.forEach(() => {
            const dot = document.createElement('span');
            dot.className = 'dot w-2.5 h-2.5 rounded-full bg-gray-600';
            dotsContainer.appendChild(dot);
        });
    }
}

function hydrateContactLinks(links) {
    // ── Hero card social icons ────────────────────────────
    const heroIcons = document.getElementById('profile-social-icons');
    if (heroIcons) {
        heroIcons.innerHTML = '';
        links.forEach(link => {
            heroIcons.innerHTML += `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" title="${link.label}">
                    <i class="${link.icon} border border-gray-600 p-3 rounded-lg hover:bg-amber-500 hover:text-black transition transform hover:scale-110 cursor-pointer"></i>
                </a>`;
        });
    }

    // ── Footer social icons ───────────────────────────────
    const footerIcons = document.getElementById('footer-social-icons');
    if (footerIcons) {
        footerIcons.innerHTML = '';
        links.forEach(link => {
            footerIcons.innerHTML += `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="hover:text-amber-500 transition" title="${link.label}">
                    <i class="${link.icon}"></i>
                </a>`;
        });
    }
}

// ─────────────────────────────────────────────────────────────
// Entry point – runs on DOMContentLoaded
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const profile = await fetchAdminProfile();
        hydrateProfile(profile);
    } catch (err) {
        console.error('[ProfileLoader] Unexpected error:', err);
    }
});
