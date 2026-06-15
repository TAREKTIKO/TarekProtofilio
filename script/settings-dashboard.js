// ═════════════════════════════════════════════════════════════
// Settings Dashboard Module
// Profile Settings  → users (name, avatar)
//                   + profile_settings (bio, spec, skills, links, cv_url)
// Appearance Settings → profile_settings (theme, language)
// ═════════════════════════════════════════════════════════════

// ── In-memory profile state ──────────────────────────────────
let profileData = {
    id: null,
    name: '',
    specialization: '',
    bio: '',
    avatar: null,
    skills: [],        // [{name, icon}, ...]
    contactLinks: [],  // [{label, url, icon}, ...]
    cvUrl: null
};

// Staged files (uploaded to Storage only when Save is clicked)
let stagedAvatarFile = null;
let stagedCvFile     = null;

// Appearance
let appearanceData = {
    theme:    localStorage.getItem('dashboardTheme')    || 'dark',
    language: localStorage.getItem('dashboardLanguage') || 'en'
};

// Supabase Storage bucket names
const AVATAR_BUCKET = 'avatars';
const CV_BUCKET     = 'cvfiles';

// ─────────────────────────────────────────────────────────────
// Sidebar Initialization
// ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const storedName = localStorage.getItem('username') || localStorage.getItem('userName');
    const storedAvatar = localStorage.getItem('avatar') || localStorage.getItem('userAvatar');
    
    if (storedName) {
        const dashUserName = document.getElementById('user-name');
        if (dashUserName) dashUserName.textContent = storedName;
    }
    
    if (storedAvatar) {
        const dashUserImg = document.getElementById('user-img');
        if (dashUserImg) dashUserImg.src = storedAvatar;
    }
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getClient() {
    const c = window.supabaseClient;
    if (!c) throw new Error('Supabase client not ready');
    return c;
}

function showToast(message, type = 'success') {
    const old = document.getElementById('profile-toast');
    if (old) old.remove();

    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600', loading: 'bg-yellow-600' };
    const toast = document.createElement('div');
    toast.id = 'profile-toast';
    toast.className = `fixed bottom-6 right-6 z-[99999] px-5 py-3 rounded-xl text-white text-sm font-medium shadow-xl transition-all duration-300 ${colors[type] || 'bg-gray-700'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    if (type !== 'loading') setTimeout(() => toast.remove(), 3500);
    return toast;
}

async function uploadFileToStorage(bucket, file, userId) {
    const client = getClient();
    const ext  = file.name.split('.').pop();
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await client.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────
// DB – GET: users JOIN profile_settings
// ─────────────────────────────────────────────────────────────

async function fetchProfileFromDB() {
    const client = getClient();
    const userId = localStorage.getItem('userId');
    if (!userId) throw new Error('User not logged in');

    // 1. Base user data
    const { data: user, error: userErr } = await client
        .from('users')
        .select('id, name, avatar')
        .eq('id', userId)
        .single();
    if (userErr) throw userErr;

    // 2. Profile settings (may not exist yet → maybeSingle)
    const { data: ps, error: psErr } = await client
        .from('profile_settings')
        .select('bio, specialization, skills, contact_links, cv_url, theme, language')
        .eq('user_id', userId)
        .maybeSingle();
    // PGRST116 = "no rows found" which is fine, not a real error
    if (psErr && psErr.code !== 'PGRST116') throw psErr;

    return {
        id:            user.id,
        name:          user.name          || '',
        avatar:        user.avatar        || null,
        bio:           ps?.bio            || '',
        specialization: ps?.specialization || '',
        skills:        Array.isArray(ps?.skills)        ? ps.skills        : [],
        contact_links: Array.isArray(ps?.contact_links) ? ps.contact_links : [],
        cv_url:        ps?.cv_url         || null,
        theme:         ps?.theme          || 'dark',
        language:      ps?.language       || 'en'
    };
}

// ─────────────────────────────────────────────────────────────
// DB – UPDATE users + UPSERT profile_settings
// ─────────────────────────────────────────────────────────────

async function saveProfileToDB(userPayload, profilePayload) {
    const client = getClient();
    const userId = localStorage.getItem('userId');
    if (!userId) throw new Error('User not logged in');

    // Update users row (name, avatar)
    const { data: savedUser, error: userErr } = await client
        .from('users')
        .update(userPayload)
        .eq('id', userId)
        .select('id, name, avatar')
        .single();
    if (userErr) throw userErr;

    // Upsert profile_settings row (keyed by user_id)
    const { data: savedPs, error: psErr } = await client
        .from('profile_settings')
        .upsert(
            { user_id: userId, ...profilePayload, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
        )
        .select()
        .single();
    if (psErr) throw psErr;

    return { ...savedUser, ...savedPs };
}

// ─────────────────────────────────────────────────────────────
// Apply saved data to live page elements (index.html context)
// ─────────────────────────────────────────────────────────────

function applyProfileToPage(data) {
    // Hero name
    const heroName = document.getElementById('profile-hero-name');
    if (heroName && data.name) heroName.textContent = data.name;

    // Hero bio
    const heroBio = document.getElementById('profile-hero-bio');
    if (heroBio && data.bio) heroBio.textContent = data.bio;

    // Card name + spec
    const cardName = document.getElementById('profile-card-name');
    if (cardName && data.name) cardName.textContent = data.name;
    const cardSpec = document.getElementById('profile-card-spec');
    if (cardSpec && data.specialization) cardSpec.textContent = data.specialization;

    // Footer
    const footerName = document.getElementById('footer-profile-name');
    if (footerName && data.name) footerName.textContent = data.name;
    const footerSpec = document.getElementById('footer-profile-spec');
    if (footerSpec && data.specialization) footerSpec.textContent = data.specialization;

    // Avatar
    const avatarImg = document.getElementById('profile-avatar-img');
    if (avatarImg && data.avatar) avatarImg.src = data.avatar;

    // CV link
    if (data.cv_url) {
        const cvLink = document.getElementById('profile-cv-link');
        if (cvLink) {
            cvLink.href = data.cv_url;
            cvLink.setAttribute('target', '_blank');
            cvLink.removeAttribute('download');
        }
    }

    // Skills slider
    if (Array.isArray(data.skills) && data.skills.length > 0) {
        renderSkillsToPage(data.skills);
    }

    // Contact links (hero + footer)
    if (Array.isArray(data.contact_links) && data.contact_links.length > 0) {
        renderContactLinksToPage(data.contact_links);
    }

    // Dashboard sidebar
    const dashUserName = document.getElementById('user-name');
    if (dashUserName && data.name) dashUserName.textContent = data.name;
    const dashUserImg = document.getElementById('user-img');
    if (dashUserImg && data.avatar) dashUserImg.src = data.avatar;
}

function renderSkillsToPage(skills) {
    const slider = document.getElementById('skillsSlider');
    if (!slider) return;
    const pages = [];
    for (let i = 0; i < skills.length; i += 9) pages.push(skills.slice(i, i + 9));
    slider.innerHTML = '';
    pages.forEach(page => {
        const div = document.createElement('div');
        div.className = 'grid grid-cols-3 gap-6 text-center min-w-full snap-start';
        page.forEach(s => {
            div.innerHTML += `
                <div class="flex flex-col items-center gap-2 hover:scale-110 transition">
                    <i class="${s.icon} text-3xl text-amber-500"></i>
                    <span class="text-sm text-gray-400">${s.name}</span>
                </div>`;
        });
        slider.appendChild(div);
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

function renderContactLinksToPage(links) {
    // Hero card icons
    const heroIcons = document.getElementById('profile-social-icons');
    if (heroIcons) {
        heroIcons.innerHTML = '';
        links.forEach(link => {
            heroIcons.innerHTML += `
                <a href="${link.url}" target="_blank" rel="noopener noreferrer">
                    <i class="${link.icon} border border-gray-600 p-3 rounded-lg hover:bg-amber-500 hover:text-black transition transform hover:scale-110 cursor-pointer"></i>
                </a>`;
        });
    }
    // Footer icons
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

// ═════════════════════════════════════════════════════════════
// Mobile Menu Toggle
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const closeSidebar     = document.getElementById('close-sidebar');
    const sidebar          = document.getElementById('sidebar');

    mobileMenuToggle?.addEventListener('click', () => sidebar.classList.toggle('hidden'));
    closeSidebar?.addEventListener('click', () => sidebar.classList.add('hidden'));

    document.querySelectorAll('.flex.flex-col.gap-2.my-8 button').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.innerWidth < 1024) sidebar.classList.add('hidden');
        });
    });
});

// ═════════════════════════════════════════════════════════════
// Navigation Buttons
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const navButtons = document.querySelectorAll('.flex.flex-col.gap-2.my-8 button:not(#settings-dropdown-btn)');

    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            navButtons.forEach(b => { b.classList.remove('bg-yellow-600', 'font-medium'); b.style.color = 'white'; });
            this.classList.add('bg-yellow-600', 'font-medium');
            this.style.color = 'black';

            hideAllContent();
            const t = this.textContent.trim();
            const map = {
                'Main':         ['main-content',         'Dashboard'],
                'Projects':     ['projects-content',     'Projects Management'],
                'Services':     ['services-content',     'Services Management'],
                'Interactions': ['interactions-content', 'Interactions'],
                'Users':        ['users-content',        'Users Management']
            };
            if (map[t]) {
                showContent(map[t][0]);
                document.getElementById('button-name').textContent = map[t][1];
            }
        });
    });
});

function hideAllContent() {
    ['main-content','projects-content','services-content','interactions-content','users-content','settings-content']
        .forEach(id => document.getElementById(id)?.classList.add('hidden'));
}
function showContent(id) {
    document.getElementById(id)?.classList.remove('hidden');
}

// ═════════════════════════════════════════════════════════════
// Dashboard Search
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dashboard-search')?.addEventListener('input', e => searchDashboard(e.target.value.toLowerCase()));
});

function searchDashboard(term) {
    document.getElementById('projects-list')?.querySelectorAll('[data-project-id]').forEach(el => {
        const match = (el.querySelector('h3')?.textContent.toLowerCase() || '').includes(term)
                   || (el.querySelector('p')?.textContent.toLowerCase()  || '').includes(term);
        el.style.display = (match || !term) ? '' : 'none';
    });

    document.querySelectorAll('#services-content .bg-gray-900').forEach(el => {
        const match = (el.querySelector('h3')?.textContent.toLowerCase() || '').includes(term)
                   || (el.querySelector('p')?.textContent.toLowerCase()  || '').includes(term);
        el.style.display = (match || !term) ? '' : 'none';
    });

    ['users-tbody','interactions-tbody'].forEach(id => {
        document.getElementById(id)?.querySelectorAll('tr').forEach(row => {
            const found = [...row.querySelectorAll('td')].some(td => td.textContent.toLowerCase().includes(term));
            row.style.display = (found || !term) ? '' : 'none';
        });
    });
}

// ═════════════════════════════════════════════════════════════
// Settings Dropdown
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const btn  = document.getElementById('settings-dropdown-btn');
    const menu = document.getElementById('settings-menu');

    function positionDropdown() {
        if (menu.classList.contains('hidden')) return;
        const rect = btn.getBoundingClientRect();
        const w = 220, vw = window.innerWidth;
        let left = rect.left + rect.width / 2 - w / 2;
        left = Math.max(10, Math.min(left, vw - w - 10));
        menu.style.top  = (rect.bottom + 8) + 'px';
        menu.style.left = left + 'px';
    }

    btn?.addEventListener('click', e => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
        if (!menu.classList.contains('hidden')) setTimeout(positionDropdown, 0);
    });

    window.addEventListener('resize', positionDropdown);

    document.addEventListener('click', e => {
        if (!e.target.closest('#settings-dropdown-btn') && !e.target.closest('#settings-menu')) {
            menu.classList.add('hidden');
            menu.style.top = menu.style.left = '';
        }
    });

    const closeMenu = () => { menu.classList.add('hidden'); menu.style.top = menu.style.left = ''; };

    document.getElementById('profile-settings-btn')?.addEventListener('click', () => { closeMenu(); openProfileSettingsModal(); });
    document.getElementById('appearance-settings-btn')?.addEventListener('click', () => { closeMenu(); openAppearanceSettingsModal(); });
});

// ═════════════════════════════════════════════════════════════
// Profile Settings Modal – Open / Close
// ═════════════════════════════════════════════════════════════

async function openProfileSettingsModal() {
    document.getElementById('profile-settings-modal').classList.remove('hidden');
    stagedAvatarFile = stagedCvFile = null;
    setFormLoading(true);
    try {
        const data = await fetchProfileFromDB();
        profileData.id            = data.id;
        profileData.name          = data.name;
        profileData.specialization = data.specialization;
        profileData.bio           = data.bio;
        profileData.avatar        = data.avatar;
        profileData.skills        = data.skills;
        profileData.contactLinks  = data.contact_links;
        profileData.cvUrl         = data.cv_url;
        // Sync appearance from DB
        if (data.theme)    { appearanceData.theme    = data.theme;    localStorage.setItem('dashboardTheme', data.theme); }
        if (data.language) { appearanceData.language = data.language; localStorage.setItem('dashboardLanguage', data.language); }
        populateForm();
    } catch (err) {
        console.error('Load profile error:', err);
        showToast('Failed to load profile: ' + err.message, 'error');
    } finally {
        setFormLoading(false);
    }
}

function closeProfileSettingsModal() {
    document.getElementById('profile-settings-modal').classList.add('hidden');
    stagedAvatarFile = stagedCvFile = null;
}

function setFormLoading(on) {
    document.getElementById('profile-settings-form')
        ?.querySelectorAll('input, textarea, button')
        .forEach(el => el.disabled = on);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('close-profile-modal')?.addEventListener('click', closeProfileSettingsModal);
    document.getElementById('cancel-profile-btn')?.addEventListener('click', closeProfileSettingsModal);
});

// ─────────────────────────────────────────────────────────────
// Populate form fields from profileData
// ─────────────────────────────────────────────────────────────

function populateForm() {
    document.getElementById('profile-name-input').value           = profileData.name;
    document.getElementById('profile-specialization-input').value = profileData.specialization;
    document.getElementById('profile-bio-input').value            = profileData.bio;
    document.getElementById('profile-pic-preview').src            = profileData.avatar || './img/User1.png';

    const cvDiv = document.getElementById('current-cv');
    if (cvDiv) {
        if (profileData.cvUrl) {
            cvDiv.innerHTML = `<a href="${profileData.cvUrl}" target="_blank" class="text-yellow-400 hover:underline">📄 View Current CV</a>`;
            cvDiv.className = 'flex-1 text-sm';
        } else {
            cvDiv.textContent = 'No CV uploaded';
            cvDiv.className   = 'flex-1 text-sm text-gray-400';
        }
    }

    renderSkillsList();
    renderContactLinksList();
}

// ═════════════════════════════════════════════════════════════
// Profile Picture
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const btn      = document.getElementById('profile-pic-btn');
    const input    = document.getElementById('profile-pic-upload');
    const preview  = document.getElementById('profile-pic-preview');

    btn?.addEventListener('click', () => input.click());
    input?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Image must be < 5 MB', 'error'); return; }
        stagedAvatarFile = file;
        const reader = new FileReader();
        reader.onload = ev => { if (preview) preview.src = ev.target.result; };
        reader.readAsDataURL(file);
    });
});

// ═════════════════════════════════════════════════════════════
// Skills – icon preview + presets + add + render
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const iconInput  = document.getElementById('new-skill-icon');
    const nameInput  = document.getElementById('new-skill-input');
    const addBtn     = document.getElementById('add-skill-btn');
    const iconPreview = document.getElementById('skill-icon-preview');

    // Live icon preview as user types
    iconInput?.addEventListener('input', () => {
        if (iconPreview) {
            iconPreview.className = (iconInput.value.trim() || 'fa-solid fa-star') + ' text-yellow-400 text-lg';
        }
    });

    // Preset buttons fill icon + name inputs
    document.querySelectorAll('.skill-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            if (iconInput) iconInput.value = btn.dataset.icon;
            if (nameInput) nameInput.value = btn.dataset.name;
            if (iconPreview) iconPreview.className = btn.dataset.icon + ' text-yellow-400 text-lg';
        });
    });

    addBtn?.addEventListener('click', () => {
        const name = nameInput?.value.trim();
        const icon = iconInput?.value.trim();
        if (!name || !icon) { showToast('Enter both skill name and icon class', 'error'); return; }
        profileData.skills.push({ name, icon });
        nameInput.value = '';
        iconInput.value = '';
        if (iconPreview) iconPreview.className = 'fa-solid fa-star text-yellow-400 text-lg';
        renderSkillsList();
    });
});

function renderSkillsList() {
    const list = document.getElementById('skills-list');
    if (!list) return;
    list.innerHTML = '';
    profileData.skills.forEach((skill, i) => {
        const tag = document.createElement('div');
        tag.className = 'bg-yellow-600/20 text-yellow-400 px-3 py-2 rounded-lg flex items-center gap-2 text-sm';
        tag.innerHTML = `
            <i class="${skill.icon}"></i>
            <span>${skill.name}</span>
            <button type="button" class="ml-auto text-red-400 hover:text-red-300 delete-skill" data-index="${i}">
                <i class="fa-solid fa-times"></i>
            </button>`;
        list.appendChild(tag);
    });
    list.querySelectorAll('.delete-skill').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            profileData.skills.splice(Number(this.dataset.index), 1);
            renderSkillsList();
        });
    });
}

// ═════════════════════════════════════════════════════════════
// Contact Links – icon preview + presets + add + render
// Each link: { label, url, icon }
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const iconInput   = document.getElementById('new-link-icon');
    const labelInput  = document.getElementById('new-link-label');
    const urlInput    = document.getElementById('new-link-url');
    const addBtn      = document.getElementById('add-link-btn');
    const iconPreview = document.getElementById('link-icon-preview');

    // Live icon preview as user types
    iconInput?.addEventListener('input', () => {
        if (iconPreview) {
            iconPreview.className = (iconInput.value.trim() || 'fa-solid fa-link') + ' text-yellow-400 text-lg';
        }
    });

    // Preset buttons auto-fill icon + label
    document.querySelectorAll('.link-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            if (iconInput)   iconInput.value  = btn.dataset.icon;
            if (labelInput)  labelInput.value = btn.dataset.label;
            if (iconPreview) iconPreview.className = btn.dataset.icon + ' text-yellow-400 text-lg';
            urlInput?.focus();
        });
    });

    addBtn?.addEventListener('click', () => {
        const icon  = iconInput?.value.trim()  || 'fa-solid fa-link';
        const label = labelInput?.value.trim();
        const url   = urlInput?.value.trim();
        if (!label || !url) { showToast('Enter both label and URL', 'error'); return; }

        profileData.contactLinks.push({ label, url, icon });
        if (iconInput)  iconInput.value  = '';
        if (labelInput) labelInput.value = '';
        if (urlInput)   urlInput.value   = '';
        if (iconPreview) iconPreview.className = 'fa-solid fa-link text-yellow-400 text-lg';
        renderContactLinksList();
    });
});

function renderContactLinksList() {
    const list = document.getElementById('links-list');
    if (!list) return;
    list.innerHTML = '';

    profileData.contactLinks.forEach((link, i) => {
        const item = document.createElement('div');
        item.className = 'flex items-center justify-between bg-gray-800 p-3 rounded-lg gap-3';
        item.innerHTML = `
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 h-8 flex items-center justify-center bg-yellow-600/20 rounded-lg shrink-0">
                    <i class="${link.icon} text-yellow-400"></i>
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-medium truncate">${link.label}</p>
                    <a href="${link.url}" target="_blank" class="text-xs text-yellow-400 hover:underline truncate block max-w-xs">${link.url}</a>
                </div>
            </div>
            <div class="flex gap-2 shrink-0">
                <button type="button" class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded edit-link" data-index="${i}">
                    <i class="fa-solid fa-pen mr-1"></i>Edit
                </button>
                <button type="button" class="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded delete-link" data-index="${i}">
                    <i class="fa-solid fa-trash mr-1"></i>Delete
                </button>
            </div>`;
        list.appendChild(item);
    });

    list.querySelectorAll('.delete-link').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            profileData.contactLinks.splice(Number(this.dataset.index), 1);
            renderContactLinksList();
        });
    });

    list.querySelectorAll('.edit-link').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const idx  = Number(this.dataset.index);
            const link = profileData.contactLinks[idx];
            const iconInput   = document.getElementById('new-link-icon');
            const labelInput  = document.getElementById('new-link-label');
            const urlInput    = document.getElementById('new-link-url');
            const iconPreview = document.getElementById('link-icon-preview');
            if (iconInput)   iconInput.value  = link.icon  || '';
            if (labelInput)  labelInput.value = link.label || '';
            if (urlInput)    urlInput.value   = link.url   || '';
            if (iconPreview && link.icon) iconPreview.className = link.icon + ' text-yellow-400 text-lg';
            profileData.contactLinks.splice(idx, 1);
            renderContactLinksList();
            document.getElementById('new-link-url')?.focus();
        });
    });
}

// ═════════════════════════════════════════════════════════════
// CV File
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const uploadBtn = document.getElementById('upload-cv-btn');
    const cvInput   = document.getElementById('cv-upload');
    const deleteBtn = document.getElementById('delete-cv-btn');
    const cvDiv     = document.getElementById('current-cv');

    uploadBtn?.addEventListener('click', () => cvInput.click());

    cvInput?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { showToast('CV must be < 10 MB', 'error'); return; }
        stagedCvFile = file;
        cvDiv.textContent = `📄 Staged: ${file.name} — will upload on Save`;
        cvDiv.className   = 'flex-1 text-sm text-green-400';
    });

    deleteBtn?.addEventListener('click', () => {
        stagedCvFile = null;
        profileData.cvUrl = null;
        cvDiv.textContent = 'No CV uploaded';
        cvDiv.className   = 'flex-1 text-sm text-gray-400';
        showToast('CV will be removed on Save', 'info');
    });
});

// ═════════════════════════════════════════════════════════════
// Save Profile → Supabase
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('profile-settings-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const userId = localStorage.getItem('userId');
        if (!userId) { showToast('User not logged in', 'error'); return; }

        profileData.name           = document.getElementById('profile-name-input').value.trim();
        profileData.specialization = document.getElementById('profile-specialization-input').value.trim();
        profileData.bio            = document.getElementById('profile-bio-input').value.trim();

        const toast = showToast('Saving profile…', 'loading');
        setFormLoading(true);

        try {
            // Upload avatar if staged
            if (stagedAvatarFile) {
                profileData.avatar = await uploadFileToStorage(AVATAR_BUCKET, stagedAvatarFile, userId);
                stagedAvatarFile = null;
            }

            // Upload CV if staged
            if (stagedCvFile) {
                profileData.cvUrl = await uploadFileToStorage(CV_BUCKET, stagedCvFile, userId);
                stagedCvFile = null;
            }

            // ── users payload ────────────────────────────────
            const userPayload = {
                name:   profileData.name,
                avatar: profileData.avatar
            };

            // ── profile_settings payload ─────────────────────
            const profilePayload = {
                bio:           profileData.bio,
                specialization: profileData.specialization,
                skills:        profileData.skills,
                contact_links: profileData.contactLinks,
                cv_url:        profileData.cvUrl
            };

            const saved = await saveProfileToDB(userPayload, profilePayload);

            // Sync live page elements
            applyProfileToPage({
                name:          saved.name,
                specialization: profileData.specialization,
                bio:           profileData.bio,
                avatar:        saved.avatar,
                skills:        profileData.skills,
                contact_links: profileData.contactLinks,
                cv_url:        profileData.cvUrl
            });

            // Update localStorage cache
            localStorage.setItem('userName',   saved.name);
            localStorage.setItem('userAvatar', saved.avatar || '');

            toast.remove();
            showToast('Profile saved! ✅', 'success');
            closeProfileSettingsModal();
        } catch (err) {
            console.error('Save error:', err);
            toast.remove();
            showToast('Error: ' + (err.message || 'Failed to save'), 'error');
        } finally {
            setFormLoading(false);
        }
    });
});

// ═════════════════════════════════════════════════════════════
// Appearance Settings Modal
// ═════════════════════════════════════════════════════════════

function openAppearanceSettingsModal() {
    document.getElementById('appearance-settings-modal').classList.remove('hidden');
    loadAppearanceSettings();
}
function closeAppearanceSettingsModal() {
    document.getElementById('appearance-settings-modal').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('close-appearance-modal')?.addEventListener('click', closeAppearanceSettingsModal);
    document.getElementById('cancel-appearance-btn')?.addEventListener('click', closeAppearanceSettingsModal);
});

function loadAppearanceSettings() {
    document.querySelectorAll('input[name="theme"]').forEach(r => r.checked = r.value === appearanceData.theme);
    document.querySelectorAll('input[name="language"]').forEach(r => r.checked = r.value === appearanceData.language);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('appearance-settings-form')?.addEventListener('submit', async e => {
        e.preventDefault();
        const theme    = document.querySelector('input[name="theme"]:checked')?.value    || 'dark';
        const language = document.querySelector('input[name="language"]:checked')?.value || 'en';

        appearanceData.theme    = theme;
        appearanceData.language = language;
        localStorage.setItem('dashboardTheme',    theme);
        localStorage.setItem('dashboardLanguage', language);

        applyTheme(theme);
        applyLanguage(language);

        // Persist to profile_settings too
        const userId = localStorage.getItem('userId');
        if (userId && window.supabaseClient) {
            try {
                await window.supabaseClient
                    .from('profile_settings')
                    .upsert({ user_id: userId, theme, language, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
            } catch (err) {
                console.warn('Could not save appearance to DB:', err);
            }
        }

        showToast('Appearance saved! ✅', 'success');
        closeAppearanceSettingsModal();
    });
});

// ─────────────────────────────────────────────────────────────
// Apply Theme / Language
// ─────────────────────────────────────────────────────────────

function applyTheme(theme) {
    const body = document.body;
    if (theme === 'light') {
        body.classList.replace('bg-black', 'bg-white');
        const sidebar = document.querySelector('aside');
        if (sidebar) { sidebar.classList.remove('bg-black','border-yellow-700'); sidebar.classList.add('bg-gray-100','border-yellow-300'); }
        const main = document.querySelector('main');
        if (main) { main.classList.replace('bg-gray-200','bg-white'); }
    } else {
        body.classList.replace('bg-white','bg-black');
        const sidebar = document.querySelector('aside');
        if (sidebar) { sidebar.classList.remove('bg-gray-100','border-yellow-300'); sidebar.classList.add('bg-black','border-yellow-700'); }
        const main = document.querySelector('main');
        if (main) { main.classList.replace('bg-white','bg-gray-200'); }
    }
}

function applyLanguage(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.style.direction  = lang === 'ar' ? 'rtl' : 'ltr';
}

window.addEventListener('load', () => {
    applyTheme(localStorage.getItem('dashboardTheme')    || 'dark');
    applyLanguage(localStorage.getItem('dashboardLanguage') || 'en');
});

// ═════════════════════════════════════════════════════════════
// Service Modal
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const addServiceBtn     = document.getElementById('add-service-btn');
    const addServiceModal   = document.getElementById('add-service-modal');
    const serviceForm       = document.getElementById('add-service-form');
    const serviceCancelBtn  = document.getElementById('service-cancel');
    const serviceUploadBtn  = document.getElementById('service-upload-btn');
    const serviceImageUpload = document.getElementById('add-service-image-upload');

    addServiceBtn?.addEventListener('click', () => addServiceModal?.classList.remove('hidden'));
    serviceCancelBtn?.addEventListener('click', () => addServiceModal?.classList.add('hidden'));

    if (serviceUploadBtn && serviceImageUpload) {
        serviceUploadBtn.addEventListener('click', () => serviceImageUpload.click());
        serviceImageUpload.addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => { document.getElementById('add-service-main-image').value = ev.target.result; };
            reader.readAsDataURL(file);
        });
    }

    serviceForm?.addEventListener('submit', async e => {
        e.preventDefault();
        const data = {
            title:       document.getElementById('add-service-title').value,
            description: document.getElementById('add-service-description').value,
            category:    document.getElementById('add-service-category').value,
            duration:    document.getElementById('add-service-duration').value,
            price:       parseFloat(document.getElementById('add-service-price').value),
            delivery:    document.getElementById('add-service-delivery').value,
            main_image:  document.getElementById('add-service-main-image').value,
            video_url:   document.getElementById('add-service-video-url').value || null,
            gallery:     document.getElementById('add-service-gallery').value
        };
        try {
            const services = JSON.parse(localStorage.getItem('dashboardServices') || '[]');
            services.push(data);
            localStorage.setItem('dashboardServices', JSON.stringify(services));
            showToast('Service added! ✅', 'success');
            serviceForm.reset();
            addServiceModal?.classList.add('hidden');
        } catch (err) {
            showToast('Error adding service', 'error');
        }
    });

    addServiceModal?.addEventListener('click', e => {
        if (e.target === addServiceModal) addServiceModal.classList.add('hidden');
    });
});
