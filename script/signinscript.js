import { getSupabaseClient } from "./supabase.js";

const form = document.getElementById("signInForm");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const repasswordInput = document.getElementById("repassword");
const avatarInput = document.getElementById("avatar");
const avatarPreview = document.getElementById("avatarPreview");
const roleInput = document.getElementById("role");
const submitBtn = document.getElementById("signInSubmit");
const message = document.getElementById("signInMessage");
const togglePass = document.getElementById("togglePass");
const toggleRePass = document.getElementById("toggleRePass");

function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = "rounded-xl px-4 py-3 text-sm";

    if (type === "success") {
        message.classList.add("bg-green-500/10", "text-green-300", "border", "border-green-500/30");
        return;
    }

    message.classList.add("bg-red-500/10", "text-red-300", "border", "border-red-500/30");
}

function togglePassword(input, icon) {
    const shouldShow = input.type === "password";
    input.type = shouldShow ? "text" : "password";
    icon.classList.toggle("fa-eye", !shouldShow);
    icon.classList.toggle("fa-eye-slash", shouldShow);
}

togglePass?.addEventListener("click", () => togglePassword(passwordInput, togglePass));
toggleRePass?.addEventListener("click", () => togglePassword(repasswordInput, toggleRePass));

avatarInput?.addEventListener("change", () => {
    avatarPreview.src = avatarInput.value;
});

form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const repassword = repasswordInput.value;
    const avatar = avatarInput.value.trim() || null;
    const role = roleInput.value || "user";
    const gender = form.querySelector("input[name='gender']:checked")?.value || null;

    if (password !== repassword) {
        showMessage("Passwords do not match.");
        return;
    }

    if (password.length < 6) {
        showMessage("Password must be at least 6 characters.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";

    try {
        const supabase = getSupabaseClient();

        const { data: existingUser, error: checkError } = await supabase
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
            showMessage("This email is already registered.");
            return;
        }

        const { data: createdUser, error: insertError } = await supabase
            .from("users")
            .insert({
                name,
                email,
                password,
                avatar,
                role,
                gender
            })
            .select("id, name, email, avatar, role, gender, created_at")
            .single();

        if (insertError) throw insertError;

        showMessage("Account created successfully. Redirecting to login...", "success");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 800);
    } catch (error) {
        showMessage(error.message || "Could not create account.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
    }
});
