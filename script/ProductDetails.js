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
const commentCountSpan = document.querySelector("h3 .text-amber-500");

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
let allComments = [];

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

function getStoredUserProfile() {
    const id = localStorage.getItem("userId");
    const email = localStorage.getItem("userEmail");
    const name = localStorage.getItem("username");
    const avatar = localStorage.getItem("avatar");

    if (!id && !email) return null;

    return {
        id,
        email,
        name,
        avatar,
    };
}

function setCommentButtonState(enabled) {
    if (!addCommentBtn || !commentInput) return;

    addCommentBtn.disabled = !enabled;
    addCommentBtn.classList.toggle("opacity-50", !enabled);
    addCommentBtn.classList.toggle("cursor-not-allowed", !enabled);
    commentInput.placeholder = enabled ? "Write your comment..." : "Sign in first to comment...";
}

// Robust current user resolver: tries Supabase auth, then window.supabaseClient, then localStorage user data
async function resolveCurrentUser() {
    if (currentUser) return currentUser;

    // Try SDK auth methods first
    try {
        const u = await getCurrentUser();
        if (u) {
            currentUser = u;
            return currentUser;
        }
    } catch (e) {
        console.warn("getCurrentUser failed:", e);
    }

    const client = window.supabaseClient || supabase;
    const storedUser = getStoredUserProfile();

    if (client) {
        try {
            const { data } = await client.auth.getUser();
            if (data?.user) {
                currentUser = data.user;
                return currentUser;
            }
        } catch (e) {
            // no active auth session, continue to fallback
        }
    }

    if (storedUser) {
        if (client) {
            try {
                const { data: userRow, error } = await client
                    .from("users")
                    .select("id, name, email, avatar")
                    .eq("id", storedUser.id)
                    .maybeSingle();

                if (!error && userRow) {
                    currentUser = {
                        id: userRow.id,
                        email: userRow.email,
                        user_metadata: { full_name: userRow.name },
                        name: userRow.name,
                    };
                    return currentUser;
                }
            } catch (e) {
                console.warn("Local user lookup by id failed:", e);
            }

            if (storedUser.email) {
                try {
                    const { data: userRow, error } = await client
                        .from("users")
                        .select("id, name, email, avatar")
                        .eq("email", storedUser.email)
                        .maybeSingle();

                    if (!error && userRow) {
                        currentUser = {
                            id: userRow.id,
                            email: userRow.email,
                            user_metadata: { full_name: userRow.name },
                            name: userRow.name,
                        };
                        return currentUser;
                    }
                } catch (e) {
                    console.warn("Local user lookup by email failed:", e);
                }
            }
        }

        currentUser = {
            id: storedUser.id,
            email: storedUser.email,
            name: storedUser.name || "User",
            user_metadata: { full_name: storedUser.name || "User" },
        };
        return currentUser;
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

function formatDate(dateString) {
    if (!dateString) return "dd/mm/yyyy";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function getEmbedVideoHTML(videoUrl) {
    if (!videoUrl) return "";

    // YouTube regexes
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/;
    const ytMatch = videoUrl.match(ytRegex);
    if (ytMatch && ytMatch[1]) {
        return `
            <div class="w-[320px] md:w-[420px] shrink-0 rounded-2xl overflow-hidden border border-gray-800 bg-black h-56">
                <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" class="w-full h-full" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
    }

    // Vimeo regex
    const vimeoRegex = /vimeo\.com\/(?:video\/)?([0-9]+)/;
    const vimeoMatch = videoUrl.match(vimeoRegex);
    if (vimeoMatch && vimeoMatch[1]) {
        return `
            <div class="w-[320px] md:w-[420px] shrink-0 rounded-2xl overflow-hidden border border-gray-800 bg-black h-56">
                <iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" class="w-full h-full" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>
            </div>
        `;
    }

    // Direct MP4/WebM video
    return `
        <div class="w-[320px] md:w-[420px] shrink-0 rounded-2xl overflow-hidden border border-gray-800 bg-black h-56">
            <video controls class="w-full h-full object-cover">
                <source src="${videoUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        </div>
    `;
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
            demo_url,
            likes,
            created_at,
            category,
            level,
            duration,
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

    // Populate Overview Section
    const categorySpan = document.getElementById("projectCategory");
    const levelSpan = document.getElementById("projectLevel");
    const durationSpan = document.getElementById("projectDuration");
    const dateSpan = document.getElementById("projectDate");

    if (categorySpan) categorySpan.textContent = data.category || "-";
    if (levelSpan) levelSpan.textContent = data.level || "-";
    if (durationSpan) durationSpan.textContent = data.duration || "-";
    if (dateSpan) dateSpan.textContent = formatDate(data.created_at);

    // View Live Button links to demo_url
    if (data.demo_url) {
        projectDemoBtn.href = data.demo_url;
        projectDemoBtn.classList.remove("pointer-events-none", "opacity-50");
    } else {
        projectDemoBtn.href = "#";
        projectDemoBtn.classList.add("pointer-events-none", "opacity-50");
    }

    // Render preview media dynamic elements
    const mediaContainer = document.getElementById("mediaPreviewContainer");
    if (mediaContainer) {
        mediaContainer.innerHTML = "";
        let hasMedia = false;

        // Render video if available
        if (data.video_url) {
            mediaContainer.innerHTML += getEmbedVideoHTML(data.video_url);
            hasMedia = true;
        }

        // Render preview images from project_media
        if (data.project_media && data.project_media.length > 0) {
            data.project_media.forEach((media, idx) => {
                if (media.media_url) {
                    mediaContainer.innerHTML += `
                        <img src="${media.media_url}" alt="preview ${idx + 1}"
                            class="w-[320px] md:w-[420px] h-56 shrink-0 rounded-2xl object-cover border border-gray-800 cursor-pointer hover:scale-[1.02] transition duration-300"
                            onclick="window.open('${media.media_url}', '_blank')">
                    `;
                    hasMedia = true;
                }
            });
        }

        if (!hasMedia) {
            mediaContainer.innerHTML = `<p class="text-gray-400 text-sm">No preview media available for this project.</p>`;
        }
    }

    if (shareLink) {
        shareLink.value = window.location.href;
    }
}

function updateCommentCount() {
    const totalComments = allComments.length;
    if (commentCountSpan) {
        commentCountSpan.textContent = `(${totalComments})`;
    }
}

async function loadComments() {
    const { data, error } = await supabase
        .from("comments")
        .select(`
            id,
            comment_text,
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

    // Fetch reactions and replies for all comments
    const commentsWithData = await Promise.all((data || []).map(async (comment) => {
        const [reactions, replies] = await Promise.all([
            loadCommentReactions(comment.id),
            loadCommentReplies(comment.id)
        ]);
        return { ...comment, reactions, replies };
    }));

    allComments = commentsWithData || [];
    updateCommentCount();
    renderComments(allComments);
}

async function loadCommentReactions(commentId) {
    const { data, error } = await supabase
        .from("likes")
        .select("id, user_id, reaction_type")
        .eq("comment_id", commentId);

    if (error) {
        console.error("Load reactions error:", error);
        return { likes: [], dislikes: [] };
    }

    return {
        likes: (data || []).filter(r => r.reaction_type === 'like'),
        dislikes: (data || []).filter(r => r.reaction_type === 'dislike')
    };
}

async function loadCommentReplies(commentId) {
    const { data, error } = await supabase
        .from("replies")
        .select(`
            id,
            reply_text,
            created_at,
            user_id,
            likes,
            dislikes,
            users (
                name,
                avatar
            )
        `)
        .eq("comment_id", commentId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Load replies error:", error);
        return [];
    }

    return data || [];
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
        const likeCount = c.reactions?.likes?.length || 0;
        const dislikeCount = c.reactions?.dislikes?.length || 0;
        const userLikeId = currentUser ? c.reactions?.likes?.find(r => r.user_id === currentUser.id)?.id : null;
        const userDislikeId = currentUser ? c.reactions?.dislikes?.find(r => r.user_id === currentUser.id)?.id : null;

        const repliesHTML = (c.replies || []).map(reply => {
            const replyAvatar = reply.users?.avatar || "./img/avatar1.png";
            const replyName = reply.users?.name || "User";
            const replyTime = formatTime(reply.created_at);
            return `
                <div class="bg-gray-900 rounded-lg p-3 ml-8 border border-gray-800 mt-2">
                    <div class="flex items-start gap-2">
                        <img src="${replyAvatar}" alt="user" class="w-8 h-8 rounded-full object-cover border border-gray-700">
                        <div class="flex-1">
                            <div class="flex items-center gap-2">
                                <h5 class="font-semibold text-sm">${replyName}</h5>
                                <span class="text-xs text-gray-500">${replyTime}</span>
                            </div>
                            <p class="text-gray-300 text-sm mt-1">${reply.reply_text}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        return `
            <div class="bg-gray-950 border border-gray-800 rounded-2xl p-5" data-comment-id="${c.id}">
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
                            <button class="comment-like-btn hover:text-red-400 transition flex items-center gap-1" data-comment-id="${c.id}" data-like-id="${userLikeId || ''}">
                                <i class="fa-${userLikeId ? 'solid' : 'regular'} fa-heart"></i>
                                <span class="like-count">${likeCount}</span>
                            </button>
                            <button class="comment-dislike-btn hover:text-blue-400 transition flex items-center gap-1" data-comment-id="${c.id}" data-dislike-id="${userDislikeId || ''}">
                                <i class="fa-${userDislikeId ? 'solid' : 'regular'} fa-thumbs-down"></i>
                                <span class="dislike-count">${dislikeCount}</span>
                            </button>
                            <button class="reply-btn hover:text-amber-400 transition flex items-center gap-1 ml-auto" data-comment-id="${c.id}">
                                <i class="fa-solid fa-reply"></i>
                                <span>Reply</span>
                            </button>
                        </div>

                        ${repliesHTML ? `<div class="mt-4 space-y-2">${repliesHTML}</div>` : ''}

                        <div class="reply-form hidden mt-3" data-comment-id="${c.id}">
                            <div class="flex gap-2">
                                <input type="text" class="reply-input flex-1 p-2 rounded-lg bg-gray-800 text-white border border-gray-700 text-sm" placeholder="Write a reply...">
                                <button class="send-reply-btn px-3 py-2 bg-amber-500 text-black rounded-lg hover:bg-amber-400 transition text-sm font-semibold">Send</button>
                            </div>
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

    if (!currentUser || !currentUser.id) {
        alert("You must sign in first to comment.");
        return;
    }

    if (!projectId) {
        alert("Project ID is missing.");
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
        const msg = error.message?.includes("row-level security") 
            ? "Database permission error. Check RLS policies on comments table."
            : "Failed to add comment.";
        alert(msg);
        return;
    }

    commentInput.value = "";
    await loadComments();
}

// Handle comment like/dislike, replies via event delegation
commentsContainer.addEventListener("click", async (e) => {
    const likeBtnEl = e.target.closest(".comment-like-btn");
    const dislikeBtnEl = e.target.closest(".comment-dislike-btn");
    const replyBtnEl = e.target.closest(".reply-btn");
    const sendReplyBtnEl = e.target.closest(".send-reply-btn");

    if (!likeBtnEl && !dislikeBtnEl && !replyBtnEl && !sendReplyBtnEl) return;

    currentUser = currentUser || await resolveCurrentUser();
    if (!currentUser || !currentUser.id) {
        alert("You must sign in first.");
        return;
    }

    // Handle reply button
    if (replyBtnEl) {
        const commentId = replyBtnEl.dataset.commentId;
        const replyForm = document.querySelector(`.reply-form[data-comment-id="${commentId}"]`);
        if (replyForm) {
            replyForm.classList.toggle("hidden");
        }
        return;
    }

    // Handle send reply
    if (sendReplyBtnEl) {
        const form = sendReplyBtnEl.closest(".reply-form");
        const commentId = form.dataset.commentId;
        const replyInput = form.querySelector(".reply-input");
        const replyText = replyInput.value.trim();

        if (!replyText) return;

        try {
            const { error } = await supabase.from("replies").insert({
                comment_id: commentId,
                user_id: currentUser.id,
                reply_text: replyText,
                likes: 0,
                dislikes: 0
            });

            if (error) throw error;

            replyInput.value = "";
            form.classList.add("hidden");
            await loadComments();
        } catch (err) {
            console.error("Send reply error:", err);
            console.error("Reply error details:", {
                message: err.message,
                status: err.status,
                code: err.code
            });
            const msg = err.message?.includes("row-level security")
                ? "Database permission error on replies table. Ensure RLS policies allow inserts."
                : err.message || "Failed to add reply.";
            alert(msg);
        }
        return;
    }

    // Handle like/dislike
    const isLike = !!likeBtnEl;
    const btn = likeBtnEl || dislikeBtnEl;
    const commentId = btn.dataset.commentId;
    const reactionId = isLike ? btn.dataset.likeId : btn.dataset.dislikeId;

    try {
        if (reactionId) {
            // User already reacted, remove the reaction
            const { error } = await supabase
                .from("likes")
                .delete()
                .eq("id", reactionId);

            if (error) throw error;
        } else {
            // Check if user has opposite reaction
            const oppositeType = isLike ? 'dislike' : 'like';
            const { data: oppositeReaction } = await supabase
                .from("likes")
                .select("id")
                .eq("comment_id", commentId)
                .eq("user_id", currentUser.id)
                .eq("reaction_type", oppositeType)
                .maybeSingle();

            // Remove opposite reaction if exists
            if (oppositeReaction?.id) {
                await supabase
                    .from("likes")
                    .delete()
                    .eq("id", oppositeReaction.id);
            }

            // Add new reaction
            const { error } = await supabase.from("likes").insert({
                user_id: currentUser.id,
                comment_id: commentId,
                reaction_type: isLike ? 'like' : 'dislike'
            });

            if (error) throw error;
        }

        await loadComments();
    } catch (err) {
        console.error("React comment error:", err);
        console.error("Reaction error details:", {
            message: err.message,
            status: err.status,
            code: err.code
        });
        
        let msg = "Failed to update reaction.";
        
        if (err.message?.includes("reaction_type")) {
            msg = "Database schema error: Run SQL_COMPLETE_SETUP.sql in Supabase to add the reaction_type column.";
        } else if (err.message?.includes("row-level security")) {
            msg = "Database permission error on likes table. Run SQL_COMPLETE_SETUP.sql to fix RLS policies.";
        } else if (err.message) {
            msg = err.message;
        }
        
        alert(msg);
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

    if (!currentUser || !currentUser.id) {
        alert("You must sign in first to like this project.");
        return;
    }

    if (!projectId) {
        alert("Project ID is missing.");
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
        const msg = existingLikeError.message?.includes("row-level security")
            ? "Database permission error. Check RLS policies on likes table."
            : "Something went wrong.";
        alert(msg);
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
            const msg = insertError.message?.includes("row-level security")
                ? "Database permission error: RLS policy blocks likes. Ensure RLS policies allow inserts."
                : `Failed to like project: ${insertError.message || JSON.stringify(insertError)}`;
            alert(msg);
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
    setCommentButtonState(!!currentUser);

    await loadProjectDetails();
    await loadComments();
    await updateLikesCount();
    await refreshLikeState();
}

// Listen to auth state changes to enable/disable comment controls and refresh like state.
if (supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === "function") {
    supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        setCommentButtonState(!!currentUser);
        refreshLikeState();
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

