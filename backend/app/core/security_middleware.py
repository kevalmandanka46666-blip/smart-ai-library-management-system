import time
from collections import defaultdict
from fastapi import Request, Response, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to inject production security headers on all HTTP responses.
    """
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'; img-src 'self' data: blob:;"
        return response

class RateLimiterMiddleware(BaseHTTPMiddleware):
    """
    In-memory rate limiter using a sliding window algorithm.
    - Restricts auth routes (/api/v1/auth/*) to 10 requests per minute.
    - Restricts general API routes to 120 requests per minute.
    """
    def __init__(self, app, auth_limit: int = 10, general_limit: int = 120, window_seconds: int = 60):
        super().__init__(app)
        self.auth_limit = auth_limit
        self.general_limit = general_limit
        self.window_seconds = window_seconds
        # Storage: {client_ip: [timestamps]}
        self.auth_requests = defaultdict(list)
        self.general_requests = defaultdict(list)

    def _clean_and_count(self, timestamps: list, now: float) -> int:
        cutoff = now - self.window_seconds
        # Remove timestamps older than window
        while timestamps and timestamps[0] < cutoff:
            timestamps.pop(0)
        return len(timestamps)

    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()

        path = request.url.path

        # Sensitive auth endpoints limit check
        if path.startswith("/api/v1/auth/login") or path.startswith("/api/v1/auth/register") or path.startswith("/api/v1/auth/forgot-password"):
            user_hits = self.auth_requests[client_ip]
            count = self._clean_and_count(user_hits, now)
            if count >= self.auth_limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many authentication attempts. Please try again in 1 minute."
                )
            user_hits.append(now)
        elif path.startswith("/api/v1/"):
            user_hits = self.general_requests[client_ip]
            count = self._clean_and_count(user_hits, now)
            if count >= self.general_limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again shortly."
                )
            user_hits.append(now)

        return await call_next(request)
