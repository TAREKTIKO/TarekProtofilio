// ================== Certificates Data ==================

const certificatesGrid = document.getElementById("certificatesGrid");
const certModal = document.getElementById("certModal");
const certImage = document.getElementById("certImage");
const detailsModal = document.getElementById("detailsModal");
const detailsTitle = document.getElementById("detailsTitle");
const detailsContent = document.getElementById("detailsContent");

const fallbackCertificateImage = "./img/Certificate.png";
let certificates = [];

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getCertificateImage(certificate) {
    return certificate.image_url || certificate.image || fallbackCertificateImage;
}

function getSkills(skills) {
    if (Array.isArray(skills)) return skills.filter(Boolean);
    if (!skills) return [];

    return String(skills)
        .split(/\r?\n|,/)
        .map(skill => skill.trim())
        .filter(Boolean);
}

function renderStatusBadge(isVerified) {
    if (isVerified) {
        return `
            <span class="absolute top-3 left-3 bg-blue-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <i class="fa-solid fa-check"></i>Verified
            </span>
        `;
    }

    return `
        <span class="absolute top-3 left-3 bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <i class="fa-solid fa-clock"></i>Not Verified
        </span>
    `;
}

function renderCertificateCard(certificate, index) {
    const image = getCertificateImage(certificate);
    const name = certificate.name || "Certificate";
    const academy = certificate.academy_name || "Academy";
    const duration = certificate.duration || "Duration N/A";
    const hours = certificate.hours ? `${certificate.hours} Hours` : "Hours N/A";
    const dateYear = certificate.date_year || "Year N/A";
    const description = certificate.description || `Certificate from ${academy}.`;
    const isVerified = certificate.verified !== false;

    return `
        <article class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-900/20 transition-all duration-300 group max-w-sm w-full min-h-[30rem] flex flex-col justify-between">
            <div class="relative overflow-hidden h-64">
                <img src="${escapeHTML(image)}" alt="${escapeHTML(name)}" class="w-full h-full object-fill group-hover:scale-105 transition duration-300">
                ${renderStatusBadge(isVerified)}
            </div>

            <div class="p-6 flex flex-col gap-4 flex-1">
                <div>
                    <h3 class="text-lg font-semibold flex items-start gap-2">
                        <i class="fa-solid fa-graduation-cap text-blue-400 mt-1"></i>
                        <span>${escapeHTML(name)}</span>
                    </h3>
                    <p class="mt-1 text-xs text-amber-500">${escapeHTML(academy)}</p>
                </div>

                <p class="text-gray-400 text-sm">${escapeHTML(description)}</p>

                <div class="grid grid-cols-2 gap-3 text-xs text-gray-400">
                    <span class="flex items-center gap-1">
                        <i class="fa-regular fa-calendar"></i>${escapeHTML(dateYear)}
                    </span>
                    <span class="flex items-center gap-1">
                        <i class="fa-regular fa-clock"></i>${escapeHTML(duration)}
                    </span>
                    <span class="col-span-2 flex items-center gap-1">
                        <i class="fa-solid fa-hourglass-half"></i>${escapeHTML(hours)}
                    </span>
                </div>

                <div class="flex gap-3 mt-auto">
                    <button type="button" data-index="${index}" class="view-certificate flex-1 bg-amber-500 text-black py-2 rounded-lg hover:bg-amber-400 transition">View</button>
                    <button type="button" data-index="${index}" class="details-certificate flex-1 border border-amber-500 py-2 rounded-lg hover:bg-amber-500 hover:text-black transition">Details</button>
                </div>
            </div>
        </article>
    `;
}

function renderCertificates(list) {
    if (!certificatesGrid) return;

    if (!list.length) {
        certificatesGrid.innerHTML = `<p class="col-span-full text-gray-400">No certificates found.</p>`;
        return;
    }

    certificatesGrid.innerHTML = list.map(renderCertificateCard).join("");
}

async function loadCertificates() {
    if (!certificatesGrid) return;

    const supabase = window.supabaseClient;
    if (!supabase) {
        certificatesGrid.innerHTML = `<p class="col-span-full text-red-300">Database connection is not ready.</p>`;
        return;
    }

    try {
        const { data, error } = await supabase
            .from("certificates")
            .select("*")
            .order("date_year", { ascending: false });

        if (error) throw error;

        certificates = data || [];
        renderCertificates(certificates);
    } catch (error) {
        certificatesGrid.innerHTML = `
            <p class="col-span-full text-red-300">
                ${escapeHTML(error.message || "Could not load certificates.")}
            </p>
        `;
    }
}

// ================== Certificate Modal ==================

function openCertificate(src) {
    if (!certModal || !certImage) return;

    certImage.src = src || fallbackCertificateImage;
    certModal.classList.remove("hidden");
    certModal.classList.add("flex");
}

certModal?.addEventListener("click", (event) => {
    if (event.target === certModal) {
        certModal.classList.add("hidden");
        certModal.classList.remove("flex");
    }
});

// ================== Details Modal ==================

function openDetails(index) {
    if (!detailsModal || !detailsContent || !detailsTitle) return;

    const certificate = certificates[index];
    if (!certificate) return;

    const name = certificate.name || "Certificate Details";
    const academy = certificate.academy_name || "N/A";
    const duration = certificate.duration || "N/A";
    const hours = certificate.hours ? `${certificate.hours} Hours` : "N/A";
    const dateYear = certificate.date_year || "N/A";
    const description = certificate.description || "No description available.";
    const verifiedText = certificate.verified !== false ? "Verified" : "Not Verified";
    const skills = getSkills(certificate.skills_learned);

    detailsTitle.textContent = `${name} Details`;
    detailsContent.innerHTML = `
        <p><span class="text-amber-500 font-semibold">Academy:</span> ${escapeHTML(academy)}</p>
        <p><span class="text-amber-500 font-semibold">Duration:</span> ${escapeHTML(duration)}</p>
        <p><span class="text-amber-500 font-semibold">Hours:</span> ${escapeHTML(hours)}</p>
        <p><span class="text-amber-500 font-semibold">Year:</span> ${escapeHTML(dateYear)}</p>
        <p><span class="text-amber-500 font-semibold">Status:</span> ${escapeHTML(verifiedText)}</p>
        <p><span class="text-amber-500 font-semibold">Description:</span> ${escapeHTML(description)}</p>
        <div>
            <p class="mb-2"><span class="text-amber-500 font-semibold">Skills Learned:</span></p>
            ${
                skills.length
                    ? `<ul class="list-disc pl-5 space-y-1 text-gray-400">${skills.map(skill => `<li>${escapeHTML(skill)}</li>`).join("")}</ul>`
                    : `<p class="text-gray-400">No skills listed.</p>`
            }
        </div>
    `;

    detailsModal.classList.remove("hidden");
    detailsModal.classList.add("flex");
}

function closeDetails() {
    if (!detailsModal) return;

    detailsModal.classList.add("hidden");
    detailsModal.classList.remove("flex");
}

detailsModal?.addEventListener("click", (event) => {
    if (event.target === detailsModal) closeDetails();
});

certificatesGrid?.addEventListener("click", (event) => {
    const viewButton = event.target.closest(".view-certificate");
    const detailsButton = event.target.closest(".details-certificate");

    if (viewButton) {
        const certificate = certificates[Number(viewButton.dataset.index)];
        openCertificate(getCertificateImage(certificate || {}));
    }

    if (detailsButton) {
        openDetails(Number(detailsButton.dataset.index));
    }
});

window.openCertificate = openCertificate;
window.openDetails = openDetails;
window.closeDetails = closeDetails;

window.addEventListener("load", loadCertificates);
