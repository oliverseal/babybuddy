# -*- coding: utf-8 -*-
import random
from datetime import timedelta

from django.db.models import Max
from django.utils import timezone
from django.utils.translation import ngettext

from core import models

random.seed()

COLORS = [
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ff00ff",
    "#ffff00",
    "#00ffff",
    "#ff7f7f",
    "#7fff7f",
    "#7f7fff",
    "#ff7fff",
    "#ffff7f",
    "#7fffff",
    "#7f0000",
    "#007f00",
    "#00007f",
    "#7f007f",
    "#7f7f00",
    "#007f7f",
]


def duration_string(duration, precision="s"):
    """Format hours, minutes and seconds as a human-friendly string (e.g. "2
    hours, 25 minutes, 31 seconds") with precision to h = hours, m = minutes or
    s = seconds.
    """
    h, m, s = duration_parts(duration)

    duration = ""
    if h > 0:
        duration = ngettext("%(hours)s hour", "%(hours)s hours", h) % {"hours": h}
    if m > 0 and precision != "h":
        if duration != "":
            duration += ", "
        duration += ngettext("%(minutes)s minute", "%(minutes)s minutes", m) % {
            "minutes": m
        }
    if s > 0 and precision != "h" and precision != "m":
        if duration != "":
            duration += ", "
        duration += ngettext("%(seconds)s second", "%(seconds)s seconds", s) % {
            "seconds": s
        }

    return duration


def duration_parts(duration):
    """Get hours, minutes and seconds from a timedelta."""
    if not isinstance(duration, timezone.timedelta):
        raise TypeError("Duration provided must be a timedetla")
    h, remainder = divmod(duration.seconds, 3600)
    h += duration.days * 24
    m, s = divmod(remainder, 60)
    return h, m, s


def random_color():
    return COLORS[random.randrange(0, len(COLORS))]


def get_heatmap(model, tz_offset=-5, start_date=None, end_date=None):
    INTERVAL = 5
    LOOKBACK = 10 # days
    # logoc to get the finner granularity
    # is a little to complex to put into raw sql
    # so we make python do it

    # get all entries within the date range
    if end_date is None:
        end_date = model.objects.all().aggregate(
            latest_date=Max('end')
        )['latest_date']
    if start_date is None:
        start_date = end_date - timedelta(days=LOOKBACK)
    # this result should cover several days
    queryset = model.objects.filter(
        start__gte=start_date,
        end__lte=end_date
    )

    # create a dict for each segment (five minutes of the whole day)
    date_segments = {}
    for hour in range(0, 24):
        for minute in range(0, 60, INTERVAL):
            # default to no entries
            date_segments[
                (hour, minute)
            ] = 0

    # loop the data aand check if the date's hour/minute is in the segment
    print(queryset.count())
    for entry in queryset:
        start_hour = entry.start.hour
        start_minute = entry.start.minute
        end_hour = entry.end.hour
        end_minute = entry.end.minute

        for (hour, minute) in date_segments.keys():
            # if the segment is inside the entry's hour, we can just increment without checking minute
            if (
                hour > start_hour and
                hour < end_hour
            ):
                # increment the segment
                date_segments[(hour, minute)] += 1
                if hour == 22:
                    print(start_hour, end_hour, entry.start, entry.end)

            elif hour == start_hour and hour == end_hour:
                # if the segment is on the same hour as the entry's start/end
                # check if the segment is less than the entry's end minute
                if minute >= start_minute and minute < end_minute:
                    # increment the segment
                    date_segments[(hour, minute)] += 1

            elif hour == start_hour:
                # if the segment is on the same hour as the entry's start
                # check if the segment is in the entry's start minute
                if minute >= start_minute:
                    # increment the segment
                    date_segments[(hour, minute)] += 1

            elif hour == end_hour:
                # if the segment is on the same hour as the entry's end
                # check if the segment is in the entry's end minute
                if minute < end_minute:
                    # increment the segment
                    date_segments[(hour, minute)] += 1

    serializable_date_segments = []
    total_days = (end_date - start_date).days
    index = 0
    rotate_index = -1
    for (hour, minute), count in date_segments.items():
        modified_hour = hour + int(tz_offset)
        if modified_hour < 0:
            modified_hour = 24 + modified_hour
        if modified_hour > 23:
            modified_hour = modified_hour - 24
        if modified_hour == 0 and rotate_index == -1:
            rotate_index = index
        serializable_date_segments.append({
            'hour': modified_hour,
            'minute': minute,
            'count': count,
            'ratio': count / total_days
        })
        index += 1
    serializable_date_segments = serializable_date_segments[rotate_index:] + serializable_date_segments[:rotate_index]
    return serializable_date_segments
