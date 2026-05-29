import { supabase } from "./supabase.js";

const params = new URLSearchParams(window.location.search);
const projectId = params.get("id");

const projectMainImage = document.getElementById("projectMainImage");
const projectTitle = document.getElementById("projectTitle");
const projectDescription = document.getElementById("projectDescription");
const projectLikes = document.getElementById("projectLikes");
const projectDemoBtn = document.getElementById("projectDemoBtn");

const commentsContainer = document.getElementById("commentsContainer");
const commentInput = document.getElementById("commentInput");
const addCommentBtn = document.getElementById("addCommentBtn");
const pageLoader = document.getElementById("pageLoader");

const likeBtn = document.getElementById("likeBtn");
const likeIcon = document.getElementById("likeIcon");

const shareBtn = document.getElementById("shareBtn");
const shareModal = document.getElementById("shareModal");
const closeShare = document.getElementById("closeShare");
const shareLink = document.getElementById("shareLink");
const copyBtn = document.getElementById("copyBtn");

let currentUser = null;
let currentProject = null;
let isLiked = false;

async function getCurrentUser() {
    try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) return data.user;

        // Fallback: try getSession (older/newer SDK differences)
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) return sessionData.session.user;

        return null;
    } catch (err) {
        console.error("Auth error:", err);
        return null;
    }
}

// Robust current user resolver: tries Supabase auth, then window.supabaseClient, then localStorage userId
async function resolveCurrentUser() {
    // Prefer already cached user
    if (currentUser) return currentUser;

    // Try SDK auth methods
    try {
        const u = await getCurrentUser();
        if (u) {
            currentUser = u;
            return currentUser;
        }
    } catch (e) {
        console.warn("getCurrentUser failed:", e);
    }

    // Try window.supabaseClient if available
    const client = window.supabaseClient || supabase;
    if (client) {
        try {
            // If a provider stored session cookies, getUser should work via client
            const { data } = await client.auth.getUser();
            if (data?.user) {
                currentUser = data.user;
                return currentUser;
            }
        } catch (e) {
            // ignore
        }

        // Fallback to localStorage-stored userId
        const storedId = localStorage.getItem("userId");
        if (storedId) {
            try {
                const { data: userRow, error } = await client
                    .from("users")
                    .select("id, name, email, avatar")
                    .eq("id", storedId)
                    .maybeSingle();

                if (!error && userRow) {
                    currentUser = { id: userRow.id, email: userRow.email, user_metadata: { full_name: userRow.name }, name: userRow.name };
                    return currentUser;
                }
            } catch (e) {
                // ignore
            }
        }
    }

    return null;
}

function formatTime(dateString) {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
}

async function loadProjectDetails() {
    if (!projectId) {
        commentsContainer.innerHTML = `
            <p class="text-red-400">No project id found in URL.</p>
        `;
        return;
    }

    const { data, error } = await supabase
        .from("products")
        .select(`
            id,
            title,
            description,
            main_image,
            video_url,
            likes,
            created_at,
            project_media (
                media_url,
                media_type
            )
        `)
        .eq("id", projectId)
        .single();

    if (error) {
        console.error("Project load error:", error);
        commentsContainer.innerHTML = `
            <p class="text-red-400">Failed to load project details.</p>
        `;
        return;
    }

    currentProject = data;

    const image =
        data.main_image ||
        data.project_media?.[0]?.media_url ||
        "./img/Prod1.png";

    projectMainImage.src = image;
    projectTitle.textContent = data.title || "Project Title";
    projectDescription.textContent = data.description || "No description available.";
    projectLikes.textContent = data.likes ?? 0;

    if (data.video_url) {
        projectDemoBtn.href = data.video_url;
        projectDemoBtn.classList.remove("pointer-events-none", "opacity-50");
    } else {
        projectDemoBtn.href = "#";
        projectDemoBtn.classList.add("pointer-events-none", "opacity-50");
    }

    if (shareLink) {
        shareLink.value = window.location.href;
    }
}

async function loadComments() {
    const { data, error } = await supabase
        .from("comments")
        .select(`
            id,
            comment_text,
            likes,
            dislikes,
            created_at,
            user_id,
            users (
                name,
                avatar
            )
        `)
        .eq("product_id", projectId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Comments load error:", error);
        commentsContainer.innerHTML = `
            <p class="text-red-400">Failed to load comments.</p>
        `;
        return;
    }

    renderComments(data || []);
}

function renderComments(comments) {
    if (!comments.length) {
        commentsContainer.innerHTML = `
            <p class="text-gray-400">No comments yet. Be the first to comment.</p>
        `;
        return;
    }

    commentsContainer.innerHTML = comments.map((c) => {
        const avatar = c.users?.avatar || "./img/avatar1.png";
        const name = c.users?.name || "User";
        const time = formatTime(c.created_at);

        return `
            <div class="bg-gray-950 border border-gray-800 rounded-2xl p-5">
                <div class="flex items-start gap-4">
                    <img src="${avatar}" alt="user" class="w-12 h-12 rounded-full object-cover border border-gray-700">
                    <div class="flex-1">
                        <div class="flex items-center justify-between gap-4">
                            <div>
                                <h4 class="font-semibold">${name}</h4>
                                <p class="text-xs text-gray-500">${time}</p>
                            </div>
                        </div>

                        <p class="comment-text text-gray-300 mt-3 leading-relaxed">
                            ${c.comment_text}
                        </p>

                                        <div class="mt-3 flex items-center gap-3 text-sm text-gray-400">
                                            <button class="comment-like-btn hover:text-red-400 transition flex items-center gap-1" data-comment-id="${c.id}">
                                                <i class="fa-regular fa-heart"></i>
                                                <span>${c.likes || 0}</span>
                                            </button>
                                            <button class="comment-dislike-btn hover:text-blue-400 transition flex items-center gap-1" data-comment-id="${c.id}">
                                                <i class="fa-regular fa-thumbs-down"></i>
                                                <span>${c.dislikes || 0}</span>
                                            </button>
                                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

async function addComment() {
    const text = commentInput.value.trim();
    if (!text) return;

    currentUser = currentUser || await resolveCurrentUser();

    if (!currentUser) {
        alert("You must sign in first to comment.");
        return;
    }

    const { error } = await supabase.from("comments").insert({
        user_id: currentUser.id,
        product_id: projectId,
        comment_text: text,
        likes: 0,
        dislikes: 0
    });

    if (error) {
        console.error("Add comment error:", error);
        alert("Failed to add comment.");
        return;
    }

    commentInput.value = "";
    await loadComments();
}

// Handle comment like/dislike via event delegation
commentsContainer.addEventListener("click", async (e) => {
    const likeBtnEl = e.target.closest(".comment-like-btn");
    const dislikeBtnEl = e.target.closest(".comment-dislike-btn");

    if (!likeBtnEl && !dislikeBtnEl) return;

    currentUser = currentUser || await resolveCurrentUser();
    if (!currentUser) {
        alert("You must sign in first to react to comments.");
        return;
    }

    const isLike = !!likeBtnEl;
    const btn = likeBtnEl || dislikeBtnEl;
    const commentId = btn.dataset.commentId;

    try {
        // Fetch current counts
        const { data: comment, error } = await supabase
            .from("comments")
            .select("likes,dislikes")
            .eq("id", commentId)
            .single();

        if (error) throw error;

        const field = isLike ? "likes" : "dislikes";
        const newVal = (comment[field] || 0) + 1;

        const { error: updateErr } = await supabase
            .from("comments")
            .update({ [field]: newVal })
            .eq("id", commentId);

        if (updateErr) throw updateErr;

        await loadComments();
    } catch (err) {
        console.error("React comment error:", err);
        alert("Failed to update reaction.");
    }
});

async function updateLikesCount() {
    const { count, error } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("product_id", projectId);

    if (error) {
        console.error("Likes count error:", error);
        return;
    }

    projectLikes.textContent = count || 0;
}

async function refreshLikeState() {
    currentUser = currentUser || await resolveCurrentUser();

    if (!currentUser) {
        isLiked = false;
        likeIcon.classList.remove("fa-solid");
        likeIcon.classList.add("fa-regular");
        return;
    }

    const { data, error } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("product_id", projectId)
        .maybeSingle();

    if (error) {
        console.error("Like state error:", error);
        return;
    }

    isLiked = !!data;

    if (isLiked) {
        likeIcon.classList.remove("fa-regular");
        likeIcon.classList.add("fa-solid");
    } else {
        likeIcon.classList.remove("fa-solid");
        likeIcon.classList.add("fa-regular");
    }
}

async function likeProject() {
    currentUser = currentUser || await resolveCurrentUser();

    if (!currentUser) {
        alert("You must sign in first to like this project.");
        return;
    }

    const { data: existingLike, error: existingLikeError } = await supabase
        .from("likes")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("product_id", projectId)
        .maybeSingle();

    if (existingLikeError) {
        console.error("Check like error:", existingLikeError);
        alert("Something went wrong.");
        return;
    }

    if (existingLike) {
        const { error: deleteError, data: deleted } = await supabase
            .from("likes")
            .delete()
            .eq("id", existingLike.id)
            .select();

        if (deleteError) {
            console.error("Unlike error:", deleteError);
            alert(`Failed to remove like: ${deleteError.message || deleteError}`);
            return;
        }

        isLiked = false;
        likeIcon.classList.remove("fa-solid");
        likeIcon.classList.add("fa-regular");
    } else {
        console.debug("Attempting to insert like", { user_id: currentUser.id, product_id: projectId });
        const { data: inserted, error: insertError } = await supabase.from("likes").insert({
            user_id: currentUser.id,
            product_id: projectId
        }).select();

        if (insertError) {
            console.error("Like error:", insertError);
            alert(`Failed to like project: ${insertError.message || JSON.stringify(insertError)}`);
            return;
        }

        console.debug("Inserted like row:", inserted);

        isLiked = true;
        likeIcon.classList.remove("fa-regular");
        likeIcon.classList.add("fa-solid");
    }

    await updateLikesCount();
}

function openShareModal() {
    shareModal.classList.remove("hidden");
    shareModal.classList.add("flex");
    shareLink.value = window.location.href;
}

function closeShareModal() {
    shareModal.classList.remove("flex");
    shareModal.classList.add("hidden");
}

async function copyShareLink() {
    try {
        await navigator.clipboard.writeText(shareLink.value);
        copyBtn.innerHTML = "✔";
        setTimeout(() => {
            copyBtn.innerHTML = `<i class="fa-solid fa-copy"></i>`;
        }, 1000);
    } catch (error) {
        console.error("Copy error:", error);
        shareLink.select();
        document.execCommand("copy");
    }
}

async function init() {
    pageLoader?.classList.add("hidden");

    currentUser = await resolveCurrentUser();

    if (!currentUser) {
        addCommentBtn.disabled = true;
        addCommentBtn.classList.add("opacity-50", "cursor-not-allowed");
        commentInput.placeholder = "Sign in first to comment...";
    }

    await loadProjectDetails();
    await loadComments();
    await updateLikesCount();
    await refreshLikeState();
}

// Listen to auth state changes to enable/disable comment and refresh like state
if (supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === "function") {
    supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;

        if (currentUser) {
            addCommentBtn.disabled = false;
            addCommentBtn.classList.remove("opacity-50", "cursor-not-allowed");
            commentInput.placeholder = "Write your comment...";
            refreshLikeState();
        } else {
            addCommentBtn.disabled = true;
            addCommentBtn.classList.add("opacity-50", "cursor-not-allowed");
            commentInput.placeholder = "Sign in first to comment...";
            refreshLikeState();
        }
    });
}

addCommentBtn.addEventListener("click", addComment);
likeBtn.addEventListener("click", likeProject);

shareBtn?.addEventListener("click", openShareModal);
closeShare?.addEventListener("click", closeShareModal);
copyBtn?.addEventListener("click", copyShareLink);

shareModal?.addEventListener("click", (e) => {
    if (e.target === shareModal) {
        closeShareModal();
    }
});

window.addEventListener("load", init);