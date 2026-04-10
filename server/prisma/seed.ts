import { Genre, Role } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';

async function seed(): Promise<void> {
  // Hash all passwords concurrently using argon2id
  const [adminPassword, managerPassword, userPassword] = await Promise.all([
    hashPassword(process.env.SEED_ADMIN_PASSWORD ?? 'AdminChangeMe123!'),
    hashPassword(process.env.SEED_MANAGER_PASSWORD ?? 'ManagerChangeMe123!'),
    hashPassword(process.env.SEED_USER_PASSWORD ?? 'UserChangeMe123!')
  ]);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { fullName: 'System Administrator', passwordHash: adminPassword, role: Role.ADMIN },
    create: { email: 'admin@example.com', fullName: 'System Administrator', passwordHash: adminPassword, role: Role.ADMIN }
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: { fullName: 'Catalog Manager', passwordHash: managerPassword, role: Role.MANAGER },
    create: { email: 'manager@example.com', fullName: 'Catalog Manager', passwordHash: managerPassword, role: Role.MANAGER }
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: { fullName: 'Jan Kowalski', passwordHash: userPassword, role: Role.USER },
    create: { email: 'user@example.com', fullName: 'Jan Kowalski', passwordHash: userPassword, role: Role.USER }
  });

  // Seed game catalog
  const gamesData = [
    {
      id: 'seed-game-witcher3',
      title: 'The Witcher 3: Wild Hunt',
      description: 'Rozbudowane RPG osadzone w mrocznym fantasy świecie. Wciel się w Geralta z Rivii i odkryj jedną z najlepiej ocenianych gier w historii.',
      price: 59.99,
      genre: Genre.RPG,
      publisher: 'CD Projekt RED',
      releaseYear: 2015,
      stock: 999
    },
    {
      id: 'seed-game-cs2',
      title: 'Counter-Strike 2',
      description: 'Taktyczna strzelanka first-person. Rywalizuj w trybie rankingowym lub trenuj z botami. Następca legendarnego CS:GO.',
      price: 0.0,
      genre: Genre.ACTION,
      publisher: 'Valve',
      releaseYear: 2023,
      stock: 999
    },
    {
      id: 'seed-game-civ7',
      title: 'Civilization VII',
      description: 'Zbuduj cywilizację od starożytności do ery kosmicznej. Dyplomacja, nauka, armia — strategia na najwyższym poziomie.',
      price: 229.99,
      genre: Genre.STRATEGY,
      publisher: '2K Games',
      releaseYear: 2025,
      stock: 150
    },
    {
      id: 'seed-game-re4',
      title: 'Resident Evil 4 Remake',
      description: 'Odświeżona klasyka survival horroru. Leon S. Kennedy ratuje córkę prezydenta w wiosce pełnej kultystów.',
      price: 189.99,
      genre: Genre.HORROR,
      publisher: 'Capcom',
      releaseYear: 2023,
      stock: 200
    },
    {
      id: 'seed-game-cyberpunk',
      title: 'Cyberpunk 2077',
      description: 'Otwarta akcja RPG w Night City — neonowym mieście przyszłości. Po wielu aktualizacjach gra osiągnęła szczytową formę.',
      price: 129.99,
      genre: Genre.RPG,
      publisher: 'CD Projekt RED',
      releaseYear: 2020,
      stock: 500
    },
    {
      id: 'seed-game-portal2',
      title: 'Portal 2',
      description: 'Kultowa gra logiczna z mechaniką portali. Tryb single-player i co-op. Jedno z arcydzieł gier niezależnych.',
      price: 39.99,
      genre: Genre.PUZZLE,
      publisher: 'Valve',
      releaseYear: 2011,
      stock: 999
    },
    {
      id: 'seed-game-fc25',
      title: 'EA Sports FC 25',
      description: 'Najnowsza odsłona symulator piłki nożnej. Nowe tryby, ulepszone animacje i kompletna baza licencjonowanych lig.',
      price: 249.99,
      genre: Genre.SPORTS,
      publisher: 'EA Sports',
      releaseYear: 2024,
      stock: 300
    },
    {
      id: 'seed-game-cities',
      title: 'Cities: Skylines 2',
      description: 'Symulator budowy i zarządzania miastem. Projektuj infrastrukturę, zarządzaj budżetem i rozwiązuj problemy rosnącej metropolii.',
      price: 149.99,
      genre: Genre.SIMULATION,
      publisher: 'Paradox Interactive',
      releaseYear: 2023,
      stock: 400
    }
  ];

  for (const game of gamesData) {
    await prisma.game.upsert({
      where: { id: game.id },
      update: game,
      create: game
    });
  }

  // Seed sample order for the standard user
  const witcher = await prisma.game.findUnique({ where: { id: 'seed-game-witcher3' } });
  if (witcher) {
    await prisma.order.upsert({
      where: { id: 'seed-order-user-witcher' },
      update: {
        userId: user.id,
        gameId: witcher.id,
        quantity: 1,
        unitPrice: witcher.price,
        totalPrice: witcher.price,
        status: 'COMPLETED'
      },
      create: {
        id: 'seed-order-user-witcher',
        userId: user.id,
        gameId: witcher.id,
        quantity: 1,
        unitPrice: witcher.price,
        totalPrice: witcher.price,
        status: 'COMPLETED'
      }
    });

    await prisma.review.upsert({
      where: { userId_gameId: { userId: user.id, gameId: witcher.id } },
      update: {
        rating: 5,
        comment: 'Absolutnie fenomenalna gra. Świat, fabuła i postacie na najwyższym poziomie. Polecam każdemu miłośnikowi RPG.'
      },
      create: {
        userId: user.id,
        gameId: witcher.id,
        rating: 5,
        comment: 'Absolutnie fenomenalna gra. Świat, fabuła i postacie na najwyższym poziomie. Polecam każdemu miłośnikowi RPG.'
      }
    });
  }

  // Seed a pending order for manager
  const cyberpunk = await prisma.game.findUnique({ where: { id: 'seed-game-cyberpunk' } });
  if (cyberpunk) {
    await prisma.order.upsert({
      where: { id: 'seed-order-manager-cyberpunk' },
      update: {
        userId: manager.id,
        gameId: cyberpunk.id,
        quantity: 1,
        unitPrice: cyberpunk.price,
        totalPrice: cyberpunk.price,
        status: 'PENDING'
      },
      create: {
        id: 'seed-order-manager-cyberpunk',
        userId: manager.id,
        gameId: cyberpunk.id,
        quantity: 1,
        unitPrice: cyberpunk.price,
        totalPrice: cyberpunk.price,
        status: 'PENDING'
      }
    });
  }

  const faqItems = [
    {
      question: 'Jak kupić grę?',
      answer: 'Zaloguj się, przejdź do katalogu gier i utwórz zamówienie dla wybranego tytułu.'
    },
    {
      question: 'Jak zmienić hasło?',
      answer: 'Po zalogowaniu wejdź w Konto -> Zmień hasło i podaj aktualne oraz nowe hasło.'
    },
    {
      question: 'Czy mogę anulować zamówienie?',
      answer: 'Skontaktuj się z obsługą. Manager lub admin może zmienić status zamówienia zgodnie z uprawnieniami.'
    }
  ];

  for (const item of faqItems) {
    const existingFaq = await prisma.faq.findFirst({ where: { question: item.question } });

    if (existingFaq) {
      await prisma.faq.update({
        where: { id: existingFaq.id },
        data: { answer: item.answer }
      });
      continue;
    }

    await prisma.faq.create({ data: item });
  }

  await prisma.promotion.upsert({
    where: { name: 'Kup 2 rozne gry -10%' },
    update: {
      minDistinctGames: 2,
      discountPercent: 10,
      isActive: true
    },
    create: {
      name: 'Kup 2 rozne gry -10%',
      minDistinctGames: 2,
      discountPercent: 10,
      isActive: true
    }
  });

  console.log('Seed completed for users:', {
    admin: admin.email,
    manager: manager.email,
    user: user.email
  });
  console.log(`Seeded ${gamesData.length} games.`);
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
