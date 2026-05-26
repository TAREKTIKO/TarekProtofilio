const sortSelect = document.getElementById("sortProjects");
const container = document.querySelector("#projectsContainer");
// Loader 
const loader = document.getElementById("pageLoader");

sortSelect.addEventListener("change", () => {

    const cards = Array.from(container.querySelectorAll(".project-card"));
    const value = sortSelect.value;

    let sorted;

    if (value === "latest") {
        sorted = cards.sort((a, b) => 
            new Date(b.dataset.date) - new Date(a.dataset.date)
        );
    }

    else if (value === "oldest") {
        sorted = cards.sort((a, b) => 
            new Date(a.dataset.date) - new Date(b.dataset.date)
        );
    }

    else if (value === "name") {
        sorted = cards.sort((a, b) => 
            a.dataset.name.localeCompare(b.dataset.name)
        );
    }

    else if (value === "status") {
        sorted = cards.sort((a, b) => 
            a.dataset.status.localeCompare(b.dataset.status)
        );
    }

    container.innerHTML = "";
    sorted.forEach(card => container.appendChild(card));
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