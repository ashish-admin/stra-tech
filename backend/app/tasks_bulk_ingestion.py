"""
High-Performance Bulk Ingestion Tasks for LokDarpan 145-Ward Scale

Optimized Celery tasks for handling 145K daily posts with minimal database impact.
Replaces single-row processing with batch operations for production scale.

Performance Targets:
- 145K posts ingestion in <30 minutes  
- Minimal database locking during ingestion
- Concurrent ingestion across multiple workers
- SHA256 deduplication at scale
- Zero-downtime operations
"""

import os
import json
import hashlib
import logging
from datetime import datetime, timezone, date
from typing import Optional, List, Dict, Any, Tuple
import uuid
from dataclasses import dataclass

from celery import shared_task, group
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text

from .extensions import db
from .models import Epaper, Author, Post

log = logging.getLogger(__name__)

# ===================================================================
# Performance-Optimized Data Structures
# ===================================================================

@dataclass
class BulkIngestStats:
    """Statistics tracking for bulk ingestion operations"""
    total_records: int = 0
    inserted_epapers: int = 0
    reused_epapers: int = 0
    inserted_posts: int = 0
    skipped_posts: int = 0
    error_count: int = 0
    processing_time_ms: int = 0
    batch_size: int = 0
    worker_id: str = ""

@dataclass 
class EpaperRecord:
    """Optimized epaper record structure"""
    publication_name: str
    publication_date: date
    title: Optional[str]
    body: Optional[str] 
    city: Optional[str]
    party: Optional[str]
    raw_text: str
    sha256: str
    
    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> 'EpaperRecord':
        """Create EpaperRecord from JSON data with validation"""
        title = (data.get("title") or "").strip()
        body = (data.get("body") or "").strip()
        raw_text = f"{title}\n\n{body}".strip() if title and body else (title or body or "")
        
        pub_date = _parse_date(data.get("publication_date")) or datetime.now(timezone.utc).date()
        publication = (data.get("publication_name") or "Unknown Publication").strip()
        
        # Generate SHA256 for deduplication
        key = f"{_norm(publication)}|{pub_date.isoformat()}|{_norm(raw_text)}"
        sha256_hash = hashlib.sha256(key.encode("utf-8")).hexdigest()
        
        return cls(
            publication_name=publication,
            publication_date=pub_date,
            title=title,
            body=body,
            city=data.get("city"),
            party=data.get("party"),
            raw_text=raw_text,
            sha256=sha256_hash
        )

# ===================================================================
# High-Performance Utility Functions
# ===================================================================

def _norm(s: Optional[str]) -> str:
    """Normalize string for consistent comparison"""
    return " ".join((s or "").strip().split()).lower()

def _parse_date(s: Optional[str]) -> Optional[date]:
    """Parse date from various formats"""
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None

def _batch_chunks(items: List, chunk_size: int):
    """Split list into chunks of specified size"""
    for i in range(0, len(items), chunk_size):
        yield items[i:i + chunk_size]

# ===================================================================
# Optimized Bulk Processing Functions
# ===================================================================

def _bulk_upsert_epapers(epaper_records: List[EpaperRecord]) -> Tuple[int, int]:
    """
    High-performance bulk upsert of epaper records with SHA256 deduplication.
    
    Returns:
        Tuple of (inserted_count, reused_count)
    """
    if not epaper_records:
        return 0, 0
        
    try:
        # Prepare bulk data
        epaper_data = []
        for record in epaper_records:
            epaper_data.append({
                'publication_name': record.publication_name,
                'publication_date': record.publication_date.isoformat(), 
                'raw_text': record.raw_text,
                'sha256': record.sha256
            })
        
        # Use the optimized database function for bulk processing
        result = db.session.execute(
            text("SELECT * FROM bulk_process_epapers(:data)"),
            {'data': json.dumps(epaper_data)}
        ).fetchone()
        
        if result:
            return result[0], result[1]  # inserted_epapers, reused_epapers
        else:
            return 0, 0
            
    except Exception as e:
        log.error(f"Bulk epaper upsert failed: {e}")
        db.session.rollback()
        raise

def _bulk_insert_posts_optimized(post_data: List[Dict[str, Any]]) -> int:
    """
    High-performance bulk insert of posts using database function.
    
    Returns:
        Number of posts inserted
    """
    if not post_data:
        return 0
        
    try:
        # Use the optimized database function
        result = db.session.execute(
            text("SELECT * FROM bulk_insert_posts(:data)"),
            {'data': json.dumps(post_data)}
        ).fetchone()
        
        if result:
            return result[0]  # inserted_count
        else:
            return 0
            
    except Exception as e:
        log.error(f"Bulk post insert failed: {e}")
        db.session.rollback()
        raise

# ===================================================================
# Main Bulk Ingestion Tasks  
# ===================================================================

@shared_task(bind=True, name="app.tasks_bulk_ingestion.bulk_ingest_epapers_optimized")
def bulk_ingest_epapers_optimized(
    self, 
    jsonl_path: str, 
    batch_size: int = 1000,
    max_workers: int = 4
) -> Dict[str, Any]:
    """
    Optimized bulk ingestion of JSONL epaper files for production scale.
    
    Handles 145K+ records with minimal database locking and maximum throughput.
    Uses partitioned processing and database-level bulk operations.
    
    Args:
        jsonl_path: Path to JSONL file containing epaper records
        batch_size: Number of records per batch (default: 1000)
        max_workers: Maximum parallel workers for processing
        
    Returns:
        Dictionary containing ingestion statistics and performance metrics
    """
    start_time = datetime.now(timezone.utc)
    worker_id = str(uuid.uuid4())[:8]
    
    log.info(f"[{worker_id}] Starting optimized bulk ingestion: {jsonl_path}")
    
    if not os.path.exists(jsonl_path):
        error_msg = f"Bulk ingestion file not found: {jsonl_path}"
        log.error(error_msg)
        return {"error": error_msg, "worker_id": worker_id}
    
    stats = BulkIngestStats(worker_id=worker_id, batch_size=batch_size)
    
    try:
        # Load and validate all records first
        log.info(f"[{worker_id}] Loading records from {jsonl_path}")
        raw_records = []
        
        with open(jsonl_path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    raw_records.append(json.loads(line))
                except json.JSONDecodeError as e:
                    log.warning(f"[{worker_id}] Invalid JSON on line {line_num}: {e}")
                    stats.error_count += 1
                    continue
        
        stats.total_records = len(raw_records)
        log.info(f"[{worker_id}] Loaded {stats.total_records} records for processing")
        
        if stats.total_records == 0:
            return stats.__dict__
        
        # Process records in batches
        batch_count = 0
        for batch in _batch_chunks(raw_records, batch_size):
            batch_count += 1
            log.info(f"[{worker_id}] Processing batch {batch_count} ({len(batch)} records)")
            
            try:
                # Convert to structured records
                epaper_records = []
                for raw_record in batch:
                    try:
                        record = EpaperRecord.from_json(raw_record)
                        epaper_records.append(record)
                    except Exception as e:
                        log.warning(f"[{worker_id}] Invalid record: {e}")
                        stats.error_count += 1
                        continue
                
                # Bulk upsert epapers
                if epaper_records:
                    inserted_ep, reused_ep = _bulk_upsert_epapers(epaper_records)
                    stats.inserted_epapers += inserted_ep
                    stats.reused_epapers += reused_ep
                    
                    # Prepare post data for bulk insert
                    post_data = []
                    for record in epaper_records:
                        post_data.append({
                            'text': record.raw_text,
                            'author_name': record.publication_name,
                            'city': record.city,
                            'party': record.party,
                            'created_at': datetime.combine(record.publication_date, datetime.min.time()).replace(tzinfo=timezone.utc).isoformat()
                        })
                    
                    # Bulk insert posts
                    inserted_posts = _bulk_insert_posts_optimized(post_data)
                    stats.inserted_posts += inserted_posts
                
                # Commit batch
                db.session.commit()
                log.info(f"[{worker_id}] Batch {batch_count} completed successfully")
                
            except Exception as e:
                log.error(f"[{worker_id}] Batch {batch_count} failed: {e}")
                db.session.rollback()
                stats.error_count += len(batch)
                continue
        
        # Calculate final statistics
        end_time = datetime.now(timezone.utc)
        stats.processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        log.info(f"[{worker_id}] Bulk ingestion completed:")
        log.info(f"  - Total records: {stats.total_records}")
        log.info(f"  - Inserted epapers: {stats.inserted_epapers}")
        log.info(f"  - Reused epapers: {stats.reused_epapers}")
        log.info(f"  - Inserted posts: {stats.inserted_posts}")
        log.info(f"  - Errors: {stats.error_count}")
        log.info(f"  - Processing time: {stats.processing_time_ms}ms")
        
        # Move processed file
        processed_dir = os.path.join(os.path.dirname(jsonl_path), "processed")
        os.makedirs(processed_dir, exist_ok=True)
        timestamp = start_time.strftime("%Y%m%d_%H%M%S")
        processed_path = os.path.join(processed_dir, f"{timestamp}_{os.path.basename(jsonl_path)}")
        
        try:
            os.rename(jsonl_path, processed_path)
            log.info(f"[{worker_id}] File moved to: {processed_path}")
        except Exception as e:
            log.warning(f"[{worker_id}] Could not move processed file: {e}")
        
        return stats.__dict__
        
    except Exception as e:
        log.error(f"[{worker_id}] Fatal error in bulk ingestion: {e}")
        db.session.rollback()
        return {
            **stats.__dict__,
            "error": str(e),
            "processing_time_ms": int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
        }

@shared_task(bind=True, name="app.tasks_bulk_ingestion.distributed_bulk_ingest")
def distributed_bulk_ingest(
    self,
    jsonl_path: str,
    partition_count: int = 4,
    batch_size: int = 1000
) -> Dict[str, Any]:
    """
    Distributed bulk ingestion across multiple workers for maximum throughput.
    
    Splits large JSONL files into partitions and processes them concurrently
    to achieve 145K posts in <30 minutes target.
    
    Args:
        jsonl_path: Path to large JSONL file
        partition_count: Number of parallel partitions
        batch_size: Batch size for each partition
        
    Returns:
        Aggregated statistics from all partitions
    """
    start_time = datetime.now(timezone.utc)
    coordinator_id = str(uuid.uuid4())[:8]
    
    log.info(f"[{coordinator_id}] Starting distributed bulk ingestion: {jsonl_path}")
    
    try:
        # Split file into partitions
        partition_files = []
        base_dir = os.path.dirname(jsonl_path)
        base_name = os.path.splitext(os.path.basename(jsonl_path))[0]
        
        with open(jsonl_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        lines_per_partition = len(lines) // partition_count
        
        for i in range(partition_count):
            partition_file = os.path.join(base_dir, f"{base_name}_part_{i+1}.jsonl")
            start_idx = i * lines_per_partition
            end_idx = start_idx + lines_per_partition if i < partition_count - 1 else len(lines)
            
            with open(partition_file, "w", encoding="utf-8") as pf:
                pf.writelines(lines[start_idx:end_idx])
            
            partition_files.append(partition_file)
        
        log.info(f"[{coordinator_id}] Created {len(partition_files)} partitions")
        
        # Process partitions in parallel using Celery group
        partition_jobs = group(
            bulk_ingest_epapers_optimized.s(pf, batch_size=batch_size) 
            for pf in partition_files
        )
        
        results = partition_jobs.apply_async()
        partition_results = results.get()
        
        # Aggregate results
        total_stats = BulkIngestStats(worker_id=coordinator_id)
        for result in partition_results:
            if "error" not in result:
                total_stats.total_records += result.get("total_records", 0)
                total_stats.inserted_epapers += result.get("inserted_epapers", 0)
                total_stats.reused_epapers += result.get("reused_epapers", 0)
                total_stats.inserted_posts += result.get("inserted_posts", 0)
                total_stats.error_count += result.get("error_count", 0)
        
        # Cleanup partition files
        for pf in partition_files:
            try:
                os.remove(pf)
            except:
                pass
        
        end_time = datetime.now(timezone.utc)
        total_stats.processing_time_ms = int((end_time - start_time).total_seconds() * 1000)
        
        log.info(f"[{coordinator_id}] Distributed ingestion completed:")
        log.info(f"  - Partitions: {partition_count}")
        log.info(f"  - Total records: {total_stats.total_records}")
        log.info(f"  - Total processing time: {total_stats.processing_time_ms}ms")
        log.info(f"  - Throughput: {total_stats.total_records * 1000 // max(total_stats.processing_time_ms, 1)} records/sec")
        
        return total_stats.__dict__
        
    except Exception as e:
        log.error(f"[{coordinator_id}] Distributed ingestion failed: {e}")
        return {
            "error": str(e),
            "worker_id": coordinator_id,
            "processing_time_ms": int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
        }

@shared_task(name="app.tasks_bulk_ingestion.monitor_ingestion_performance")
def monitor_ingestion_performance() -> Dict[str, Any]:
    """
    Monitor ingestion performance and system health.
    
    Returns real-time metrics for ingestion capacity and database performance.
    """
    try:
        # Get performance metrics from database
        result = db.session.execute(text("SELECT * FROM ward_performance_metrics()")).fetchall()
        
        metrics = {}
        for row in result:
            metrics[row[0]] = {
                'value': float(row[1]),
                'target': float(row[2]), 
                'status': row[3]
            }
        
        # Add ingestion-specific metrics
        partition_count = db.session.execute(
            text("SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'post_y%m%'")
        ).scalar()
        
        recent_posts = db.session.execute(
            text("SELECT COUNT(*) FROM post_partitioned WHERE created_at >= NOW() - INTERVAL '24 hours'")
        ).scalar()
        
        metrics.update({
            'active_partitions': {
                'value': partition_count,
                'target': 24,
                'status': 'OPTIMAL' if partition_count >= 12 else 'NEEDS_ATTENTION'
            },
            'posts_last_24h': {
                'value': recent_posts,
                'target': 145000,
                'status': 'OPTIMAL' if recent_posts <= 145000 else 'HIGH_VOLUME'
            }
        })
        
        return {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'metrics': metrics,
            'system_status': 'healthy'
        }
        
    except Exception as e:
        log.error(f"Performance monitoring failed: {e}")
        return {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'error': str(e),
            'system_status': 'error'
        }

# ===================================================================
# Scheduled Maintenance Tasks
# ===================================================================

@shared_task(name="app.tasks_bulk_ingestion.daily_partition_maintenance")
def daily_partition_maintenance() -> Dict[str, Any]:
    """
    Daily maintenance task for partition management and optimization.
    
    Automatically creates future partitions and optimizes existing ones.
    """
    try:
        # Run ward-scale maintenance
        result = db.session.execute(text("SELECT ward_scale_maintenance()")).scalar()
        db.session.commit()
        
        log.info(f"Daily partition maintenance completed: {result}")
        return json.loads(result) if result else {"status": "completed"}
        
    except Exception as e:
        log.error(f"Daily partition maintenance failed: {e}")
        db.session.rollback()
        return {"error": str(e), "status": "failed"}