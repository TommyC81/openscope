import { extrapolate_range_clamp } from '../math/core';

/**
 * @property TIME_SECONDS_OFFSET
 * @type {number}
 * @final
 */
const TIME_SECONDS_OFFSET = 0.001;

/**
 * Singleton used to manage game time and the advancement of animation frames
 *
 * You will notice a large number of the class properties are private with exposed getters.
 * This is done to ensure that other classes are not able to modify the property values
 * of this class. TimeKeeping is an integral part of the app and must be able to keep accurate,
 * consistent time. Other classes can use these values but should never, directly, edit them.
 *
 * @class TimeKeeper
 */
class TimeKeeper {
    /**
     * @constructor
     */
    constructor() {
        /**
         * Timestamp for the start of rendering
         *
         * @property start
         * @type {number}
         * @private
         */
        this._start = this.gameTime;

        /**
         * Timestamp for the current frame
         *
         * @property _frameStartTime
         * @type {number}
         * @private
         */
        this._frameStartTime = this.gameTime;

        /**
         * Timestamp for the last frame
         *
         * @property _lastFrameTime
         * @type {number}
         */
        this._lastFrameTime = this.gameTime;

        /**
         * Nubmer of frames rendered
         *
         * @property frames
         * @type {number}
         * @default 0
         * @private
         */
        this._elapsedFrameCount = 0;

        /**
         * Difference in time between the `#lastFrame` and the current frame
         *
         * @property _frameDeltaTime
         * @type {number}
         * @default 0
         * @private
         */
        this._frameDeltaTime = 0;

        /**
         *
         *
         */
        this._accumulatedDeltaTime = 0;

        /**
         *
         *
         */
        this._timewarp = 1;

        /**
         *
         *
         */
        this._frameStep = 0;

        /**
         *
         *
         */
        this._isPaused = true;

        /**
         *
         *
         */
        this._futureTrackDeltaTimeCache = -1;
    }

    /**
     *
     *
     * @property accumulatedDeltaTime
     * @type {number}
     */
    get accumulatedDeltaTime() {
        return this._accumulatedDeltaTime;
    }

    /**
     * Current timestamp in seconds
     *
     * @property gameTime
     * @return {number}
     */
    get gameTime() {
        return (new Date()).getTime() * TIME_SECONDS_OFFSET;
    }

    /**
     * Current timestamp in milliseconds
     *
     * @property gameTimeMilliseconds
     * @return {number}
     */
    get gameTimeMilliseconds() {
        return this.gameTime * 1000;
    }

    /**
     * @property deltaTime
     * @return {number} current delta time in milliseconds
     */
    get deltaTime() {
        return Math.min(this._frameDeltaTime * this._timewarp, 100);
    }

    // TODO: move this to a method abstracted from the current use of this property
    get frames() {
        return this._elapsedFrameCount;
    }

    /**
     *
     *
     */
    get isPaused() {
        return this._isPaused;
    }

    /**
     *
     *
     * @property timewarp
     * @type {number}
     */
    get timewarp() {
        return this._timewarp;
    }

    /**
     * Reset model properties
     *
     * @for TimeKeeper
     * @method reset
     */
    reset() {
        const currentTime = this.gameTime;

        this._start = currentTime;
        this._frameStartTime = currentTime;
        this._lastFrameTime = currentTime;
        this._elapsedFrameCount = 0;
        this._frameDeltaTime = 0;
    }

    /**
     *
     *
     */
    getDeltaTimeForGameStateAndTimewarp() {
        // FIXME: ick!
        if (this.isPaused || this.deltaTime >= 1 && this._timewarp === 1 && this._futureTrackDeltaTimeCache === -1) {
            return 0;
        }

        return this.deltaTime;
    }

    /**
     *
     *
     * @for TimeKeeper
     * @method updateTimewarp
     * @param nextTimewarp {number}  the next value for #_timewarp
     */
    updateTimewarp(nextTimewarp) {
        this._timewarp = nextTimewarp;
    }

    /**
     *
     *
     */
    setDeltaTimeBeforeFutureTrackCalculation() {
        this._futureTrackDeltaTimeCache = this._frameDeltaTime;
        this._frameDeltaTime = 5;
    }

    /**
     *
     *
     */
    setDeltaTimeAfterFutureTrackCalculation() {
        this._frameDeltaTime = this._futureTrackDeltaTimeCache;
        this._futureTrackDeltaTimeCache = -1;
    }

    /**
     *
     *
     * @for TimeKeeper
     * @method shouldUpdate
     */
    shouldUpdate() {
        return this._elapsedFrameCount % this._frameStep === 0;
    }

    /**
     *
     *
     */
    togglePause() {
        this._isPaused = !this._isPaused;
    }

    /**
     *
     *
     * Should be called at the end of each update cycle by the `AppController`
     * Calling this method signifies the end of a frame
     *
     * @for TimeKeeper
     * @method update
     */
    update() {
        if (this._futureTrackDeltaTimeCache !== -1) {
            return;
        }

        const currentTime = this.gameTime;

        this._incrementFrame();
        this._calculateNextDeltaTime(currentTime);
        this._calculateFrameStep();
    }

    /**
     * Move to the next frame
     *
     * @for TimeKeeper
     * @method incrementFrame
     * @private
     */
    _incrementFrame() {
        this._elapsedFrameCount += 1;
    }

    /**
     * Caclulate the difference (delta) between the `#currentTime`
     * and `#_lastFrameTime`.
     *
     * This value will be used throughout to app to determine how
     * much time has passed, thus allowing us to know how much to
     * move elements.
     *
     * @for TimeKeeper
     * @method _calculateNextDelatTime
     * @param currentTime {Date}  current date string (in ms)
     * @private
     */
    _calculateNextDeltaTime(currentTime) {
        const frameDelay = 1;
        const elapsed = currentTime - this._frameStartTime;

        if (elapsed > frameDelay) {
            this._frameStartTime = currentTime;
        }

        this._frameDeltaTime = currentTime - this._lastFrameTime;
        this._lastFrameTime = currentTime;
        this._accumulatedDeltaTime += this.getDeltaTimeForGameStateAndTimewarp();
    }

    /**
     *
     *
     * @for CanvasController
     * @method _calculateFrameStep
     * @private
     */
    _calculateFrameStep() {
        // TODO: is this even correct? the order of range2 values looks backwards
        // FIXME: what do the magic numbers mean?
        this._frameStep = Math.round(extrapolate_range_clamp(1, this._timewarp, 10, 30, 1));
    }
}

export default new TimeKeeper();
