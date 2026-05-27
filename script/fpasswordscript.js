import { getSupabaseClient } from "./supabase.js";

const emailForm = document.getElementById("emailForm");
const passwordForm = document.getElementById("passwordForm");

let foundUser = null;

emailForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const emailInput = document.getElementById("emailInput");
    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
        alert("Please enter your email.");
        return;
    }

    try {
        const supabase = getSupabaseClient();
        const { data: user, error } = await supabase
            .from("users")
            .select("id, name, email")
            .eq("email", email)
            .maybeSingle();

        if (error) throw error;

        if (!user) {
            alert("No account found for this email.");
            return;
        }

        foundUser = user;

        // fade out email form
        emailForm.classList.add("opacity-0");

        setTimeout(() => {
            emailForm.classList.add("pointer-events-none");

            // show password form
            passwordForm.classList.remove("opacity-0", "pointer-events-none");

        }, 500);
    } catch (err) {
        console.error(err);
        alert(err.message || "Could not verify email.");
    }
});


// Handle change password form submit
passwordForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!foundUser) {
        alert("Please verify your email first.");
        return;
    }

    const nameInput = document.getElementById("nameInput");
    const newPasswordInput = document.getElementById("newPassword");

    const name = nameInput.value.trim();
    const newPassword = newPasswordInput.value;

    if (!name || !newPassword) {
        alert("Please enter your name and a new password.");
        return;
    }

    // Verify provided name matches database name for that email
    if (name !== foundUser.name) {
        alert("The name you entered does not match our records for this email.");
        return;
    }

    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from("users")
            .update({ password: newPassword })
            .eq("id", foundUser.id);

        if (error) throw error;

        alert("Password updated successfully. You can now log in.");
        window.location.href = "login.html";
    } catch (err) {
        console.error(err);
        alert(err.message || "Could not update password.");
    }
});


// 👁️ Toggle show/hide for inputs (works for text/password)
document.querySelectorAll(".toggle-eye").forEach(icon => {
    icon.addEventListener("click", () => {
        const input = icon.previousElementSibling;

        if (!input) return;

        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        icon.classList.toggle("fa-eye");
        icon.classList.toggle("fa-eye-slash");
    });
});