
// corresponds to get_heatmap constants in utils.py
const INTERVAL = 5;
const LOOKBACK = 14;

class HeatMap {
    constructor(container) {
        this.container = container;
        this.canvasContainer = document.createElement('div');
        this.canvasContainer.className = 'heatmap-canvas-container';
        this.container.appendChild(this.canvasContainer);
        this.lastData = [];

        this.makeCanvas();
        this.makePredictor();

        window.addEventListener('resize', () => {
            // rebuild the canvas because the size changed
            this.makeCanvas();
            requestAnimationFrame(() => {
                // when we finish resizing
                this.fetchMap(this.model);
            });
        });

        this.canvasContainer.addEventListener('mousemove', (e) => {
            this.showRatioAt(e.offsetX);
        });
        this.canvasContainer.addEventListener('mouseleave', (e) => {
            this.clearRatio();
        });
    }

    makeCanvas() {
        this.canvasContainer.innerHTML = '';
        const canvas = document.createElement('canvas');
        canvas.width = this.canvasContainer.clientWidth;
        canvas.height = this.canvasContainer.clientHeight;

        const scale = window.devicePixelRatio;
        const baseWidth = canvas.width;
        const baseHeight = canvas.height;
        canvas.width = baseWidth * scale;
        canvas.height = baseHeight * scale;
        canvas.style.width = baseWidth + 'px';
        canvas.style.height = baseHeight + 'px';

        this.canvasContainer.appendChild(canvas);
        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);

        // export
        this.canvas = canvas;
        this.ctx = ctx;
    }

    makePredictor() {
        if (this.predictor) {
            return this.predictor;
        }
        const predictor = document.createElement('div');
        predictor.className = 'predictor';
        this.container.appendChild(predictor);
        this.predictor = predictor;
    }

    updateCanvas(data) {
        this.ctx.lineWidth = 0;
        this.ctx.strokeStyle = 'transparent';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const segmentSize = Math.max(this.canvasContainer.clientWidth / data.length, 1);
        const meterHeight = this.canvasContainer.clientHeight - 14;

        let currentHour = -1;
        data.forEach((segment, i) => {
            let x = Math.floor(i * segmentSize);
            let y = 0;
            let heat = 255 - Math.floor(segment.ratio * 255);
            this.ctx.fillStyle = `rgb(${heat}, ${heat}, ${heat})`;
            this.ctx.fillRect(x, y + 4, Math.ceil(segmentSize), meterHeight);
            if (segment.hour != currentHour) {
                currentHour = segment.hour;
                this.ctx.fillStyle = '#fff';
                this.ctx.textFont = '10px Arial';
                let prettyHour = segment.hour <= 12 ? segment.hour : segment.hour - 12;
                if (prettyHour == 0) {
                    prettyHour = 12;
                }
                this.ctx.fillText(prettyHour, x, y + meterHeight + 14);
            }
        });

        const now = new Date();
        const hourSegment = this.canvas.width / (24 * window.devicePixelRatio);
        const nowX = Math.floor((now.getHours() + now.getMinutes() / 60) * hourSegment);
        this.ctx.lineWidth = 1;
        this.ctx.fillStyle = '#37ABE9';
        this.ctx.fillRect(nowX, 0, 1, this.canvas.height);
    }

    updatePrediction(data) {
        const now = new Date();
        const nowHour = now.getHours();
        const nowMins = now.getMinutes();
        let shouldBeAsleepNow = false;
        let chanceToBe = 0;
        let nextSleep = null;
        let verb = 'be'
        if (this.model === 'sleep') {
            verb = 'sleep'
        } else if (this.model === 'feedings') {
            verb = 'feed'
        }
        // check if should be asleep now
        // if not, check for what's next

        for (let i = 0; i < data.length; i++) {
            const segment = data[i];
            if (segment.hour == nowHour && nowMins >= segment.minute && nowMins < segment.minute + INTERVAL) {
                if (segment.ratio > 0.66) {
                    shouldBeAsleepNow = true;
                    chanceToBe = segment.ratio;
                    break;
                }
            }
        }

        if (shouldBeAsleepNow) {
            this.predictor.innerHTML = `${Math.floor(chanceToBe * 100)}% expectation to ${verb} now`;
            return;
        }

        // shouldn't be asleep right now? find the next sleep
        for (let i = 0; i < data.length; i++) {
            const segment = data[i];
            if (segment.hour > nowHour || (segment.hour == nowHour && segment.minute > nowMins)) {
                if (segment.ratio > 0.45) {
                    chanceToBe = segment.ratio;
                    nextSleep = segment;
                    break;
                }
            }
        }

        if (nextSleep) {
            const nextHour = nextSleep.hour;
            const nextMinutes = nextSleep.minute;
            const nextHourStr = nextHour <= 12 ? nextHour : nextHour - 12;
            const nextMinutesStr = nextMinutes < 10 ? `0${nextMinutes}` : nextMinutes;
            const nextTime = `${nextHourStr}:${nextMinutesStr}`;
            this.predictor.innerHTML = `${Math.floor(chanceToBe * 100)}% expectation to ${verb} by ${nextTime}`;
        } else {
            this.predictor.innerHTML = '';
        }
    }

    showRatioAt(x) {
        const hourSegment = this.canvas.width / (24 * window.devicePixelRatio);
        const hour = Math.floor(x / hourSegment);
        const minutes = Math.floor((x % hourSegment) / hourSegment * 60);
        const prettyHour = hour <= 12 ? hour : hour - 12;
        const prettyMinutes = minutes < 10 ? `0${minutes}` : minutes;
        const time = `${prettyHour}:${prettyMinutes}`;
        let chance = 0;

        // find the segment
        for (let i = 0; i < this.lastData.length; i++) {
            const segment = this.lastData[i];
            if (segment.hour == hour && minutes >= segment.minute && minutes < segment.minute + INTERVAL) {
                chance = segment.ratio;
                break;
            }
        }

        this.predictor.innerHTML = `${Math.floor(chance * 100)}% at ${time}`;
    }

    clearRatio() {
        this.updatePrediction(this.lastData);
    }

    fetchMap(model) {
        this.model = model;
        const url = `/api/${model}/heatmap/`;
        fetch(url)
            .then(response => response.json())
            .then(data => {
                this.updateCanvas(data);
                this.updatePrediction(data);
                this.lastData = data;
            });
    }
}

BabyBuddy.HeatMap = HeatMap;
