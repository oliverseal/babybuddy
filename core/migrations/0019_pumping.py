# Generated by Django 4.0.1 on 2022-01-27 07:20

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0018_bmi_headcircumference_height'),
    ]

    operations = [
        migrations.CreateModel(
            name='Pumping',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('start', models.DateTimeField(verbose_name='Start time')),
                ('end', models.DateTimeField(verbose_name='End time')),
                ('duration', models.DurationField(editable=False, null=True, verbose_name='Duration')),
                ('amount', models.FloatField(blank=True, null=True, verbose_name='Amount')),
                ('notes', models.TextField(blank=True, null=True, verbose_name='Notes')),
                ('method', models.CharField(choices=[('left breast', 'Left breast'), ('right breast', 'Right breast'), ('both breasts', 'Both breasts')], max_length=255, verbose_name='Method')),
                ('child', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='pumping', to='core.child', verbose_name='Child')),
            ],
            options={
                'verbose_name': 'Pumping',
                'ordering': ['-start'],
                'default_permissions': ('view', 'add', 'change', 'delete'),
            },
        ),
    ]