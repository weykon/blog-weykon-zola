/**
 * Matrix Rain Effect - Hacker-style animated text streams
 * 黑客风格的矩阵雨动画效果
 */

class MatrixRain {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with id "${containerId}" not found`);
            return;
        }

        // Configuration
        this.config = {
            lineCount: options.lineCount || 15,
            refreshRate: options.refreshRate || 37,
            keywords: options.keywords || [
                "Hello", "Weykon", "Here", "Blog",
                "weykon", "hello", "hello!!!",
                "Welcome", "welcome!", "Rust", "Axum"
            ],
            lineLength: options.lineLength || 50,
            minSpeed: options.minSpeed || 70,
            maxSpeed: options.maxSpeed || 130,
        };

        this.lines = [];
        this.directions = [];
        this.speeds = [];
        this.lastUpdateTimes = [];

        this.init();
    }

    generateRandomStringWithKeyword(length, keywords) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";

        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        const keyword = keywords[Math.floor(Math.random() * keywords.length)];
        const position = Math.floor(Math.random() * (result.length - keyword.length));
        result = result.substring(0, position) + keyword + result.substring(position + keyword.length);

        return result;
    }

    shiftString(str) {
        return str.substring(1) + str.charAt(0);
    }

    reverseString(str) {
        return str.split("").reverse().join("");
    }

    printStringWithKeywords(str, keywords) {
        let highlightedStr = str;
        keywords.forEach(keyword => {
            const regex = new RegExp(keyword, "gi");
            highlightedStr = highlightedStr.replace(
                regex,
                `<span class="matrix-keyword">${keyword}</span>`
            );
        });
        return highlightedStr;
    }

    updateLines() {
        const now = Date.now();
        this.lines.forEach((line, index) => {
            if (now - this.lastUpdateTimes[index] >= this.speeds[index]) {
                this.lines[index] = this.directions[index]
                    ? this.shiftString(line)
                    : this.reverseString(this.shiftString(this.reverseString(line)));
                this.lastUpdateTimes[index] = now;
            }
        });
    }

    renderLines() {
        this.container.innerHTML = this.lines
            .map(line => `<div class="matrix-line w-full">${this.printStringWithKeywords(line, this.config.keywords)}</div>`)
            .join("");
    }

    init() {
        // Initialize lines
        for (let i = 0; i < this.config.lineCount; i++) {
            this.lines.push(this.generateRandomStringWithKeyword(
                this.config.lineLength,
                this.config.keywords
            ));
            this.directions.push(Math.random() < 0.5);
            this.speeds.push(
                Math.random() * (this.config.maxSpeed - this.config.minSpeed) + this.config.minSpeed
            );
            this.lastUpdateTimes.push(Date.now());
        }

        // Start animation loop
        setInterval(() => {
            this.updateLines();
            this.renderLines();
        }, this.config.refreshRate);
    }

    // Method to stop animation if needed
    destroy() {
        if (this.animationId) {
            clearInterval(this.animationId);
        }
    }
}

// Export for module usage or make it globally available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MatrixRain;
} else {
    window.MatrixRain = MatrixRain;
}
