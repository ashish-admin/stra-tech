"""
Enhanced Gunicorn Configuration for LokDarpan Production
Optimized for political intelligence platform with AI workloads
"""
import multiprocessing
import os

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
workers = int(os.getenv('GUNICORN_WORKERS', multiprocessing.cpu_count() * 2 + 1))
worker_class = "gevent"
worker_connections = 1000
max_requests = int(os.getenv('GUNICORN_MAX_REQUESTS', 1000))
max_requests_jitter = int(os.getenv('GUNICORN_MAX_REQUESTS_JITTER', 50))
timeout = int(os.getenv('GUNICORN_TIMEOUT', 120))
keepalive = int(os.getenv('GUNICORN_KEEPALIVE', 5))

# Threading
threads = int(os.getenv('GUNICORN_THREADS', 2))

# Preload application for better memory usage
preload_app = True

# Restart workers after serving this many requests (helps prevent memory leaks)
max_requests = 1000
max_requests_jitter = 100

# Security
limit_request_line = 8192
limit_request_fields = 100
limit_request_field_size = 8190

# Logging
loglevel = os.getenv('GUNICORN_LOG_LEVEL', 'info')
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'
accesslog = "-"
errorlog = "-"
capture_output = True

# Process naming
proc_name = "lokdarpan-backend"

# Server mechanics
pidfile = "/tmp/gunicorn.pid"
user = 1000
group = 1000
tmp_upload_dir = "/app/tmp"

# SSL (if certificates are provided)
keyfile = os.getenv('SSL_KEYFILE')
certfile = os.getenv('SSL_CERTFILE')

# Worker lifecycle hooks
def on_starting(server):
    server.log.info("LokDarpan backend starting up...")

def on_reload(server):
    server.log.info("LokDarpan backend reloading...")

def when_ready(server):
    server.log.info("LokDarpan backend is ready. Listening on: %s", server.address)

def worker_int(worker):
    worker.log.info("Worker received INT or QUIT signal")

def pre_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)
    # Initialize worker-specific resources here if needed

def pre_exec(server):
    server.log.info("Forked child, re-executing.")

def when_ready(server):
    server.log.info("Server is ready. Spawning workers")

def worker_abort(worker):
    worker.log.info("Worker received SIGABRT signal")

def on_exit(server):
    server.log.info("LokDarpan backend shutting down...")

# Custom configuration for AI workloads
raw_env = [
    'PYTHONPATH=/app',
    'FLASK_ENV=production',
    'WORKER_TIMEOUT=300',  # Extended timeout for AI processing
    'AI_PROCESSING_TIMEOUT=180',
]