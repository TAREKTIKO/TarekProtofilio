// Password
const togglePass = document.getElementById("togglePass");
const password = document.getElementById("password");

togglePass.addEventListener("click", () => {
    if (password.type === "password") {
        password.type = "text";
        togglePass.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        password.type = "password";
        togglePass.classList.replace("fa-eye-slash", "fa-eye");
    }
});


// Confirm Password
const toggleRePass = document.getElementById("toggleRePass");
const repassword = document.getElementById("repassword");

toggleRePass.addEventListener("click", () => {
    if (repassword.type === "password") {
        repassword.type = "text";
        toggleRePass.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        repassword.type = "password";
        toggleRePass.classList.replace("fa-eye-slash", "fa-eye");
    }
});