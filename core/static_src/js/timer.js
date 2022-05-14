/* Baby Buddy Timer
 *
 * Uses a supplied ID to run a timer. The element using the ID must have
 * three children with the following classes:
 *  * timer-seconds
 *  * timer-minutes
 *  * timer-hours
 */

(function ($) {
    class Timer {
        constructor(timer_id, element_id) {
            this.timerId = timer_id;
            this.timerElement = $('#' + element_id);
            this.lastUpdate = moment();
        }

        run() {
            if (this.timerElement.length == 0) {
                console.error('BBTimer: Timer element not found.');
                return false;
            }

            if (this.timerElement.find('.timer-seconds').length == 0
                || this.timerElement.find('.timer-minutes').length == 0
                || this.timerElement.find('.timer-hours').length == 0) {
                console.error('BBTimer: Element does not contain expected children.');
                return false;
            }

            this.runIntervalId = setInterval(() => this.tick(), 1000);

            // If the page just came in to view, update the timer data with the
            // current actual duration. This will (potentially) help mobile
            // phones that lock with the timer page open.
            if (typeof document.hidden !== "undefined") {
                this.hidden = "hidden";
            }
            else if (typeof document.msHidden !== "undefined") {
                this.hidden = "msHidden";
            }
            else if (typeof document.webkitHidden !== "undefined") {
                this.hidden = "webkitHidden";
            }
            window.addEventListener('focus', this.handleVisibilityChange.bind(this), false);
        }

        handleVisibilityChange() {
            if (!document[this.hidden] && moment().diff(this.lastUpdate) > 10000) {
                this.update();
            }
        }

        tick() {
            var s = this.timerElement.find('.timer-seconds');
            var seconds = Number(s.text());
            if (seconds < 59) {
                s.text(seconds + 1);
                return;
            }
            else {
                s.text(0);
            }

            var m = this.timerElement.find('.timer-minutes');
            var minutes = Number(m.text());
            if (minutes < 59) {
                m.text(minutes + 1);
                return;
            }
            else {
                m.text(0);
            }

            var h = this.timerElement.find('.timer-hours');
            var hours = Number(h.text());
            h.text(hours + 1);
        }

        update() {
            $.get('/api/timers/' + this.timerId + '/', function(data) {
                if (data && 'duration' in data) {
                    clearInterval(this.runIntervalId);
                    var duration = moment.duration(data.duration);
                    this.timerElement.find('.timer-hours').text(duration.hours());
                    this.timerElement.find('.timer-minutes').text(duration.minutes());
                    this.timerElement.find('.timer-seconds').text(duration.seconds());
                    this.lastUpdate = moment();

                    if (data['active']) {
                        this.runIntervalId = setInterval(() => this.tick(), 1000);
                    }
                    else {
                        this.timerElement.addClass('timer-stopped');
                    }
                }
            });
        }
    };

    BabyBuddy.Timer = Timer;
})(jQuery);
