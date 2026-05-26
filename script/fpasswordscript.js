const emailForm = document.getElementById("emailForm");
const passwordForm = document.getElementById("passwordForm");

emailForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // fade out email form
    emailForm.classList.add("opacity-0");

    setTimeout(() => {
        emailForm.classList.add("pointer-events-none");

        // show password form
        passwordForm.classList.remove("opacity-0", "pointer-events-none");

    }, 500); // نفس مدة transition
});


// 👁️ Toggle password (لكل الأعين)
document.querySelectorAll(".toggle-eye").forEach(icon => {
    icon.addEventListener("click", () => {
        const input = icon.previousElementSibling;

        if (input.type === "password") {
            input.type = "text";
            icon.classList.replace("fa-eye", "fa-eye-slash");
        } else {
            input.type = "password";
            icon.classList.replace("fa-eye-slash", "fa-eye");
        }
    });
});