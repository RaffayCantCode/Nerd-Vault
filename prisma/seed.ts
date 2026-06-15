import fs from 'fs';
import path from 'path';

// Load .env.local manually if it exists
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index !== -1) {
        const key = trimmed.substring(0, index).trim();
        let value = trimmed.substring(index + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
} catch (error) {
  console.error('Failed to load .env.local file:', error);
}

import { prisma } from '../src/lib/prisma';
import { MediaType, MediaSource, PrivacyLevel } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding database with demo users, media, and watched items...');

  const passwordHash = await bcrypt.hash('NerdVault2025!', 12);

  const usersData = [
    { name: 'Zara Ahmed', email: 'zara.ahmed@nerdvault.demo', bio: 'Avid anime watcher & gamer. Currently working through every Ghibli film.' },
    { name: 'Marcus Chen', email: 'marcus.chen@nerdvault.demo', bio: 'Cinephile. Letterboxd refugee. All genres welcome.' },
    { name: 'Sofia Ramos', email: 'sofia.ramos@nerdvault.demo', bio: 'TV enthusiast & bookworm. 5 stars only if it made me cry.' },
    { name: 'Kai Tanaka', email: 'kai.tanaka@nerdvault.demo', bio: 'JRPGs, anime, and the occasional binge-watch.' },
    { name: 'Lena Weber', email: 'lena.weber@nerdvault.demo', bio: 'Sci-fi obsessed. Hans Zimmer fan.' },
    { name: 'Noah Park', email: 'noah.park@nerdvault.demo', bio: 'Backlog of 400+ games. Slowly making a dent.' },
  ];

  const createdUsers: Record<string, any> = {};

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        bio: u.bio,
        passwordHash: passwordHash,
        watchedVisibility: PrivacyLevel.public,
      },
      create: {
        name: u.name,
        email: u.email,
        bio: u.bio,
        passwordHash: passwordHash,
        watchedVisibility: PrivacyLevel.public,
      },
    });
    createdUsers[u.name] = user;
  }

  console.log(`Upserted ${Object.keys(createdUsers).length} users.`);

  const mediaData = [
    // MOVIES
    {
      slug: 'inception',
      title: 'Inception',
      type: MediaType.movie,
      source: MediaSource.tmdb,
      sourceId: '27205',
      releaseYear: 2010,
      rating: 8.4,
      language: 'en',
      overview: 'A thief steals corporate secrets via dream-sharing tech, then is given the inverse task of planting an idea.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
    },
    {
      slug: 'the-dark-knight',
      title: 'The Dark Knight',
      type: MediaType.movie,
      source: MediaSource.tmdb,
      sourceId: '155',
      releaseYear: 2008,
      rating: 9.0,
      language: 'en',
      overview: 'When the Joker causes havoc in Gotham, Batman must face the greatest test of his ability to fight injustice.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/nMKdUFyrkDM7vBSrZSqfhDrQ0jU.jpg',
    },
    {
      slug: 'dune',
      title: 'Dune',
      type: MediaType.movie,
      source: MediaSource.tmdb,
      sourceId: '438631',
      releaseYear: 2021,
      rating: 7.8,
      language: 'en',
      overview: 'Paul Atreides travels to the most dangerous planet in the universe to ensure the future of his family & people.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV61CYqkFuXI.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/jYEW5xZkZk2WTrdbMGAPFuBqbDc.jpg',
    },
    {
      slug: 'oppenheimer',
      title: 'Oppenheimer',
      type: MediaType.movie,
      source: MediaSource.tmdb,
      sourceId: '872585',
      releaseYear: 2023,
      rating: 8.2,
      language: 'en',
      overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II.",
      coverUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg',
    },
    {
      slug: 'interstellar',
      title: 'Interstellar',
      type: MediaType.movie,
      source: MediaSource.tmdb,
      sourceId: '157336',
      releaseYear: 2014,
      rating: 8.4,
      language: 'en',
      overview: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
      coverUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    },
    // TV SHOWS
    {
      slug: 'breaking-bad',
      title: 'Breaking Bad',
      type: MediaType.show,
      source: MediaSource.tmdb,
      sourceId: '1396',
      releaseYear: 2008,
      rating: 9.5,
      language: 'en',
      overview: 'A chemistry teacher with terminal cancer turns to manufacturing methamphetamine to secure his family\'s future.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    },
    {
      slug: 'the-last-of-us-show',
      title: 'The Last of Us',
      type: MediaType.show,
      source: MediaSource.tmdb,
      sourceId: '100088',
      releaseYear: 2023,
      rating: 8.7,
      language: 'en',
      overview: 'After a global catastrophe, a hardened survivor takes charge of a teen who may be humanity\'s last hope.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/9hqIFLOEuSfL3dYdJRiOBNwADcN.jpg',
    },
    {
      slug: 'house-of-the-dragon',
      title: 'House of the Dragon',
      type: MediaType.show,
      source: MediaSource.tmdb,
      sourceId: '94997',
      releaseYear: 2022,
      rating: 8.4,
      language: 'en',
      overview: 'The story of House Targaryen set 200 years before the events of Game of Thrones.',
      coverUrl: 'https://image.tmdb.org/t/p/w500/z2yahl2uefxDCl0nogcRBstwruJ.jpg',
      backdropUrl: 'https://image.tmdb.org/t/p/w1280/etj8E2o0Bud0HkONVQPjyCkIvpv.jpg',
    },
    // ANIME
    {
      slug: 'attack-on-titan',
      title: 'Attack on Titan',
      type: MediaType.anime,
      source: MediaSource.anilist,
      sourceId: '16498',
      releaseYear: 2013,
      rating: 9.0,
      language: 'ja',
      overview: 'Humanity lives inside enormous walled cities to protect themselves from Titans — gigantic humanoid creatures.',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-73IhOXpJZiMF.jpg',
      backdropUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg',
    },
    {
      slug: 'jujutsu-kaisen',
      title: 'Jujutsu Kaisen',
      type: MediaType.anime,
      source: MediaSource.anilist,
      sourceId: '113415',
      releaseYear: 2020,
      rating: 8.7,
      language: 'ja',
      overview: 'A boy swallows a cursed talisman & is forced to attend a school for young sorcerers to exorcise the demon inside him.',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx113415-979ncYzDHyhY.jpg',
      backdropUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/113415-T1j5ypywZkZJ.jpg',
    },
    {
      slug: 'your-name',
      title: 'Your Name',
      type: MediaType.anime,
      source: MediaSource.anilist,
      sourceId: '97731',
      releaseYear: 2016,
      rating: 9.0,
      language: 'ja',
      overview: 'Two strangers find themselves linked in a bizarre way. When a connection forms, will distance be the only thing to keep them apart?',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx97731-WTgcVkOAycCB.jpg',
      backdropUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/97731-kscvAzRJVi8E.jpg',
    },
    {
      slug: 'death-note',
      title: 'Death Note',
      type: MediaType.anime,
      source: MediaSource.anilist,
      sourceId: '1535',
      releaseYear: 2006,
      rating: 8.6,
      language: 'ja',
      overview: 'A high school student discovers a supernatural notebook that allows him to kill anyone by writing their name.',
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1535-lawCwhzhi96X.jpg',
      backdropUrl: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/1535-buVSHNMR6Hen.jpg',
    },
    // GAMES
    {
      slug: 'elden-ring',
      title: 'Elden Ring',
      type: MediaType.game,
      source: MediaSource.igdb,
      sourceId: '119133',
      releaseYear: 2022,
      rating: 9.5,
      language: 'en',
      overview: 'An action RPG set in a vast open world created by George R. R. Martin & Hidetaka Miyazaki.',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg',
      backdropUrl: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc7f3b.jpg',
    },
    {
      slug: 'god-of-war-2018',
      title: 'God of War',
      type: MediaType.game,
      source: MediaSource.igdb,
      sourceId: '7346',
      releaseYear: 2018,
      rating: 9.7,
      language: 'en',
      overview: 'Kratos & his son Atreus embark on a journey across Midgard, encountering Norse gods and surprising revelations.',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1tmu.jpg',
      backdropUrl: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/p0vbsh.jpg',
    },
    {
      slug: 'cyberpunk-2077',
      title: 'Cyberpunk 2077',
      type: MediaType.game,
      source: MediaSource.igdb,
      sourceId: '1877',
      releaseYear: 2020,
      rating: 7.5,
      language: 'en',
      overview: 'An open-world action adventure set in Night City, a megalopolis obsessed with power, glamour & body modification.',
      coverUrl: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4hk4.jpg',
      backdropUrl: 'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scpxf2.jpg',
    },
  ];

  const createdMedia: Record<string, any> = {};

  for (const m of mediaData) {
    const media = await prisma.media.upsert({
      where: {
        slug: m.slug,
      },
      update: {
        title: m.title,
        type: m.type,
        source: m.source,
        sourceId: m.sourceId,
        releaseYear: m.releaseYear,
        rating: m.rating,
        language: m.language,
        overview: m.overview,
        coverUrl: m.coverUrl,
        backdropUrl: m.backdropUrl,
      },
      create: {
        slug: m.slug,
        title: m.title,
        type: m.type,
        source: m.source,
        sourceId: m.sourceId,
        releaseYear: m.releaseYear,
        rating: m.rating,
        language: m.language,
        overview: m.overview,
        coverUrl: m.coverUrl,
        backdropUrl: m.backdropUrl,
      },
    });
    createdMedia[m.slug] = media;
  }

  console.log(`Upserted ${Object.keys(createdMedia).length} media items.`);

  // Define assignments
  const assignments = [
    // Zara
    { user: 'Zara Ahmed', slug: 'inception', rating: 5 },
    { user: 'Zara Ahmed', slug: 'attack-on-titan', rating: 5, notes: 'Absolute masterpiece. The ending left me speechless.' },
    { user: 'Zara Ahmed', slug: 'jujutsu-kaisen', rating: 5, notes: 'The animation quality is insane. Gojo supremacy.' },
    { user: 'Zara Ahmed', slug: 'your-name', rating: 5, notes: 'Still crying. Will cry forever.' },
    { user: 'Zara Ahmed', slug: 'death-note', rating: 5, notes: 'L was the GOAT.' },

    // Marcus
    { user: 'Marcus Chen', slug: 'the-dark-knight', rating: 5, notes: "Ledger's Joker is untouchable. Cinema at its peak." },
    { user: 'Marcus Chen', slug: 'inception', rating: 5, notes: 'The BWONG that changed cinema.' },
    { user: 'Marcus Chen', slug: 'oppenheimer', rating: 5, notes: 'Nolan does it again. Incredible on IMAX.' },
    { user: 'Marcus Chen', slug: 'interstellar', rating: 5 },
    { user: 'Marcus Chen', slug: 'dune', rating: 4, notes: 'Denis Villeneuve is on another level.' },
    { user: 'Marcus Chen', slug: 'your-name', rating: 5 },

    // Sofia
    { user: 'Sofia Ramos', slug: 'breaking-bad', rating: 5, notes: 'Best TV show ever made. Not debatable.' },
    { user: 'Sofia Ramos', slug: 'the-last-of-us-show', rating: 5, notes: 'Episode 3 with Bill and Frank destroyed me emotionally.' },
    { user: 'Sofia Ramos', slug: 'house-of-the-dragon', rating: 4 },
    { user: 'Sofia Ramos', slug: 'oppenheimer', rating: 4 },

    // Kai
    { user: 'Kai Tanaka', slug: 'elden-ring', rating: 5, notes: '500 hours and counting. Best game ever made.' },
    { user: 'Kai Tanaka', slug: 'attack-on-titan', rating: 5 },
    { user: 'Kai Tanaka', slug: 'jujutsu-kaisen', rating: 5 },
    { user: 'Kai Tanaka', slug: 'god-of-war-2018', rating: 5, notes: 'The father-son dynamic hit different.' },
    { user: 'Kai Tanaka', slug: 'death-note', rating: 5 },

    // Lena
    { user: 'Lena Weber', slug: 'interstellar', rating: 5, notes: 'The Hans Zimmer score alone makes it perfect.' },
    { user: 'Lena Weber', slug: 'dune', rating: 4 },
    { user: 'Lena Weber', slug: 'breaking-bad', rating: 5 },
    { user: 'Lena Weber', slug: 'cyberpunk-2077', rating: 4, notes: 'Great after all the patches. Night City is stunning.' },
    { user: 'Lena Weber', slug: 'the-dark-knight', rating: 5 },

    // Noah
    { user: 'Noah Park', slug: 'elden-ring', rating: 5 },
    { user: 'Noah Park', slug: 'god-of-war-2018', rating: 5, notes: 'The ending made me tear up. A gaming masterpiece.' },
    { user: 'Noah Park', slug: 'cyberpunk-2077', rating: 4, notes: '2.0 update made it a completely different game.' },
    { user: 'Noah Park', slug: 'the-last-of-us-show', rating: 5 },
    { user: 'Noah Park', slug: 'breaking-bad', rating: 5 },
  ];

  let index = 0;
  for (const assign of assignments) {
    const user = createdUsers[assign.user];
    const media = createdMedia[assign.slug];
    if (!user || !media) continue;

    const baseOffset = usersData.findIndex(u => u.name === assign.user) * 12 * 60 * 60 * 1000;
    const watchedAt = new Date(Date.now() - baseOffset - index * 3 * 60 * 60 * 1000);

    await prisma.watchedItem.upsert({
      where: {
        userId_mediaId: {
          userId: user.id,
          mediaId: media.id,
        },
      },
      update: {
        rating: assign.rating,
        notes: assign.notes || null,
        watchedAt: watchedAt,
      },
      create: {
        userId: user.id,
        mediaId: media.id,
        rating: assign.rating,
        notes: assign.notes || null,
        watchedAt: watchedAt,
      },
    });
    index++;
  }

  console.log(`Successfully seeded ${index} watched items.`);
  console.log('\n--- DEMO USERS CREATED ---');
  for (const u of usersData) {
    console.log(`Name: ${u.name}`);
    console.log(`Email: ${u.email}`);
    console.log(`Password: NerdVault2025!`);
    console.log('-------------------------');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
