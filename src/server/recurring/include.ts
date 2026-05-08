export const RECURRING_INCLUDE = {
  client: { select: { id: true, name: true, email: true } },
  items: { orderBy: { sortOrder: "asc" as const } },
  itemGroups: {
    include: { items: { orderBy: { sortOrder: "asc" as const } } },
    orderBy: { sortOrder: "asc" as const },
  },
};
