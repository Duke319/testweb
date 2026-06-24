function notFoundHandler(request, response) {
  response.status(404).json({
    error: "Not Found",
    path: request.originalUrl,
  });
}

function errorHandler(error, request, response, next) {
  if (response.headersSent) {
    next(error);
    return;
  }

  const status = Number(error.statusCode || error.status || 500);
  response.status(status).json({
    error: status >= 500 ? "Internal Server Error" : error.message,
    message: error.message,
  });
}

module.exports = { errorHandler, notFoundHandler };
