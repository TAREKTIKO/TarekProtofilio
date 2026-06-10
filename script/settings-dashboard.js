// ═════════════════════════════════════════════════════════════
// Settings Dashboard Module
// Handles Profile Settings and Appearance Settings
// ═════════════════════════════════════════════════════════════

// Profile Settings Data Structure
let profileData = {
    name: 'Tarek Ahmed',
    specialization: 'Full-Stack Developer',
    bio: 'I\'m a passionate Full-Stack Developer who loves building modern, responsive, and user-friendly applications. I focus on clean design, performance, and delivering real value through code.',
    profilePicture: './img/User1.png',
    skills: [
        { name: 'HTML', icon: 'fa-brands fa-html5' },
        { name: 'CSS', icon: 'fa-brands fa-css3' },
        { name: 'JavaScript', icon: 'fa-brands fa-js' },
        { name: 'Bootstrap', icon: 'fa-brands fa-bootstrap' },
        { name: 'React', icon: 'fa-brands fa-react' },
        { name: 'SQL', icon: 'fa-solid fa-database' },
        { name: 'C#', icon: 'fa-solid fa-code' },
        { name: 'C++', icon: 'fa-solid fa-laptop-code' },
        { name: 'Next.js', icon: 'fa-solid fa-n' }
    ],
    contactLinks: [
        { label: 'LinkedIn', url: 'https://linkedin.com' },
        { label: 'GitHub', url: 'https://github.com' }
    ],
    cvFile: null
};

// Appearance Settings Data
let appearanceData = {
    theme: localStorage.getItem('dashboardTheme') || 'dark',
    language: localStorage.getItem('dashboardLanguage') || 'en'
};

// ═════════════════════════════════════════════════════════════
// Mobile Menu Toggle
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const closeSidebar = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('hidden');
        });
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', function() {
            sidebar.classList.add('hidden');
        });
    }

    // Close sidebar when clicking on any navigation button
    const navButtons = document.querySelectorAll('.flex.flex-col.gap-2.my-8 button');
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            if (window.innerWidth < 1024) {
                sidebar.classList.add('hidden');
            }
        });
    });
});

// ═════════════════════════════════════════════════════════════
// Navigation Button Handlers
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const navButtons = document.querySelectorAll('.flex.flex-col.gap-2.my-8 button:not(#settings-dropdown-btn)');
    
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            navButtons.forEach(b => {
                b.classList.remove('bg-yellow-600', 'font-medium');
                b.style.color = 'white';
            });
            
            // Add active class to clicked button
            this.classList.add('bg-yellow-600', 'font-medium');
            this.style.color = 'black';
            
            const buttonText = this.textContent.trim();
            
            // Hide all content sections first
            hideAllContent();
            
            // Show the appropriate section based on button text
            if (buttonText === 'Main') {
                showContent('main-content');
                document.getElementById('button-name').textContent = 'Dashboard';
            } else if (buttonText === 'Projects') {
                showContent('projects-content');
                document.getElementById('button-name').textContent = 'Projects Management';
            } else if (buttonText === 'Services') {
                showContent('services-content');
                document.getElementById('button-name').textContent = 'Services Management';
            } else if (buttonText === 'Interactions') {
                showContent('interactions-content');
                document.getElementById('button-name').textContent = 'Interactions';
            } else if (buttonText === 'Users') {
                showContent('users-content');
                document.getElementById('button-name').textContent = 'Users Management';
            }
        });
    });
});

function hideAllContent() {
    const contentDivs = [
        'main-content',
        'projects-content',
        'services-content',
        'interactions-content',
        'users-content',
        'settings-content'
    ];
    
    contentDivs.forEach(id => {
        const div = document.getElementById(id);
        if (div) {
            div.classList.add('hidden');
        }
    });
}

function showContent(contentId) {
    const div = document.getElementById(contentId);
    if (div) {
        div.classList.remove('hidden');
    }
}

// ═════════════════════════════════════════════════════════════
// Mobile Menu Toggle
// ═════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════
// Dashboard Search Functionality
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('dashboard-search');
    
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            searchDashboard(searchTerm);
        });
    }
});

function searchDashboard(term) {
    // Search in Projects
    const projectsList = document.getElementById('projects-list');
    if (projectsList) {
        const projects = projectsList.querySelectorAll('[data-project-id]');
        projects.forEach(project => {
            const title = project.querySelector('h3')?.textContent.toLowerCase() || '';
            const description = project.querySelector('p')?.textContent.toLowerCase() || '';
            
            if (title.includes(term) || description.includes(term) || term === '') {
                project.style.display = '';
            } else {
                project.style.display = 'none';
            }
        });
    }

    // Search in Services
    const servicesList = document.querySelectorAll('#services-content .bg-gray-900');
    if (servicesList) {
        servicesList.forEach(service => {
            const title = service.querySelector('h3')?.textContent.toLowerCase() || '';
            const description = service.querySelector('p')?.textContent.toLowerCase() || '';
            
            if (title.includes(term) || description.includes(term) || term === '') {
                service.style.display = '';
            } else {
                service.style.display = 'none';
            }
        });
    }

    // Search in Users
    const usersTbody = document.getElementById('users-tbody');
    if (usersTbody) {
        const rows = usersTbody.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let found = false;
            cells.forEach(cell => {
                if (cell.textContent.toLowerCase().includes(term)) {
                    found = true;
                }
            });
            
            if (found || term === '') {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Search in Interactions
    const interactionsTbody = document.getElementById('interactions-tbody');
    if (interactionsTbody) {
        const rows = interactionsTbody.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let found = false;
            cells.forEach(cell => {
                if (cell.textContent.toLowerCase().includes(term)) {
                    found = true;
                }
            });
            
            if (found || term === '') {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
}

// ═════════════════════════════════════════════════════════════
// Settings Dropdown Toggle
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const settingsDropdownBtn = document.getElementById('settings-dropdown-btn');
    const settingsMenu = document.getElementById('settings-menu');
    const profileSettingsBtn = document.getElementById('profile-settings-btn');
    const appearanceSettingsBtn = document.getElementById('appearance-settings-btn');

    // Function to position dropdown
    function positionDropdown() {
        if (settingsMenu.classList.contains('hidden')) return;
        
        const rect = settingsDropdownBtn.getBoundingClientRect();
        const menuWidth = 220; // Set fixed width
        const viewportWidth = window.innerWidth;
        
        // Center dropdown under button
        let left = rect.left + (rect.width / 2) - (menuWidth / 2);
        
        // Keep dropdown on screen - prevent going off-screen left
        if (left < 10) {
            left = 10;
        }
        
        // Keep dropdown on screen - prevent going off-screen right
        if (left + menuWidth > viewportWidth - 10) {
            left = viewportWidth - menuWidth - 10;
        }
        
        settingsMenu.style.top = (rect.bottom + 8) + 'px';
        settingsMenu.style.left = left + 'px';
    }

    // Toggle dropdown menu
    if (settingsDropdownBtn) {
        settingsDropdownBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            settingsMenu.classList.toggle('hidden');
            
            // Position dropdown when opened
            if (!settingsMenu.classList.contains('hidden')) {
                setTimeout(positionDropdown, 0);
            }
        });
    }
    
    // Reposition dropdown on window resize
    window.addEventListener('resize', function() {
        positionDropdown();
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#settings-dropdown-btn') && !e.target.closest('#settings-menu')) {
            settingsMenu.classList.add('hidden');
            // Clear positioning
            settingsMenu.style.top = '';
            settingsMenu.style.left = '';
        }
    });

    // Profile Settings Button
    if (profileSettingsBtn) {
        profileSettingsBtn.addEventListener('click', function() {
            settingsMenu.classList.add('hidden');
            // Clear positioning
            settingsMenu.style.top = '';
            settingsMenu.style.left = '';
            openProfileSettingsModal();
        });
    }

    // Appearance Settings Button
    if (appearanceSettingsBtn) {
        appearanceSettingsBtn.addEventListener('click', function() {
            settingsMenu.classList.add('hidden');
            // Clear positioning
            settingsMenu.style.top = '';
            settingsMenu.style.left = '';
            openAppearanceSettingsModal();
        });
    }
});

// ═════════════════════════════════════════════════════════════
// Profile Settings Modal - Open & Close
// ═════════════════════════════════════════════════════════════

function openProfileSettingsModal() {
    const modal = document.getElementById('profile-settings-modal');
    modal.classList.remove('hidden');
    loadProfileSettings();
}

function closeProfileSettingsModal() {
    const modal = document.getElementById('profile-settings-modal');
    modal.classList.add('hidden');
}

// Close Button
document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.getElementById('close-profile-modal');
    const cancelBtn = document.getElementById('cancel-profile-btn');

    if (closeBtn) closeBtn.addEventListener('click', closeProfileSettingsModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeProfileSettingsModal);
});

// ═════════════════════════════════════════════════════════════
// Profile Picture Management
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const profilePicBtn = document.getElementById('profile-pic-btn');
    const profilePicUpload = document.getElementById('profile-pic-upload');
    const profilePicPreview = document.getElementById('profile-pic-preview');

    if (profilePicBtn && profilePicUpload) {
        profilePicBtn.addEventListener('click', function() {
            profilePicUpload.click();
        });

        profilePicUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    profileData.profilePicture = event.target.result;
                    profilePicPreview.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// ═════════════════════════════════════════════════════════════
// Skills Management
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const addSkillBtn = document.getElementById('add-skill-btn');
    const skillNameInput = document.getElementById('new-skill-input');
    const skillIconInput = document.getElementById('new-skill-icon');

    if (addSkillBtn) {
        addSkillBtn.addEventListener('click', function() {
            const name = skillNameInput.value.trim();
            const icon = skillIconInput.value.trim();

            if (name && icon) {
                profileData.skills.push({ name, icon });
                skillNameInput.value = '';
                skillIconInput.value = '';
                renderSkillsList();
            }
        });
    }
});

function renderSkillsList() {
    const skillsList = document.getElementById('skills-list');
    skillsList.innerHTML = '';

    profileData.skills.forEach((skill, index) => {
        const skillTag = document.createElement('div');
        skillTag.className = 'bg-yellow-600/20 text-yellow-400 px-3 py-2 rounded-lg flex items-center gap-2 text-sm';
        skillTag.innerHTML = `
            <i class="${skill.icon}"></i>
            <span>${skill.name}</span>
            <button type="button" class="ml-auto text-red-400 hover:text-red-300 delete-skill" data-index="${index}">
                <i class="fa-solid fa-times"></i>
            </button>
        `;
        skillsList.appendChild(skillTag);
    });

    // Delete skill listeners
    document.querySelectorAll('.delete-skill').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const index = this.dataset.index;
            profileData.skills.splice(index, 1);
            renderSkillsList();
        });
    });
}

// ═════════════════════════════════════════════════════════════
// Contact Links Management
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const addLinkBtn = document.getElementById('add-link-btn');
    const linkLabelInput = document.getElementById('new-link-label');
    const linkUrlInput = document.getElementById('new-link-url');

    if (addLinkBtn) {
        addLinkBtn.addEventListener('click', function() {
            const label = linkLabelInput.value.trim();
            const url = linkUrlInput.value.trim();

            if (label && url) {
                profileData.contactLinks.push({ label, url });
                linkLabelInput.value = '';
                linkUrlInput.value = '';
                renderContactLinksList();
            }
        });
    }
});

function renderContactLinksList() {
    const linksList = document.getElementById('links-list');
    linksList.innerHTML = '';

    profileData.contactLinks.forEach((link, index) => {
        const linkItem = document.createElement('div');
        linkItem.className = 'flex items-center justify-between bg-gray-800 p-3 rounded-lg';
        linkItem.innerHTML = `
            <div>
                <p class="text-sm font-medium">${link.label}</p>
                <a href="${link.url}" target="_blank" class="text-xs text-yellow-400 hover:text-yellow-300">${link.url}</a>
            </div>
            <div class="flex gap-2">
                <button type="button" class="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded edit-link" data-index="${index}">
                    Edit
                </button>
                <button type="button" class="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded delete-link" data-index="${index}">
                    Delete
                </button>
            </div>
        `;
        linksList.appendChild(linkItem);
    });

    // Delete link listeners
    document.querySelectorAll('.delete-link').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const index = this.dataset.index;
            profileData.contactLinks.splice(index, 1);
            renderContactLinksList();
        });
    });

    // Edit link listeners
    document.querySelectorAll('.edit-link').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const index = this.dataset.index;
            const link = profileData.contactLinks[index];
            document.getElementById('new-link-label').value = link.label;
            document.getElementById('new-link-url').value = link.url;
            profileData.contactLinks.splice(index, 1);
            renderContactLinksList();
        });
    });
}

// ═════════════════════════════════════════════════════════════
// CV File Management
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const uploadCvBtn = document.getElementById('upload-cv-btn');
    const cvUpload = document.getElementById('cv-upload');
    const deleteCvBtn = document.getElementById('delete-cv-btn');
    const currentCvDiv = document.getElementById('current-cv');

    if (uploadCvBtn && cvUpload) {
        uploadCvBtn.addEventListener('click', function() {
            cvUpload.click();
        });

        cvUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                profileData.cvFile = file;
                currentCvDiv.textContent = `CV: ${file.name}`;
                currentCvDiv.classList.remove('text-gray-400');
                currentCvDiv.classList.add('text-green-400');
            }
        });
    }

    if (deleteCvBtn) {
        deleteCvBtn.addEventListener('click', function() {
            profileData.cvFile = null;
            currentCvDiv.textContent = 'No CV uploaded';
            currentCvDiv.classList.remove('text-green-400');
            currentCvDiv.classList.add('text-gray-400');
        });
    }
});

// ═════════════════════════════════════════════════════════════
// Load Profile Settings
// ═════════════════════════════════════════════════════════════

function loadProfileSettings() {
    document.getElementById('profile-name-input').value = profileData.name;
    document.getElementById('profile-specialization-input').value = profileData.specialization;
    document.getElementById('profile-bio-input').value = profileData.bio;
    document.getElementById('profile-pic-preview').src = profileData.profilePicture;

    renderSkillsList();
    renderContactLinksList();
}

// ═════════════════════════════════════════════════════════════
// Save Profile Settings
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profile-settings-form');

    if (profileForm) {
        profileForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Update profile data
            profileData.name = document.getElementById('profile-name-input').value;
            profileData.specialization = document.getElementById('profile-specialization-input').value;
            profileData.bio = document.getElementById('profile-bio-input').value;

            try {
                // Update index.html with new profile data
                await updateIndexHTML();
                
                alert('Profile settings saved successfully!');
                closeProfileSettingsModal();
            } catch (error) {
                console.error('Error saving profile settings:', error);
                alert('Error saving profile settings');
            }
        });
    }
});

// ═════════════════════════════════════════════════════════════
// Update index.html with Profile Changes
// ═════════════════════════════════════════════════════════════

async function updateIndexHTML() {
    // This function will be implemented to update index.html
    // For now, we'll store the data in localStorage for retrieval
    localStorage.setItem('profileData', JSON.stringify(profileData));
    
    // In a real application, you would send this data to your backend
    // or use a service worker to update the actual files
}

// ═════════════════════════════════════════════════════════════
// Appearance Settings Modal - Open & Close
// ═════════════════════════════════════════════════════════════

function openAppearanceSettingsModal() {
    const modal = document.getElementById('appearance-settings-modal');
    modal.classList.remove('hidden');
    loadAppearanceSettings();
}

function closeAppearanceSettingsModal() {
    const modal = document.getElementById('appearance-settings-modal');
    modal.classList.add('hidden');
}

// Close Button
document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.getElementById('close-appearance-modal');
    const cancelBtn = document.getElementById('cancel-appearance-btn');

    if (closeBtn) closeBtn.addEventListener('click', closeAppearanceSettingsModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeAppearanceSettingsModal);
});

// ═════════════════════════════════════════════════════════════
// Load Appearance Settings
// ═════════════════════════════════════════════════════════════

function loadAppearanceSettings() {
    // Set theme radio buttons
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach(radio => {
        radio.checked = radio.value === appearanceData.theme;
    });

    // Set language radio buttons
    const languageRadios = document.querySelectorAll('input[name="language"]');
    languageRadios.forEach(radio => {
        radio.checked = radio.value === appearanceData.language;
    });
}

// ═════════════════════════════════════════════════════════════
// Save Appearance Settings
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const appearanceForm = document.getElementById('appearance-settings-form');

    if (appearanceForm) {
        appearanceForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Get selected values
            const selectedTheme = document.querySelector('input[name="theme"]:checked').value;
            const selectedLanguage = document.querySelector('input[name="language"]:checked').value;

            // Update appearance data
            appearanceData.theme = selectedTheme;
            appearanceData.language = selectedLanguage;

            // Save to localStorage
            localStorage.setItem('dashboardTheme', selectedTheme);
            localStorage.setItem('dashboardLanguage', selectedLanguage);

            // Apply theme changes
            applyTheme(selectedTheme);
            applyLanguage(selectedLanguage);

            alert('Appearance settings saved successfully!');
            closeAppearanceSettingsModal();
        });
    }
});

// ═════════════════════════════════════════════════════════════
// Apply Theme
// ═════════════════════════════════════════════════════════════

function applyTheme(theme) {
    const body = document.body;
    
    if (theme === 'light') {
        // Apply light theme
        body.classList.remove('bg-black');
        body.classList.add('bg-white');
        
        // Update sidebar
        const sidebar = document.querySelector('aside');
        if (sidebar) {
            sidebar.classList.remove('bg-black', 'border-yellow-700');
            sidebar.classList.add('bg-gray-100', 'border-yellow-300');
        }

        // Update main content background
        const main = document.querySelector('main');
        if (main) {
            main.classList.remove('bg-gray-200');
            main.classList.add('bg-white');
        }

        // Update text colors
        document.querySelectorAll('.text-white').forEach(el => {
            if (!el.classList.contains('preserve-white')) {
                el.classList.remove('text-white');
                el.classList.add('text-gray-900');
            }
        });
    } else {
        // Apply dark theme (default)
        body.classList.remove('bg-white');
        body.classList.add('bg-black');
        
        const sidebar = document.querySelector('aside');
        if (sidebar) {
            sidebar.classList.remove('bg-gray-100', 'border-yellow-300');
            sidebar.classList.add('bg-black', 'border-yellow-700');
        }

        const main = document.querySelector('main');
        if (main) {
            main.classList.remove('bg-white');
            main.classList.add('bg-gray-200');
        }

        document.querySelectorAll('.text-gray-900').forEach(el => {
            if (!el.classList.contains('preserve-gray')) {
                el.classList.remove('text-gray-900');
                el.classList.add('text-white');
            }
        });
    }
}

// ═════════════════════════════════════════════════════════════
// Apply Language
// ═════════════════════════════════════════════════════════════

function applyLanguage(lang) {
    if (lang === 'ar') {
        // Apply Arabic
        document.documentElement.lang = 'ar';
        document.documentElement.dir = 'rtl';
        document.body.style.direction = 'rtl';
    } else {
        // Apply English
        document.documentElement.lang = 'en';
        document.documentElement.dir = 'ltr';
        document.body.style.direction = 'ltr';
    }
}

// Apply saved theme on page load
window.addEventListener('load', function() {
    const savedTheme = localStorage.getItem('dashboardTheme') || 'dark';
    const savedLanguage = localStorage.getItem('dashboardLanguage') || 'en';
    
    applyTheme(savedTheme);
    applyLanguage(savedLanguage);
});

// ═════════════════════════════════════════════════════════════
// Service Modal Handlers
// ═════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
    const addServiceBtn = document.getElementById('add-service-btn');
    const addServiceModal = document.getElementById('add-service-modal');
    const serviceForm = document.getElementById('add-service-form');
    const serviceCancelBtn = document.getElementById('service-cancel');
    const serviceUploadBtn = document.getElementById('service-upload-btn');
    const serviceImageUpload = document.getElementById('add-service-image-upload');

    // Open modal
    if (addServiceBtn) {
        addServiceBtn.addEventListener('click', () => {
            if (addServiceModal) {
                addServiceModal.classList.remove('hidden');
            }
        });
    }

    // Close modal
    if (serviceCancelBtn) {
        serviceCancelBtn.addEventListener('click', () => {
            if (addServiceModal) {
                addServiceModal.classList.add('hidden');
            }
        });
    }

    // Image upload
    if (serviceUploadBtn && serviceImageUpload) {
        serviceUploadBtn.addEventListener('click', () => {
            serviceImageUpload.click();
        });

        serviceImageUpload.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('add-service-main-image').value = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Form submission
    if (serviceForm) {
        serviceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const serviceData = {
                title: document.getElementById('add-service-title').value,
                description: document.getElementById('add-service-description').value,
                category: document.getElementById('add-service-category').value,
                duration: document.getElementById('add-service-duration').value,
                price: parseFloat(document.getElementById('add-service-price').value),
                delivery: document.getElementById('add-service-delivery').value,
                main_image: document.getElementById('add-service-main-image').value,
                video_url: document.getElementById('add-service-video-url').value || null,
                gallery: document.getElementById('add-service-gallery').value
            };

            try {
                // Store service data in localStorage for now
                let services = JSON.parse(localStorage.getItem('dashboardServices') || '[]');
                services.push(serviceData);
                localStorage.setItem('dashboardServices', JSON.stringify(services));
                
                alert('Service added successfully!');
                serviceForm.reset();
                if (addServiceModal) {
                    addServiceModal.classList.add('hidden');
                }
            } catch (error) {
                console.error('Error adding service:', error);
                alert('Error adding service');
            }
        });
    }

    // Close modal when clicking outside
    if (addServiceModal) {
        addServiceModal.addEventListener('click', (e) => {
            if (e.target === addServiceModal) {
                addServiceModal.classList.add('hidden');
            }
        });
    }
});

