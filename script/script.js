// ================== Elements ==================
const userWrapper = document.getElementById("user-menu-wrapper");
const userBtn = document.getElementById("user-info-btn");
const userDropdown = document.getElementById("user-dropdown");
const signOutBtn = document.getElementById("signOutBtn");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const primaryMenu = document.getElementById("primary-menu");

const modal = document.getElementById("user-modal");
const closeModal = document.getElementById("closeModal");
const manageBtn = document.getElementById("manageBtn");

const saveBtn = document.getElementById("saveBtn");
const editName = document.getElementById("editName");

const displayName = document.getElementById("displayName");
const dropdownName = document.getElementById("dropdownName");

const mainAvatar = document.getElementById("mainAvatar");
const dropdownAvatar = document.getElementById("dropdownAvatar");

const avatars = document.querySelectorAll(".avatar-option");

let selectedAvatar = null;
let isLoggedIn = true;

// Loader
const loader = document.getElementById("pageLoader");

// ================== Home Skills Scrollbar ==================
const slider = document.getElementById("skillsSlider");
const dots = document.querySelectorAll(".dot");


// ================== UI RENDER ==================

function renderLoggedInUI(name, avatar) {

    // Navbar
    userBtn.innerHTML = `
        <div class="flex items-center gap-2">
            ${avatar 
                ? `<img src="${avatar}" class="w-10 h-10 rounded-full object-cover">`
                : `<i class="fa-solid fa-user text-amber-500 text-xl p-2 bg-gray-700 rounded-full"></i>`}
            
            <div class="hidden sm:flex flex-col leading-tight">
                <span class="font-semibold text-sm">${name}</span>
                <span class="text-xs text-gray-400">Admin</span>
            </div>
        </div>
    `;

    // Dropdown name
    if (dropdownName) dropdownName.textContent = name;

    // Modal name
    if (displayName) displayName.textContent = name;

    // Avatar
    if (avatar) {
        if (dropdownAvatar) {
            dropdownAvatar.innerHTML = `
                <img src="${avatar}" class="w-full h-full object-cover rounded-full">
            `;
        }

        if (mainAvatar) {
            mainAvatar.innerHTML = `
                <img src="${avatar}" class="w-full h-full object-cover rounded-full">
            `;
        }
    }
}

function renderLoggedOutUI() {
    userBtn.innerHTML = `
        <span id="signInBtn" class="text-sm font-semibold px-4 cursor-pointer">
            Sign In
        </span>
    `;
}

// ================== Dropdown ==================

function closeMobileMenu() {
    if (!mobileMenuBtn || !primaryMenu) return;

    primaryMenu.classList.add("hidden");
    primaryMenu.classList.remove("flex");
    mobileMenuBtn.setAttribute("aria-expanded", "false");
    mobileMenuBtn.innerHTML = `<i class="fa-solid fa-bars text-xl"></i>`;
}

function toggleMobileMenu() {
    if (!mobileMenuBtn || !primaryMenu) return;

    const isOpen = !primaryMenu.classList.contains("hidden");

    primaryMenu.classList.toggle("hidden", isOpen);
    primaryMenu.classList.toggle("flex", !isOpen);
    mobileMenuBtn.setAttribute("aria-expanded", String(!isOpen));
    mobileMenuBtn.innerHTML = isOpen
        ? `<i class="fa-solid fa-bars text-xl"></i>`
        : `<i class="fa-solid fa-xmark text-xl"></i>`;
}

function openDropdown() {
    userDropdown.classList.remove("hidden");

    setTimeout(() => {
        userDropdown.classList.remove("opacity-0", "scale-95");
        userDropdown.classList.add("opacity-100", "scale-100");
    }, 10);
}

function closeDropdown() {
    userDropdown.classList.add("opacity-0", "scale-95");
    userDropdown.classList.remove("opacity-100", "scale-100");

    setTimeout(() => {
        userDropdown.classList.add("hidden");
    }, 200);
}

// ================== Events ==================

mobileMenuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMobileMenu();
});

// click user
userBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    if (!isLoggedIn) {
        window.location.href = "login.html";
        return;
    }

    userDropdown.classList.contains("hidden")
        ? openDropdown()
        : closeDropdown();
});

// click outside
document.addEventListener("click", (e) => {
    if (!userWrapper.contains(e.target)) closeDropdown();
    if (primaryMenu && mobileMenuBtn && !primaryMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        closeMobileMenu();
    }
});

primaryMenu?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMobileMenu);
});

// open modal
manageBtn?.addEventListener("click", () => {
    modal.classList.remove("hidden");
    closeDropdown();
});

// close modal
closeModal?.addEventListener("click", () => {
    modal.classList.add("hidden");
});

// ================== Avatar ==================

avatars.forEach(img => {
    img.addEventListener("click", () => {

        avatars.forEach(i => i.classList.remove("border-amber-500"));

        img.classList.add("border-amber-500");

        selectedAvatar = img.src;

        mainAvatar.innerHTML = `
            <img src="${img.src}" class="w-full h-full object-cover rounded-full">
        `;
    });
});

// ================== Save ==================

saveBtn.addEventListener("click", () => {

    const newName = editName.value.trim() || "Tarek Ahmed";

    renderLoggedInUI(newName, selectedAvatar);

    // save localStorage
    localStorage.setItem("username", newName);
    if (selectedAvatar) {
        localStorage.setItem("avatar", selectedAvatar);
    }

    modal.classList.add("hidden");
});

// ================== Sign Out ==================

signOutBtn?.addEventListener("click", () => {
    isLoggedIn = false;

    closeDropdown();
    renderLoggedOutUI();
});

// ================== Sign In Redirect ==================

document.addEventListener("click", (e) => {
    if (e.target.id === "signInBtn") {
        window.location.href = "login.html";
    }
});

// ================== Load ==================

window.addEventListener("load", () => {

    const savedName = localStorage.getItem("username");
    const savedAvatar = localStorage.getItem("avatar");

    renderLoggedInUI(
        savedName || "Tarek Ahmed",
        savedAvatar || null
    );
});


// Loader   

// عند الضغط على أي لينك
document.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", function(e) {

        // تجاهل اللينكات اللي فيها #
        if (this.getAttribute("href").startsWith("#")) return;

        e.preventDefault();

        loader.classList.remove("hidden");

        setTimeout(() => {
            window.location.href = this.href;
        }, 500); // وقت بسيط للأنيميشن
    });
});

// عند تحميل الصفحة
window.addEventListener("load", () => {
    loader.classList.add("hidden");
});


// ================== Home Skills Scrollbar ==================

function updateDots() {
    const scrollX = slider.scrollLeft;
    const width = slider.clientWidth;

    const index = Math.round(scrollX / width);

    dots.forEach((dot, i) => {
        dot.classList.remove("bg-amber-500");
        dot.classList.add("bg-gray-600");

        if (i === index) {
            dot.classList.remove("bg-gray-600");
            dot.classList.add("bg-amber-500");
        }
    });
}

// عند الـ scroll
slider.addEventListener("scroll", updateDots);

// عند تحميل الصفحة
window.addEventListener("load", updateDots);
