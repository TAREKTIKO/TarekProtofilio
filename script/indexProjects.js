import { supabase } from "./supabase.js";

const projectsGrid = document.getElementById("projectsGrid");

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

async function loadTopProjects() {
    try {
        // Fetch projects ordered by created_at
        const { data: projects, error } = await supabase
            .from("products")
            .select(`
                id,
                title,
                description,
                main_image,
                video_url,
                created_at,
                project_media (
                    media_url
                )
            `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error loading projects:", error);
            projectsGrid.innerHTML = `
                <div class="col-span-full text-center text-red-400">
                    <p>Failed to load projects</p>
                </div>
            `;
            return;
        }

        if (!projects || projects.length === 0) {
            projectsGrid.innerHTML = `
                <div class="col-span-full text-center text-gray-400">
                    <p>No projects available yet</p>
                </div>
            `;
            return;
        }

        // Fetch stats for each project
        const projectsWithStats = await Promise.all(
            (projects || []).map(async (project) => {
                const stats = await getProjectStats(project.id);
                return {
                    ...project,
                    likes_count: stats.likes,
                    comments_count: stats.comments
                };
            })
        );

        // Sort by likes (descending) to get most popular first, then slice top 3
        const topProjects = projectsWithStats
            .sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
            .slice(0, 3);

        renderProjects(topProjects);
    } catch (error) {
        console.error("Error:", error);
        projectsGrid.innerHTML = `
            <div class="col-span-full text-center text-red-400">
                <p>An error occurred while loading projects</p>
            </div>
        `;
    }
}

function renderProjects(projects) {
    projectsGrid.innerHTML = projects.map((project) => {
        const projectImage = project.main_image || project.project_media?.[0]?.media_url || "./img/Prod1.png";
        const projectTitle = project.title || "Project Title";
        const projectDesc = project.description || "No description available.";
        const likesCount = project.likes_count ?? 0;
        const commentsCount = project.comments_count ?? 0;

        return `
            <div class="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-900/20 transition-all duration-300 group max-w-sm w-full min-h-[28rem] flex flex-col justify-between">
                <!-- Image -->
                <div class="overflow-hidden h-64">
                    <img src="${projectImage}" alt="${projectTitle}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.src='./img/Prod1.png'">
                </div>
                <!-- Content -->
                <div class="p-6 flex flex-col gap-4 flex-1">
                    <h3 class="text-lg font-semibold">
                        ${projectTitle}
                    </h3>
                    <p class="text-gray-400 text-sm line-clamp-2">
                        ${projectDesc}
                    </p>
                    <!-- 🔥 Stats (Likes + Comments) -->
                    <div class="flex items-center gap-6 text-sm text-gray-400 mt-2">
                        <!-- Likes -->
                        <div class="flex items-center gap-2 hover:text-red-400 transition cursor-pointer">
                            <i class="fa-regular fa-heart"></i>
                            <span class="likes-count">${likesCount}</span>
                        </div>
                        <!-- Comments -->
                        <div class="flex items-center gap-2 hover:text-blue-400 transition cursor-pointer">
                            <i class="fa-regular fa-comment"></i>
                            <span class="comments-count">${commentsCount}</span>
                        </div>
                    </div>
                    <!-- Buttons -->
                    <div class="flex gap-3 mt-auto">
                        <a href="./ProductDetails.html?id=${project.id}" class="flex-1 bg-amber-500 text-black py-2 rounded-lg hover:bg-amber-400 transition text-center font-medium">
                            View Demo
                        </a>
                        <a href="./ProductDetails.html?id=${project.id}" class="flex-1 border border-amber-500 py-2 rounded-lg hover:bg-amber-500 hover:text-black transition text-center font-medium">
                            Details
                        </a>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

// Load projects when page loads
window.addEventListener("load", loadTopProjects);
