// ================== Elements ==================
const userWrapper = document.getElementById("user-menu-wrapper");
const userBtn = document.getElementById("user-info-btn");
const userDropdown = document.getElementById("user-dropdown");
const signOutBtn = document.getElementById("signOutBtn");
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const primaryMenu = document.getElementById("primary-menu");
const scrollTopBtn = document.getElementById("scrollTopBtn");

const modal = document.getElementById("user-modal");
const closeModal = document.getElementById("closeModal");
const manageBtn = document.getElementById("manageBtn");

const saveBtn = document.getElementById("saveBtn");
const editName = document.getElementById("editName");

const displayName = document.getElementById("displayName");
const dropdownName = document.getElementById("dropdownName");
const dropdownRole = document.getElementById("dropdownRole");

const mainAvatar = document.getElementById("mainAvatar");
const dropdownAvatar = document.getElementById("dropdownAvatar");

const avatars = document.querySelectorAll(".avatar-option");

let selectedAvatar = null;
let isLoggedIn = false;

// Loader
const loader = document.getElementById("pageLoader");

// ================== Home Skills Scrollbar ==================
const slider = document.getElementById("skillsSlider");
const dots = document.querySelectorAll(".dot");


// ================== UI RENDER ==================

function getCleanAvatarPath(src) {
    if (!src) return null;

    const fileName = src.split("/").pop();
    if (!fileName) return null;

    return `./img/${fileName.replace(/^avatar/i, "Avatar")}`;
}

function markSelectedAvatar(avatarPath) {
    avatars.forEach(img => {
        const optionPath = getCleanAvatarPath(img.getAttribute("src") || img.src);
        img.classList.toggle("border-amber-500", optionPath === avatarPath);
        img.classList.toggle("border-transparent", optionPath !== avatarPath);
    });
}

function renderLoggedInUI(name, avatar, role = "user") {
    if (!userBtn) return;

    isLoggedIn = true;
    const userRole = role || "user";
    const displayRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);

    // Navbar
    userBtn.innerHTML = `
        <div class="flex items-center gap-2">
            ${avatar 
                ? `<img src="${avatar}" class="w-10 h-10 rounded-full object-cover">`
                : `<i class="fa-solid fa-user text-amber-500 text-xl p-2 bg-gray-700 rounded-full"></i>`}
            
            <div class="hidden sm:flex flex-col leading-tight">
                <span class="font-semibold text-sm">${name}</span>
                <span class="text-xs text-gray-400">${displayRole}</span>
            </div>
        </div>
    `;

    // Dropdown name
    if (dropdownName) dropdownName.textContent = name;
    if (dropdownRole) dropdownRole.textContent = `${displayRole} • Online`;

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
    if (!userBtn) return;

    isLoggedIn = false;
    userBtn.innerHTML = `
        <span id="signInBtn" class="text-sm font-semibold px-4 cursor-pointer">
            Sign In
        </span>
    `;
}

function clearStoredUser() {
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    localStorage.removeItem("avatar");
}

async function renderCurrentUser() {
    renderLoggedOutUI();

    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const fallbackUser = {
        name: localStorage.getItem("username"),
        avatar: localStorage.getItem("avatar"),
        role: localStorage.getItem("userRole") || "user"
    };

    const supabase = window.supabaseClient;
    if (!supabase) {
        if (fallbackUser.name) {
            renderLoggedInUI(fallbackUser.name, fallbackUser.avatar, fallbackUser.role);
        }
        return;
    }

    const { data: user, error } = await supabase
        .from("users")
        .select("id, name, email, avatar, role")
        .eq("id", userId)
        .maybeSingle();

    if (error || !user) {
        clearStoredUser();
        renderLoggedOutUI();
        return;
    }

    localStorage.setItem("username", user.name);
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userRole", user.role || "user");

    if (user.avatar) {
        localStorage.setItem("avatar", user.avatar);
    } else {
        localStorage.removeItem("avatar");
    }

    renderLoggedInUI(user.name, user.avatar, user.role);
}

async function updateUserProfile(supabase, profile) {
    const payload = {
        name: profile.name,
        avatar: profile.avatar
    };

    if (profile.id) {
        const { data, error } = await supabase
            .from("users")
            .update(payload)
            .eq("id", profile.id)
            .select("id, name, email, avatar, role");

        if (error) throw error;
        if (data?.length) return data[0];
    }

    if (profile.email) {
        const { data, error } = await supabase
            .from("users")
            .update(payload)
            .eq("email", profile.email)
            .select("id, name, email, avatar, role");

        if (error) throw error;
        if (data?.length) return data[0];
    }

    return null;
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
    if (!userDropdown) return;

    userDropdown.classList.remove("hidden");

    setTimeout(() => {
        userDropdown.classList.remove("opacity-0", "scale-95");
        userDropdown.classList.add("opacity-100", "scale-100");
    }, 10);
}

function closeDropdown() {
    if (!userDropdown) return;

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
userBtn?.addEventListener("click", (e) => {
    e.stopPropagation();

    if (!isLoggedIn) {
        window.location.href = "login.html";
        return;
    }

    userDropdown?.classList.contains("hidden")
        ? openDropdown()
        : closeDropdown();
});

// click outside
document.addEventListener("click", (e) => {
    if (userWrapper && !userWrapper.contains(e.target)) closeDropdown();
    if (primaryMenu && mobileMenuBtn && !primaryMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        closeMobileMenu();
    }
});

primaryMenu?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMobileMenu);
});

scrollTopBtn?.addEventListener("click", () => {
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
});

// open modal
manageBtn?.addEventListener("click", () => {
    const currentName = localStorage.getItem("username") || "";
    const currentAvatar = localStorage.getItem("avatar") || null;

    if (editName) editName.value = currentName;
    selectedAvatar = currentAvatar;
    markSelectedAvatar(currentAvatar);

    modal?.classList.remove("hidden");
    closeDropdown();
});

// close modal
closeModal?.addEventListener("click", () => {
    modal?.classList.add("hidden");
});

// ================== Avatar ==================

avatars.forEach(img => {
    img.addEventListener("click", () => {

        avatars.forEach(i => i.classList.remove("border-amber-500"));

        img.classList.add("border-amber-500");

        selectedAvatar = getCleanAvatarPath(img.getAttribute("src") || img.src);

        if (mainAvatar) {
            mainAvatar.innerHTML = `
                <img src="${selectedAvatar}" class="w-full h-full object-cover rounded-full">
            `;
        }
    });
});

// ================== Save ==================

saveBtn?.addEventListener("click", async () => {

    const newName = editName?.value.trim() || localStorage.getItem("username") || "User";
    const newAvatar = selectedAvatar || localStorage.getItem("avatar") || null;
    const userId = localStorage.getItem("userId");
    const userEmail = localStorage.getItem("userEmail");
    const supabase = window.supabaseClient;

    if (!supabase || (!userId && !userEmail)) {
        window.location.href = "login.html";
        return;
    }

    const previousText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";

    try {
        const updatedUser = await updateUserProfile(supabase, {
            id: userId,
            email: userEmail,
            name: newName,
            avatar: newAvatar
        });

        if (!updatedUser) {
            throw new Error("No profile was updated. Run the users update policy in Supabase, then log out and log in again.");
        }

        localStorage.setItem("username", updatedUser.name);
        localStorage.setItem("userEmail", updatedUser.email);
        localStorage.setItem("userRole", updatedUser.role || "user");

        if (updatedUser.avatar) {
            localStorage.setItem("avatar", updatedUser.avatar);
        } else {
            localStorage.removeItem("avatar");
        }

        renderLoggedInUI(updatedUser.name, updatedUser.avatar, updatedUser.role);
        modal?.classList.add("hidden");
    } catch (error) {
        alert(error.message || "Could not update account.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = previousText;
    }
});

// ================== Sign Out ==================

signOutBtn?.addEventListener("click", () => {
    clearStoredUser();
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

window.addEventListener("load", renderCurrentUser);


// Loader   

// عند الضغط على أي لينك
document.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", function(e) {

        // تجاهل اللينكات اللي فيها #
        const href = this.getAttribute("href");
        if (!href || href.startsWith("#")) return;

        e.preventDefault();

        loader?.classList.remove("hidden");

        setTimeout(() => {
            window.location.href = this.href;
        }, 500); // وقت بسيط للأنيميشن
    });
});

// عند تحميل الصفحة
window.addEventListener("load", () => {
    loader?.classList.add("hidden");
});


// ================== Home Skills Scrollbar ==================

function updateDots() {
    if (!slider || !dots.length) return;

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
slider?.addEventListener("scroll", updateDots);

// عند تحميل الصفحة
window.addEventListener("load", updateDots);

// ================== Contact Messages ==================

function showContactMessage(form, text, type = "error") {
    const message = form.querySelector(".contact-message");
    if (!message) return;

    message.textContent = text;
    message.className = "contact-message rounded-xl px-4 py-3 text-sm";

    if (type === "success") {
        message.classList.add("bg-green-500/10", "text-green-300", "border", "border-green-500/30");
        return;
    }

    message.classList.add("bg-red-500/10", "text-red-300", "border", "border-red-500/30");
}

document.querySelectorAll(".contact-form").forEach(form => {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const supabase = window.supabaseClient;
        const submitBtn = form.querySelector("button[type='submit']");
        const name = form.elements.name.value.trim();
        const phone = form.elements.phone.value.trim();
        const message = form.elements.message.value.trim();

        if (!supabase) {
            showContactMessage(form, "Database connection is not ready.");
            return;
        }

        if (!name || !phone || !message) {
            showContactMessage(form, "Please enter your name, phone number, and message.");
            return;
        }

        if (!/^\d{7,15}$/.test(phone)) {
            showContactMessage(form, "Phone number must contain 7 to 15 numbers.");
            return;
        }

        const previousText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "Sending...";
        }

        try {
            const { error } = await supabase
                .from("contact_messages")
                .insert({ name, phone, message });

            if (error) throw error;

            form.reset();
            showContactMessage(form, "Message sent successfully.", "success");
        } catch (error) {
            showContactMessage(form, error.message || "Could not send message.");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = previousText;
            }
        }
    });
});
