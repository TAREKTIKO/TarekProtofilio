import { supabase } from "./supabase.js";

const params = new URLSearchParams(window.location.search);
const serviceId = params.get("id");

const title = document.getElementById("title");
const desc = document.getElementById("desc");
const mainImage = document.getElementById("mainImage");
const cardTitle = document.getElementById("cardTitle");
const cardShortDesc = document.getElementById("cardShortDesc");
const ratingCount = document.getElementById("ratingCount");
const categoryValue = document.getElementById("categoryValue");
const durationValue = document.getElementById("durationValue");
const deliveryValue = document.getElementById("deliveryValue");
const serviceDate = document.getElementById("serviceDate");
const priceValue = document.getElementById("priceValue");
const mediaStrip = document.getElementById("mediaStrip");
const mediaCount = document.getElementById("mediaCount");
const commentsBox = document.getElementById("commentsBox");
const commentsCount = document.getElementById("commentsCount");

const commentInput = document.getElementById("commentInput");
const addCommentBtn = document.getElementById("addCommentBtn");

let currentUser = null;
let currentService = null;
let allComments = [];

async function getCurrentUser() {
    try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) return data.user;

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

    return { id, email, name, avatar };
}

async function resolveCurrentUser() {
    if (currentUser) return currentUser;

    try {
        const u = await getCurrentUser();
        if (u) {
            currentUser = u;
            return currentUser;
        }
    } catch (e) {
        console.warn("getCurrentUser failed:", e);
    }

    const storedUser = getStoredUserProfile();
    if (storedUser) {
        currentUser = {
            id: storedUser.id,
            email: storedUser.email,
            name: storedUser.name || "User",
            user_metadata: { full_name: storedUser.name || "User" }
        };
        return currentUser;
    }

    return null;
}

function formatDate(dateString) {
    if (!dateString) return "dd/mm/yyyy";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

async function loadServiceDetails() {
    if (!serviceId) {
        commentsBox.innerHTML = `<p class="text-red-400">No service id found in URL.</p>`;
        return;
    }

    const { data, error } = await supabase
        .from("services")
        .select(`
            id,
            title,
            description,
            main_image,
            video_url,
            price,
            rating,
            total_reviews,
            created_at,
            category,
            duration,
            delivery,
            service_media (
                media_url,
                media_type
            )
        `)
        .eq("id", serviceId)
        .single();

    if (error) {
        console.error("Service load error:", error);
        commentsBox.innerHTML = `<p class="text-red-400">Failed to load service details.</p>`;
        return;
    }

    currentService = data;

    const image = data.main_image || data.service_media?.[0]?.media_url || "./img/service1.png";

    title.textContent = data.title || "Service Title";
    desc.textContent = data.description || "No description available.";
    mainImage.src = image;
    cardTitle.textContent = data.title || "Service Title";
    cardShortDesc.textContent = data.description || "No description available.";
    ratingCount.textContent = data.total_reviews ?? 0;
    priceValue.textContent = data.price ? `$${data.price}` : "Contact for price";

    // Populate Overview Section
    if (categoryValue) categoryValue.textContent = data.category || "-";
    if (durationValue) durationValue.textContent = data.duration || "-";
    if (deliveryValue) deliveryValue.textContent = data.delivery || "-";
    if (serviceDate) serviceDate.textContent = formatDate(data.created_at);

    renderMedia(data.service_media || []);
}

function renderMedia(items) {
    mediaStrip.innerHTML = "";
    mediaCount.textContent = items.length + (currentService?.video_url ? 1 : 0);

    // Add video first if exists
    if (currentService?.video_url) {
        mediaStrip.innerHTML += `
            <div class="w-[320px] md:w-[420px] shrink-0 rounded-2xl overflow-hidden border border-gray-800 bg-black">
                <video controls class="w-full h-56 object-cover">
                    <source src="${currentService.video_url}" type="video/mp4">
                </video>
            </div>
        `;
    }

    // Add images
    items.forEach((item) => {
        if (item.media_type === "image" || !item.media_type) {
            mediaStrip.innerHTML += `
                <img src="${item.media_url}" alt="media"
                    class="w-[320px] md:w-[420px] h-56 shrink-0 rounded-2xl object-cover border border-gray-800">
            `;
        }
    });
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
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Comments load error:", error);
        commentsBox.innerHTML = `<p class="text-red-400">Failed to load comments.</p>`;
        return;
    }

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

function updateCommentCount() {
    const totalComments = allComments.length;
    commentsCount.textContent = totalComments;
}

function renderComments(comments) {
    if (!comments.length) {
        commentsBox.innerHTML = `<p class="text-gray-400">No comments yet. Be the first to comment.</p>`;
        return;
    }

    commentsBox.innerHTML = comments.map((c) => {
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

    if (!serviceId) {
        alert("Service ID is missing.");
        return;
    }

    const { error } = await supabase.from("comments").insert({
        user_id: currentUser.id,
        service_id: serviceId,
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

commentsBox.addEventListener("click", async (e) => {
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

    if (replyBtnEl) {
        const commentId = replyBtnEl.dataset.commentId;
        const replyForm = document.querySelector(`.reply-form[data-comment-id="${commentId}"]`);
        if (replyForm) replyForm.classList.toggle("hidden");
        return;
    }

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
            alert("Failed to add reply.");
        }
        return;
    }

    const isLike = !!likeBtnEl;
    const btn = likeBtnEl || dislikeBtnEl;
    const commentId = btn.dataset.commentId;
    const reactionId = isLike ? btn.dataset.likeId : btn.dataset.dislikeId;

    try {
        if (reactionId) {
            const { error } = await supabase.from("likes").delete().eq("id", reactionId);
            if (error) throw error;
        } else {
            const oppositeType = isLike ? 'dislike' : 'like';
            const { data: oppositeReaction } = await supabase
                .from("likes")
                .select("id")
                .eq("comment_id", commentId)
                .eq("user_id", currentUser.id)
                .eq("reaction_type", oppositeType)
                .maybeSingle();

            if (oppositeReaction?.id) {
                await supabase.from("likes").delete().eq("id", oppositeReaction.id);
            }

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
        alert("Failed to update reaction.");
    }
});

async function init() {
    currentUser = await resolveCurrentUser();
    await loadServiceDetails();
    await loadComments();
}

if (supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === "function") {
    supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
    });
}

addCommentBtn.addEventListener("click", addComment);

window.addEventListener("load", init);