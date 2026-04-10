import { prisma } from '../lib/prisma';
import type { AuthenticatedRequestUser } from '../types/auth';

const orderGameSelect = {
  game: {
    select: {
      id: true,
      title: true,
      genre: true
    }
  }
} as const;

const orderUserSelect = {
  user: {
    select: {
      id: true,
      fullName: true,
      email: true
    }
  }
} as const;

export async function getDashboardData(user: AuthenticatedRequestUser) {
  if (user.role === 'ADMIN') {
    const [userCounts, gameCount, orderCount, revenueAgg, recentOrders, recentReviews, recentAuditLogs] =
      await Promise.all([
        prisma.user.groupBy({
          by: ['role'],
          _count: { role: true }
        }),
        prisma.game.count({ where: { isActive: true } }),
        prisma.order.count(),
        // Revenue: sum only COMPLETED orders
        prisma.order.aggregate({
          where: { status: 'COMPLETED' },
          _sum: { totalPrice: true }
        }),
        prisma.order.findMany({
          include: { ...orderGameSelect, ...orderUserSelect },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.review.findMany({
          include: { ...orderGameSelect, ...orderUserSelect },
          orderBy: { createdAt: 'desc' },
          take: 5
        }),
        prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          include: {
            actorUser: {
              select: { id: true, fullName: true, email: true }
            }
          },
          take: 8
        })
      ]);

    return {
      role: user.role,
      stats: {
        totalUsers: userCounts.reduce((sum, entry) => sum + entry._count.role, 0),
        totalGames: gameCount,
        totalOrders: orderCount,
        totalRevenue: revenueAgg._sum.totalPrice ?? 0,
        usersByRole: userCounts.map((entry) => ({
          role: entry.role,
          count: entry._count.role
        }))
      },
      recentOrders,
      recentReviews,
      recentAuditLogs
    };
  }

  if (user.role === 'MANAGER') {
    const [activeGames, allOrders, pendingOrderCount, recentReviews] = await Promise.all([
      prisma.game.count({ where: { isActive: true } }),
      prisma.order.findMany({
        include: { ...orderGameSelect, ...orderUserSelect },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.review.findMany({
        include: { ...orderGameSelect, ...orderUserSelect },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    return {
      role: user.role,
      stats: {
        activeGames,
        totalOrders: allOrders.length,
        pendingOrders: pendingOrderCount
      },
      recentOrders: allOrders,
      recentReviews
    };
  }

  // USER: scoped to own data only — RBAC enforced at query level
  const [ownOrders, ownReviews, spentAgg] = await Promise.all([
    prisma.order.findMany({
      where: { userId: user.id },
      include: orderGameSelect,
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.review.findMany({
      where: { userId: user.id },
      include: orderGameSelect,
      orderBy: { createdAt: 'desc' },
      take: 10
    }),
    prisma.order.aggregate({
      where: { userId: user.id, status: 'COMPLETED' },
      _sum: { totalPrice: true }
    })
  ]);

  return {
    role: user.role,
    profile: {
      id: user.id,
      fullName: user.fullName,
      email: user.email
    },
    stats: {
      totalOrders: ownOrders.length,
      totalSpent: spentAgg._sum.totalPrice ?? 0,
      totalReviews: ownReviews.length
    },
    ownOrders,
    ownReviews
  };
}
