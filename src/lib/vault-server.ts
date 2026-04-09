import { Prisma, PrivacyLevel as PrismaPrivacyLevel } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MediaItem } from "@/lib/types";
import { LibraryState, PrivacyLevel, SocialNotification, SocialProfile, StoredFolder, VaultProfilePayload } from "@/lib/vault-types";

type MediaRecord = Prisma.MediaGetPayload<{
  include: {
    genres: {
      include: {
        genre: true;
      };
    };
  };
}>;

type NotificationRecord = Prisma.NotificationGetPayload<{
  include: {
    fromUser: true;
    media: {
      include: {
        genres: {
          include: {
            genre: true;
          };
        };
      };
    };
  };
}>;

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildHandle(name?: string | null, email?: string | null, id?: string) {
  const nameBase = name?.trim();
  const idBase = id?.slice(0, 8);
  const base = nameBase || (idBase ? `vault-${idBase}` : "vault-user");
  return `@${slugify(base) || "vault-user"}`;
}

function toPrivacyLevel(value: PrismaPrivacyLevel): PrivacyLevel {
  return value;
}

function serializeMedia(media: MediaRecord): MediaItem {
  return {
    id: media.id,
    slug: media.slug,
    source: media.source,
    sourceId: media.sourceId,
    title: media.title,
    originalTitle: media.originalTitle ?? undefined,
    type: media.type,
    year: media.releaseYear ?? 0,
    rating: media.rating ?? 0,
    language: media.language ?? "en",
    genres: media.genres.map((entry) => entry.genre.name),
    coverUrl: media.coverUrl || "",
    backdropUrl: media.backdropUrl || media.coverUrl || "",
    screenshots: [],
    overview: media.overview || "No overview yet.",
    credits: [],
    details: {
      runtime: media.runtime ? `${media.runtime} min` : undefined,
      status: media.status ?? undefined,
    },
  };
}

function serializeNotification(notification: NotificationRecord): SocialNotification {
  return {
    id: notification.id,
    type:
      notification.type === "friend_request"
        ? "friend-request"
        : notification.type === "friend_accepted"
          ? "friend-accepted"
          : notification.type,
    fromUserId: notification.fromUserId ?? "",
    fromUserName: notification.fromUser?.name ?? undefined,
    message: notification.message,
    media: notification.media ? serializeMedia(notification.media) : undefined,
    createdAt: notification.createdAt.getTime(),
    status: notification.status,
  };
}

function serializeProfile(
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    bio: string | null;
    watchedVisibility: PrismaPrivacyLevel;
    wishlistVisibility: PrismaPrivacyLevel;
    foldersDefaultVisibility: PrismaPrivacyLevel;
    notifications?: NotificationRecord[];
  },
  friendIds: string[],
): SocialProfile {
  return {
    id: user.id,
    name: user.name || "Vault user",
    handle: buildHandle(user.name, user.email, user.id),
    avatarUrl: user.image ?? undefined,
    bio: user.bio ?? undefined,
    friends: friendIds,
    watchedVisibility: toPrivacyLevel(user.watchedVisibility),
    wishlistVisibility: toPrivacyLevel(user.wishlistVisibility),
    foldersDefaultVisibility: toPrivacyLevel(user.foldersDefaultVisibility),
    inbox: (user.notifications ?? []).map(serializeNotification),
  };
}

function canViewPrivacy(ownerId: string, viewerId: string, visibility: PrivacyLevel, ownerFriendIds: string[]) {
  if (ownerId === viewerId) return true;
  if (visibility === "public") return true;
  if (visibility === "private") return false;
  return ownerFriendIds.includes(viewerId);
}

async function getFriendIds(userId: string) {
  const rows = await prisma.friendship.findMany({
    where: { userId },
    select: { friendId: true },
  });

  return rows.map((row) => row.friendId);
}

async function upsertGenres(tx: Prisma.TransactionClient, mediaId: string, genres: string[]) {
  const uniqueGenres = Array.from(new Set(genres.map((genre) => genre.trim()).filter(Boolean)));

  await tx.mediaGenre.deleteMany({
    where: { mediaId },
  });

  if (!uniqueGenres.length) {
    return;
  }

  for (const genreName of uniqueGenres) {
    const slug = slugify(genreName);
    const genre = await tx.genre.upsert({
      where: { slug },
      update: { name: genreName },
      create: {
        name: genreName,
        slug,
      },
    });

    await tx.mediaGenre.create({
      data: {
        mediaId,
        genreId: genre.id,
      },
    });
  }
}

export async function requireSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return session.user;
}

export async function ensureCurrentUserRecord() {
  const sessionUser = await requireSessionUser();

  const user = await prisma.user.update({
    where: { id: sessionUser.id },
    data: {
      name: sessionUser.name ?? undefined,
      email: sessionUser.email ?? undefined,
      image: sessionUser.image ?? undefined,
    },
  });

  return user;
}

export async function persistMediaItem(item: MediaItem, txArg?: Prisma.TransactionClient) {
  const tx = txArg ?? prisma;
  const media = await tx.media.upsert({
    where: {
      source_sourceId: {
        source: item.source,
        sourceId: item.sourceId,
      },
    },
    update: {
      slug: item.slug,
      title: item.title,
      originalTitle: item.originalTitle ?? null,
      overview: item.overview,
      type: item.type,
      status: item.details.status ?? null,
      releaseYear: item.year || null,
      rating: item.rating ?? null,
      runtime: item.details.runtime ? Number.parseInt(item.details.runtime, 10) || null : null,
      coverUrl: item.coverUrl,
      backdropUrl: item.backdropUrl,
      trailerUrl: null,
      language: item.language || "en",
    },
    create: {
      slug: item.slug,
      title: item.title,
      originalTitle: item.originalTitle ?? null,
      overview: item.overview,
      type: item.type,
      status: item.details.status ?? null,
      releaseYear: item.year || null,
      rating: item.rating ?? null,
      runtime: item.details.runtime ? Number.parseInt(item.details.runtime, 10) || null : null,
      coverUrl: item.coverUrl,
      backdropUrl: item.backdropUrl,
      trailerUrl: null,
      language: item.language || "en",
      source: item.source,
      sourceId: item.sourceId,
    },
    include: {
      genres: {
        include: {
          genre: true,
        },
      },
    },
  });

  await upsertGenres(tx as Prisma.TransactionClient, media.id, item.genres);

  return tx.media.findUniqueOrThrow({
    where: { id: media.id },
    include: {
      genres: {
        include: {
          genre: true,
        },
      },
    },
  });
}

export async function getLibraryStateForUser(userId: string): Promise<LibraryState> {
  const [watchedRows, wishlistRows, folders] = await Promise.all([
    prisma.watchedItem.findMany({
      where: { userId },
      orderBy: { watchedAt: "desc" },
      include: {
        media: {
          include: {
            genres: {
              include: {
                genre: true,
              },
            },
          },
        },
      },
    }),
    prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        media: {
          include: {
            genres: {
              include: {
                genre: true,
              },
            },
          },
        },
      },
    }),
    prisma.folder.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          orderBy: { createdAt: "desc" },
          include: {
            media: {
              include: {
                genres: {
                  include: {
                    genre: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    watched: watchedRows.map((row) => serializeMedia(row.media)),
    wishlist: wishlistRows.map((row) => serializeMedia(row.media)),
    folders: folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      description: folder.description ?? undefined,
      coverUrl: folder.coverUrl ?? undefined,
      visibility: toPrivacyLevel(folder.visibility),
      items: folder.items.map((entry) => serializeMedia(entry.media)),
    })),
  };
}

export async function getVaultProfilePayload(viewerId: string, viewedUserId: string): Promise<VaultProfilePayload> {
  const [viewer, viewed, viewerFriendIds, viewedFriendIds] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: viewerId },
      include: {
        notifications: {
          orderBy: { createdAt: "desc" },
          include: {
            fromUser: true,
            media: {
              include: {
                genres: {
                  include: {
                    genre: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: viewedUserId },
    }),
    getFriendIds(viewerId),
    getFriendIds(viewedUserId),
  ]);

  const viewingOwnProfile = viewerId === viewedUserId;
  const [viewerLibrary, viewedLibrary, friends] = await Promise.all([
    getLibraryStateForUser(viewerId),
    viewingOwnProfile ? Promise.resolve(null) : getLibraryStateForUser(viewedUserId),
    prisma.user.findMany({
      where: { id: { in: viewingOwnProfile ? viewerFriendIds : viewedFriendIds } },
      orderBy: { name: "asc" },
    }),
  ]);

  const viewerProfile = serializeProfile(viewer, viewerFriendIds);
  const viewedProfile = viewingOwnProfile ? viewerProfile : serializeProfile(viewed, viewedFriendIds);
  const canSeeWatched = canViewPrivacy(viewedUserId, viewerId, viewedProfile.watchedVisibility, viewedFriendIds);
  const canSeeWishlist = canViewPrivacy(viewedUserId, viewerId, viewedProfile.wishlistVisibility, viewedFriendIds);

  const visibleLibrary = viewingOwnProfile
    ? viewerLibrary
    : {
        watched: canSeeWatched && viewedLibrary ? viewedLibrary.watched : [],
        wishlist: canSeeWishlist && viewedLibrary ? viewedLibrary.wishlist : [],
        folders:
          viewedLibrary?.folders.filter((folder) =>
            canViewPrivacy(viewedUserId, viewerId, folder.visibility, viewedFriendIds),
          ) ?? [],
      };

  return {
    viewerProfile,
    viewedProfile,
    friends: friends.map((friend) => serializeProfile(friend, [])),
    watched: visibleLibrary.watched,
    wishlist: visibleLibrary.wishlist,
    folders: visibleLibrary.folders,
    canSeeWatched,
    canSeeWishlist,
    viewingOwnProfile,
  };
}

export async function updateProfile(userId: string, updates: {
  avatarUrl?: string;
  bio?: string;
  watchedVisibility?: PrivacyLevel;
  wishlistVisibility?: PrivacyLevel;
  foldersDefaultVisibility?: PrivacyLevel;
}) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      image: updates.avatarUrl?.trim() || undefined,
      bio: updates.bio?.trim() || undefined,
      watchedVisibility: updates.watchedVisibility,
      wishlistVisibility: updates.wishlistVisibility,
      foldersDefaultVisibility: updates.foldersDefaultVisibility,
    },
  });
}

export async function addToWatched(userId: string, item: MediaItem) {
  await prisma.$transaction(async (tx) => {
    const media = await persistMediaItem(item, tx);
    await tx.watchedItem.upsert({
      where: {
        userId_mediaId: {
          userId,
          mediaId: media.id,
        },
      },
      update: {
        watchedAt: new Date(),
      },
      create: {
        userId,
        mediaId: media.id,
      },
    });

    await tx.wishlistItem.deleteMany({
      where: {
        userId,
        mediaId: media.id,
      },
    });
  });
}

export async function removeFromWatched(userId: string, source: string, sourceId: string) {
  const media = await prisma.media.findUnique({
    where: {
      source_sourceId: {
        source: source as never,
        sourceId,
      },
    },
  });

  if (!media) return;

  await prisma.watchedItem.deleteMany({
    where: {
      userId,
      mediaId: media.id,
    },
  });
}

export async function addToWishlist(userId: string, item: MediaItem) {
  await prisma.$transaction(async (tx) => {
    const media = await persistMediaItem(item, tx);
    await tx.wishlistItem.upsert({
      where: {
        userId_mediaId: {
          userId,
          mediaId: media.id,
        },
      },
      update: {},
      create: {
        userId,
        mediaId: media.id,
      },
    });
  });
}

export async function removeFromWishlist(userId: string, source: string, sourceId: string) {
  const media = await prisma.media.findUnique({
    where: {
      source_sourceId: {
        source: source as never,
        sourceId,
      },
    },
  });

  if (!media) return;

  await prisma.wishlistItem.deleteMany({
    where: {
      userId,
      mediaId: media.id,
    },
  });
}

export async function createFolder(userId: string, input: {
  name: string;
  description?: string;
  coverUrl?: string;
}) {
  const trimmed = input.name.trim();
  if (!trimmed) {
    throw new Error("Folder name is required");
  }

  const slugBase = slugify(trimmed);
  let slug = slugBase;
  let suffix = 1;

  while (
    await prisma.folder.findFirst({
      where: {
        userId,
        slug,
      },
    })
  ) {
    suffix += 1;
    slug = `${slugBase}-${suffix}`;
  }

  return prisma.folder.create({
    data: {
      userId,
      name: trimmed,
      slug,
      description: input.description?.trim() || undefined,
      coverUrl: input.coverUrl?.trim() || undefined,
    },
  });
}

export async function updateFolder(userId: string, folderId: string, updates: {
  name?: string;
  description?: string;
  coverUrl?: string;
  visibility?: PrivacyLevel;
}) {
  const folder = await prisma.folder.findFirstOrThrow({
    where: {
      id: folderId,
      userId,
    },
  });

  const nextName = updates.name?.trim();
  let nextSlug = folder.slug;

  if (nextName && nextName !== folder.name) {
    const slugBase = slugify(nextName);
    nextSlug = slugBase;
    let suffix = 1;

    while (
      await prisma.folder.findFirst({
        where: {
          userId,
          slug: nextSlug,
          id: { not: folderId },
        },
      })
    ) {
      suffix += 1;
      nextSlug = `${slugBase}-${suffix}`;
    }
  }

  await prisma.folder.update({
    where: { id: folderId },
    data: {
      name: nextName || undefined,
      slug: nextSlug,
      description: updates.description?.trim() || undefined,
      coverUrl: updates.coverUrl?.trim() || undefined,
      visibility: updates.visibility,
    },
  });
}

export async function addItemToFolder(userId: string, folderId: string, item: MediaItem) {
  await prisma.$transaction(async (tx) => {
    const folder = await tx.folder.findFirstOrThrow({
      where: {
        id: folderId,
        userId,
      },
    });
    const media = await persistMediaItem(item, tx);

    await tx.folderItem.upsert({
      where: {
        folderId_mediaId: {
          folderId: folder.id,
          mediaId: media.id,
        },
      },
      update: {
        createdAt: new Date(),
      },
      create: {
        folderId: folder.id,
        mediaId: media.id,
      },
    });
  });
}

export async function removeItemFromFolder(userId: string, folderId: string, source: string, sourceId: string) {
  const [folder, media] = await Promise.all([
    prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
      },
    }),
    prisma.media.findUnique({
      where: {
        source_sourceId: {
          source: source as never,
          sourceId,
        },
      },
    }),
  ]);

  if (!folder || !media) return;

  await prisma.folderItem.deleteMany({
    where: {
      folderId: folder.id,
      mediaId: media.id,
    },
  });
}

async function createNotification(data: {
  userId: string;
  fromUserId?: string;
  type: "friend_request" | "friend_accepted" | "recommendation" | "info";
  message: string;
  mediaId?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: data.userId,
      fromUserId: data.fromUserId,
      type: data.type,
      message: data.message,
      mediaId: data.mediaId,
    },
  });
}

export async function searchUsers(viewerId: string, query: string) {
  const trimmed = query.trim();
  const viewerFriendIds = await getFriendIds(viewerId);
  const requests = await prisma.friendRequest.findMany({
    where: {
      OR: [
        { fromUserId: viewerId },
        { toUserId: viewerId },
      ],
      status: "pending",
    },
  });

  const users = await prisma.user.findMany({
    where: trimmed
      ? {
          AND: [
            { id: { not: viewerId } },
            {
              OR: [
                { name: { contains: trimmed, mode: "insensitive" } },
                { email: { contains: trimmed, mode: "insensitive" } },
                { bio: { contains: trimmed, mode: "insensitive" } },
              ],
            },
          ],
        }
      : { id: { not: viewerId } },
    orderBy: { name: "asc" },
    take: 8,
  });

  return users.map((user) => {
    const request = requests.find(
      (entry) =>
        (entry.fromUserId === viewerId && entry.toUserId === user.id) ||
        (entry.toUserId === viewerId && entry.fromUserId === user.id),
    );

    return {
      id: user.id,
      name: user.name || "Vault user",
      handle: buildHandle(user.name, user.email, user.id),
      avatarUrl: user.image ?? undefined,
      relationship: viewerFriendIds.includes(user.id)
        ? "friend"
        : request?.fromUserId === viewerId
          ? "outgoing"
          : request?.toUserId === viewerId
            ? "incoming"
            : "none",
    };
  });
}

export async function sendFriendRequest(viewerId: string, targetId: string) {
  if (viewerId === targetId) return;

  const [viewer, target, viewerFriendIds, reverseRequest] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: viewerId } }),
    prisma.user.findUniqueOrThrow({ where: { id: targetId } }),
    getFriendIds(viewerId),
    prisma.friendRequest.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: targetId,
          toUserId: viewerId,
        },
      },
    }),
  ]);

  if (viewerFriendIds.includes(targetId)) {
    return;
  }

  if (reverseRequest?.status === "pending") {
    await acceptFriendRequest(viewerId, targetId);
    return;
  }

  await prisma.friendRequest.upsert({
    where: {
      fromUserId_toUserId: {
        fromUserId: viewerId,
        toUserId: targetId,
      },
    },
    update: {
      status: "pending",
    },
    create: {
      fromUserId: viewerId,
      toUserId: targetId,
      status: "pending",
    },
  });

  await Promise.all([
    createNotification({
      userId: targetId,
      fromUserId: viewerId,
      type: "friend_request",
      message: `${viewer.name || "Someone"} sent you a friend request.`,
    }),
    createNotification({
      userId: viewerId,
      fromUserId: targetId,
      type: "info",
      message: `Friend request sent to ${target.name || "that user"}.`,
    }),
  ]);
}

export async function acceptFriendRequest(viewerId: string, fromUserId: string) {
  const [viewer, other] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: viewerId } }),
    prisma.user.findUniqueOrThrow({ where: { id: fromUserId } }),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.friendRequest.upsert({
      where: {
        fromUserId_toUserId: {
          fromUserId,
          toUserId: viewerId,
        },
      },
      update: {
        status: "accepted",
      },
      create: {
        fromUserId,
        toUserId: viewerId,
        status: "accepted",
      },
    });

    await tx.friendship.upsert({
      where: {
        userId_friendId: {
          userId: viewerId,
          friendId: fromUserId,
        },
      },
      update: {},
      create: {
        userId: viewerId,
        friendId: fromUserId,
      },
    });

    await tx.friendship.upsert({
      where: {
        userId_friendId: {
          userId: fromUserId,
          friendId: viewerId,
        },
      },
      update: {},
      create: {
        userId: fromUserId,
        friendId: viewerId,
      },
    });

    await tx.notification.updateMany({
      where: {
        userId: viewerId,
        fromUserId,
        type: "friend_request",
      },
      data: {
        type: "friend_accepted",
        message: `You accepted ${other.name || "their"} friend request.`,
        status: "read",
      },
    });
  });

  await createNotification({
    userId: fromUserId,
    fromUserId: viewerId,
    type: "friend_accepted",
    message: `${viewer.name || "A user"} accepted your friend request.`,
  });
}

export async function sendRecommendation(viewerId: string, targetId: string, item: MediaItem) {
  const [viewer, media] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: viewerId } }),
    persistMediaItem(item),
  ]);

  await Promise.all([
    createNotification({
      userId: targetId,
      fromUserId: viewerId,
      mediaId: media.id,
      type: "recommendation",
      message: `${viewer.name || "Someone"} recommended ${item.title}.`,
    }),
    createNotification({
      userId: viewerId,
      fromUserId: targetId,
      mediaId: media.id,
      type: "info",
      message: `You sent ${item.title} to a friend.`,
    }),
  ]);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },
    data: {
      status: "read",
    },
  });
}

export async function dismissNotification(userId: string, notificationId: string) {
  await prisma.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  });
}
