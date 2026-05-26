// ================== Certificate Modal ==================

const certModal = document.getElementById("certModal");
const certImage = document.getElementById("certImage");

function openCertificate(src) {
    if (!certModal || !certImage) return;

    certImage.src = src;

    certModal.classList.remove("hidden");
    certModal.classList.add("flex");
}

// قفل المودال لما تضغط برا الصورة بس
certModal?.addEventListener("click", (e) => {
    if (e.target === certModal) {
        certModal.classList.add("hidden");
    }
});


// ================== Details Modal ==================

const detailsModal = document.getElementById("detailsModal");

function openDetails() {
    if (!detailsModal) return;

    detailsModal.classList.remove("hidden");
    detailsModal.classList.add("flex");
}

function closeDetails() {
    if (!detailsModal) return;

    detailsModal.classList.add("hidden");
}


// // ================== Loader ==================      تم إلغائه عشان اصلا موجود في الصفحة الاساسية بتاعه js 

// const loader = document.getElementById("pageLoader");

// // عند الضغط على أي لينك
// document.querySelectorAll("a").forEach(link => {
//     link.addEventListener("click", function (e) {

//         const href = this.getAttribute("href");

//         // تجاهل الحالات دي
//         if (!href || href.startsWith("#") || href.startsWith("javascript")) return;

//         e.preventDefault();

//         loader?.classList.remove("hidden");

//         setTimeout(() => {
//             window.location.href = this.href;
//         }, 400);
//     });
// });

// // عند تحميل الصفحة
// window.addEventListener("load", () => {
//     loader?.classList.add("hidden");
// });