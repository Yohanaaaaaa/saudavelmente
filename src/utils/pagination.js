function toInteger(value, fallback) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return parsed;
}

function parsePagination(query = {}, options = {}) {
  const defaultPage = options.defaultPage || 1;
  const defaultPageSize = options.defaultPageSize || 10;
  const maxPageSize = options.maxPageSize || 100;

  const page = Math.max(1, toInteger(query.page, defaultPage));
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, toInteger(query.pageSize, defaultPageSize))
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize
  };
}

function buildPaginatedResponse(data, total, page, pageSize) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
}

module.exports = {
  parsePagination,
  buildPaginatedResponse
};
