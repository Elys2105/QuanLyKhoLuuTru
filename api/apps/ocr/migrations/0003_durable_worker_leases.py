from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("ocr", "0002_ocrjob_current_page_ocrjob_ocr_mode_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="ocrjob",
            name="pipeline_id",
            field=models.UUIDField(blank=True, editable=False, null=True, verbose_name="Pipeline OCR"),
        ),
        migrations.AddField(
            model_name="ocrjob",
            name="lease_owner",
            field=models.CharField(blank=True, default="", max_length=128, verbose_name="Worker đang giữ lease"),
        ),
        migrations.AddField(
            model_name="ocrjob",
            name="lease_token",
            field=models.UUIDField(blank=True, editable=False, null=True, verbose_name="Lease token"),
        ),
        migrations.AddField(
            model_name="ocrjob",
            name="lease_expires_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Lease hết hạn"),
        ),
        migrations.AddField(
            model_name="ocrjob",
            name="heartbeat_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Heartbeat gần nhất"),
        ),
        migrations.AddField(
            model_name="ocrjob",
            name="attempt_count",
            field=models.PositiveSmallIntegerField(default=0, verbose_name="Số lần đã claim"),
        ),
        migrations.AddField(
            model_name="ocrjob",
            name="max_attempts",
            field=models.PositiveSmallIntegerField(default=3, verbose_name="Số lần thử tối đa"),
        ),
        migrations.AddField(
            model_name="ocrjob",
            name="next_retry_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="Cho phép retry từ"),
        ),
        migrations.AddIndex(
            model_name="ocrjob",
            index=models.Index(fields=["status", "next_retry_at"], name="ocr_jobs_status_retry_idx"),
        ),
        migrations.AddIndex(
            model_name="ocrjob",
            index=models.Index(fields=["pipeline_id", "ocr_mode"], name="ocr_jobs_pipe_mode_idx"),
        ),
        migrations.AddIndex(
            model_name="ocrjob",
            index=models.Index(fields=["lease_expires_at"], name="ocr_jobs_lease_exp_idx"),
        ),
    ]
