import { getSupabaseClient } from "./supabase.js";

// ── Read redirect target from query string ──
const _urlParams   = new URLSearchParams(window.location.search);
const _redirectTo  = _urlParams.get("redirect") || "dashboard.html";

// ── Auth guard: skip login page only if FULLY authenticated as admin ──
// Must have BOTH flags set — prevents the loop with dashboard's guard
const _role   = localStorage.getItem("userRole");
const _authed = localStorage.getItem("adminAuthenticated");
if (_role === "admin" && _authed === "true") {
    window.location.replace(_redirectTo);
}

// ── DOM refs ──
const form          = document.getElementById("adminLoginForm");
const emailInput    = document.getElementById("adminEmail");
const passwordInput = document.getElementById("adminPassword");
const submitBtn     = document.getElementById("adminLoginSubmit");
const msgBox        = document.getElementById("adminLoginMessage");
const msgText       = document.getElementById("messageText");
const togglePass    = document.getElementById("toggleAdminPass");
const btnText       = document.getElementById("btnText");
const btnSpinner    = document.getElementById("btnSpinner");
const btnIcon       = document.getElementById("btnIcon");
const card          = document.getElementById("loginCard");

// ── Password visibility toggle ──
togglePass?.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    const icon = togglePass.querySelector("i");
    if (icon) {
        icon.classList.toggle("fa-eye",      !isHidden);
        icon.classList.toggle("fa-eye-slash",  isHidden);
    }
});

// ── Message helpers ──
function showMessage(text, type = "error") {
    if (msgText) msgText.textContent = text;
    msgBox.className = "message-box " + (type === "success" ? "success" : "error");
    msgBox.style.display = "flex";

    // Shake card on error
    if (type === "error" && card) {
        card.classList.remove("shake");
        void card.offsetWidth; // force reflow to restart animation
        card.classList.add("shake");
        card.addEventListener("animationend", () => card.classList.remove("shake"), { once: true });
    }
}

function hideMessage() {
    msgBox.style.display = "none";
}

// ── Set button loading state ──
function setLoading(loading) {
    submitBtn.disabled       = loading;
    btnSpinner.style.display = loading ? "block" : "none";
    btnIcon.style.display    = loading ? "none"  : "";
    btnText.textContent      = loading ? "Verifying..." : "Sign In to Dashboard";
}

// ── Form submit ──
form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideMessage();

    const email    = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || !password) {
        showMessage("Please enter your email and password.");
        return;
    }

    setLoading(true);

    let success = false;

    try {
        const supabase = getSupabaseClient();

        const { data: user, error } = await supabase
            .from("users")
            .select("id, name, email, password, avatar, role")
            .eq("email", email)
            .eq("password", password)
            .maybeSingle();

        if (error) throw error;

        // User not found or wrong password
        if (!user) {
            showMessage("Invalid email or password.");
            return;
        }

        // Role check — only admins allowed
        if (user.role !== "admin") {
            showMessage("Access denied. Admin privileges required.");
            return;
        }

        // ── Save admin session ──
        localStorage.setItem("userId",             user.id);
        localStorage.setItem("username",           user.name);
        localStorage.setItem("userEmail",          user.email);
        localStorage.setItem("userRole",           user.role);
        localStorage.setItem("adminAuthenticated", "true");

        if (user.avatar) {
            localStorage.setItem("avatar", user.avatar);
        } else {
            localStorage.removeItem("avatar");
        }

        success = true;
        showMessage("Access granted. Redirecting…", "success");

        setTimeout(() => {
            window.location.replace(_redirectTo);
        }, 850);

    } catch (err) {
        console.error("Admin login error:", err);
        showMessage(err.message || "An error occurred. Please try again.");
    } finally {
        // Only reset the button if login did NOT succeed
        if (!success) {
            setLoading(false);
        }
    }
});
