import { supabase } from "./supabase.js";

const sortSelect = document.getElementById("sortProjects");
const container = document.getElementById("projectsContainer");
const loader = document.getElementById("pageLoader");

let allProjects = [];

const DESCRIPTION_LIMIT = 120;

function escapeHTML(value = "") {
    const div = document.createElement("div");
    div.textContent = value;
    return div.innerHTML;
}

function getExpandableDescription(description) {
    const fullDescription = description || "Short description about the project goes here...";

    if (fullDescription.length <= DESCRIPTION_LIMIT) {
        return escapeHTML(fullDescription);
    }

    const shortDescription = `${fullDescription.slice(0, DESCRIPTION_LIMIT).trim()}...`;

    return `
        <span class="description-text"
            data-short="${escapeHTML(shortDescription)}"
            data-full="${escapeHTML(fullDescription)}">${escapeHTML(shortDescription)}</span>
        <button type="button" class="description-toggle ml-1 text-amber-500 hover:text-amber-400 font-semibold">
            Show more
        </button>
    `;
}

async function getProjectStats(projectId) {
    try {
        const [likesResponse, commentsResponse] = await Promise.all([
            supabase
                .from("likes")
                .select("id", { count: "exact", head: true })
                .eq("product_id", projectId),
            supabase
                .from("comments")
                .select("id", { count: "exact", head: true })
                .eq("product_id", projectId)
        ]);

        return {
            likes: likesResponse.count || 0,
            comments: commentsResponse.count || 0
        };
    } catch (error) {
        console.error("Error loading project stats:", error);
        return { likes: 0, comments: 0 };
    }
}

async function loadProjects() {
    try {
        const { data, error } = await supabase
            .from("products")
            .select(`
                id,
                title,
                description,
                main_image,
                video_url,
                demo_url,
                likes,
                created_at,
                project_media (
                    media_url
                )
            `)
            .eq("is_visible", true)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Fetch stats for each project
        const projectsWithStats = await Promise.all(
            (data || []).map(async (project) => {
                const stats = await getProjectStats(project.id);
                return {
                    ...project,
                    likes_count: stats.likes,
                    comments_count: stats.comments
                };
            })
        );

        allProjects = projectsWithStats || [];
        renderProjects(allProjects);
    } catch (error) {
        console.error("Error loading projects:", error);
        container.innerHTML = `
            <p class="text-red-500 text-center col-span-full">
                Failed To Load Projects
            </p>
        `;
    }
}

function renderProjects(projects) {
    container.innerHTML = "";

    projects.forEach(project => {
        const card = document.createElement("div");
        card.className = "project-card bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-900/20 transition-all duration-300 group max-w-sm w-full min-h-[28rem] flex flex-col justify-between";

        const image =
            project.main_image ||
            project.project_media?.[0]?.media_url ||
            "./img/Prod1.png";

        const likesCount = project.likes_count ?? 0;
        const commentsCount = project.comments_count ?? 0;

        card.dataset.date = project.created_at || "";
        card.dataset.name = project.title || "";
        card.dataset.likes = likesCount;

        card.innerHTML = `
            <div class="overflow-hidden h-64">
                <img src="${image}" class="w-full h-full object-fill group-hover:scale-105 transition duration-300" onerror="this.src='./img/Prod1.png'">
            </div>

            <div class="p-6 flex flex-col gap-4 flex-1">
                <h3 class="text-lg font-semibold">${project.title || "Project Title"}</h3>

                <p class="project-description text-gray-400 text-sm leading-relaxed min-h-[4.5rem] max-h-[4.5rem] overflow-y-auto pr-1">
                    ${getExpandableDescription(project.description)}
                </p>

                <div class="flex items-center gap-6 text-sm text-gray-400 mt-2">
                    <div class="flex items-center gap-2 hover:text-red-400 transition cursor-pointer">
                        <i class="fa-regular fa-heart"></i>
                        <span class="likes-count">${likesCount}</span>
                    </div>

                    <div class="flex items-center gap-2 hover:text-blue-400 transition cursor-pointer">
                        <i class="fa-regular fa-comment"></i>
                        <span class="comments-count">${commentsCount}</span>
                    </div>
                </div>

                <div class="flex gap-3 mt-auto">
                    <a href="${project.demo_url || '#'}" target="_blank"
                        class="flex-1 text-center bg-amber-500 text-black py-2 rounded-lg hover:bg-amber-400 transition ${project.demo_url ? '' : 'pointer-events-none opacity-50'}">
                        View Demo
                    </a>

                    <a href="./ProductDetails.html?id=${project.id}"
                        class="flex-1 text-center border border-amber-500 py-2 rounded-lg hover:bg-amber-500 hover:text-black transition">
                        Details
                    </a>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

container.addEventListener("click", (event) => {
    const toggle = event.target.closest(".description-toggle");
    if (!toggle) return;

    const description = toggle.closest(".project-description");
    const text = description?.querySelector(".description-text");
    if (!description || !text) return;

    const isExpanded = toggle.dataset.expanded === "true";
    text.textContent = isExpanded ? text.dataset.short : text.dataset.full;
    toggle.textContent = isExpanded ? "Show more" : "Show less";
    toggle.dataset.expanded = String(!isExpanded);
});

function initializeSorting() {
    sortSelect.addEventListener("change", () => {
        let sortedProjects = [...allProjects];
        const value = sortSelect.value;

        if (value === "latest") {
            sortedProjects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (value === "oldest") {
            sortedProjects.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        } else if (value === "name") {
            sortedProjects.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        } else if (value === "top-likes") {
            sortedProjects.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        }

        renderProjects(sortedProjects);
    });
}

window.addEventListener("load", async () => {
    loader.classList.add("hidden");
    await loadProjects();
    initializeSorting();
});
