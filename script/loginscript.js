import { getSupabaseClient } from "./supabase.js";

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("loginEmail");
const passwordInput = document.getElementById("loginPassword");
const submitBtn = document.getElementById("loginSubmit");
const message = document.getElementById("loginMessage");
const toggle = document.getElementById("toggleLoginPass");

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = "rounded-xl px-4 py-3 text-sm";

    if (type === "success") {
        message.classList.add("bg-green-500/10", "text-green-300", "border", "border-green-500/30");
        return;
    }

    message.classList.add("bg-red-500/10", "text-red-300", "border", "border-red-500/30");
}

function saveUserLocally(user) {
    localStorage.setItem("userId", user.id);
    localStorage.setItem("username", user.name);
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userRole", user.role || "user");

    if (user.avatar) {
        localStorage.setItem("avatar", user.avatar);
    } else {
        localStorage.removeItem("avatar");
    }
}

toggle?.addEventListener("click", () => {
    const shouldShow = passwordInput.type === "password";
    passwordInput.type = shouldShow ? "text" : "password";
    toggle.classList.toggle("fa-eye", !shouldShow);
    toggle.classList.toggle("fa-eye-slash", shouldShow);
});

form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";

    try {
        const supabase = getSupabaseClient();
        const { data: user, error } = await supabase
            .from("users")
            .select("id, name, email, password, avatar, role, gender, created_at")
            .eq("email", email)
            .eq("password", password)
            .maybeSingle();

        if (error) throw error;

        if (!user) {
            showMessage("Invalid email or password.");
            return;
        }

        saveUserLocally(user);
        showMessage("Login successful. Redirecting...", "success");

        setTimeout(() => {
            window.location.href = "index.html";
        }, 700);
    } catch (error) {
        showMessage(error.message || "Could not log in.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Login";
    }
});
