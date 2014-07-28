// Copyright (c) Microsoft Corporation
// All rights reserved. 
// BSD License
//
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
// following conditions are met:
//
// Redistributions of source code must retain the above copyright notice, this list of conditions and the following
// disclaimer.
//
// Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following
// disclaimer in the documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS ""AS IS"" AND ANY EXPRESS OR IMPLIED WARRANTIES,
// INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
// WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE

// Spring.js
// Defines the Seadragon2.Spring constructor.

/*global SD, SDMath_exp */
/*jshint strict: false */

/**
 * A class containing methods to calculate springy transforms.
 * @class Spring
 * @namespace Seadragon2
 * @constructor
 * @param {object} options (optional) Can contain any of:
 * <dl>
 * <dt>initialValue</dt><dd>number - starting spring value, default is 0</dd>
 * <dt>stiffness</dt><dd>springiness - positive number, 5 is default</dd>
 * <dt>animationTime</dt><dd>time (in seconds) to complete an animation, default 1.5</dd>
 * <dt>decayTime</dt><dd>time (in seconds) to come to rest when tossed, default 1</dd>
 * </dl>
 */
var SDSpring = SD.Spring = function (options) {
    options = options || {};
    
    // Fields
    
    var currentValue = options.initialValue || 0,
        stiffness = options.stiffness || 5,
        springDivisor = 1 - SDMath_exp(-stiffness),
        animationTime = options.animationTime || 1.5,
        decayTime = options.decayTime || 1,
        startValue = currentValue,
        targetValue = currentValue,
    
        currentTime = new Date().getTime(), // always work in milliseconds
        startTime = currentTime,
        targetTime = currentTime,
        
        velocity = 0,
        sliding = false,
        friction; // units of distance / (ms)^2
    
    // Helpers
    
    /*
     * Transform from linear [0,1] to spring [0,1].
     */
    function transform(x) {
        return (1.0 - SDMath_exp(-x * stiffness)) / springDivisor;
    }
    
    // Methods
    
    /**
     * Get the current value of this spring.
     * @method getCurrent
     * @return {number}
     */
    this.getCurrent = function () {
        return currentValue;
    };
    
    /**
     * Get the value toward which this spring is moving.
     * @method getTarget
     * @return {number}
     */
    this.getTarget = function () {
        return targetValue;
    };
    
    /**
     * Change the value of this spring immediately upon the next update.
     * @method resetTo
     * @param target {number}
     */
    this.resetTo = function (target) {
        sliding = false;
        targetValue = target;
        targetTime = currentTime;
        startValue = targetValue;
        startTime = targetTime;
    };
    
    /**
     * Animate this spring toward the given destination value.
     * @method springTo
     * @param target {number}
     */
    this.springTo = function (target) {
        sliding = false;
        startValue = currentValue;
        startTime = currentTime;
        targetValue = target;
        targetTime = startTime + 1000 * animationTime;
    };
    
    /**
     * Shift both the start and end points for the current transition by
     * the given amount.
     * @method shiftBy
     * @param delta {number}
     */
    this.shiftBy = function (delta) {
        startValue += delta;
        targetValue += delta;
    };
    
    /**
     * Allow the spring to begin sliding in its current direction. It will
     * come to rest after the specified decay time.
     * @method toss
     */
    this.toss = function () {
        friction = Math.abs(velocity / (1000 * decayTime));
        sliding = true;
    };
    
    /**
     * Make the spring start acting springy again, after being tossed.
     * It will no longer slide with momentum. It is usually not necessary
     * to call this method, because sliding will stop immediately any time
     * you call springTo or resetTo.
     * @method grab
     */
    this.grab = function () {
        sliding = false;
    };
    
    /**
     * Update the current position of the spring along the springy path between
     * its start point and its target point, or, if the spring is sliding, allow
     * it to continue in the same direction with deceleration. This method is the
     * only one that will directly modify the current value of the spring, so it
     * must be called periodically to move the spring.
     * @method update
     * @param now {number} (optional) The current time in milliseconds.
     * @return {bool} whether the spring is currently sliding.
     */
    this.update = function (now) {
        var lastTime = currentTime,
            lastValue = currentValue,
            timeChange,
            vWeight;
        currentTime = now || new Date().getTime();
        timeChange = currentTime - lastTime;
        if (sliding) {
            // apply frictional deceleration
            if (velocity > 0) {
                velocity -= friction * timeChange;
                if (velocity < 0) {
                    velocity = 0;
                }
            } else if (velocity < 0) {
                velocity += friction * timeChange;
                if (velocity > 0) {
                    velocity = 0;
                }
            }
            
            currentValue += velocity * timeChange;
            targetValue = currentValue;
        } else {
            currentValue = (currentTime >= targetTime) ? targetValue :
                startValue + (targetValue - startValue) *
                transform((currentTime - startTime) / (targetTime - startTime));

            // make a running average of recent velocity, weighting
            // more recent history more strongly.
            if (timeChange) {
                vWeight = SDMath_exp(-timeChange / 40); // TODO this constant should be configurable
                velocity = vWeight * velocity + (1 - vWeight) * (currentValue - lastValue) / timeChange;
            }
        }
        return sliding;
    };
    
};
