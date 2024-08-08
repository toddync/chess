"use strict";
(() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // src/ct.release/timer.ts
  var ctTimerTime = Symbol("time");
  var ctTimerRoomUid = Symbol("roomUid");
  var ctTimerTimeLeftOriginal = Symbol("timeLeftOriginal");
  var promiseResolve = Symbol("promiseResolve");
  var promiseReject = Symbol("promiseReject");
  ctTimerRoomUid, ctTimerTime, ctTimerTimeLeftOriginal, promiseResolve, promiseReject;
  var CtTimer = class {
    /**
     * An object for holding a timer
     *
     * @param timeMs The length of the timer, **in milliseconds**
     * @param [name=false] The name of the timer
     * @param [uiDelta=false] If `true`, it will use `ct.deltaUi` for counting time.
     * if `false`, it will use `ct.delta` for counting time.
     */
    constructor(timeMs, name, uiDelta = false) {
      this.rejected = false;
      this.done = false;
      this.settled = false;
      if (!rooms_default.current) {
        throw new Error("[CtTimer] Timers can only be created when a main room exists. If you need to run async tasks before ct.js game starts, use vanilla JS' setTimeout method.");
      }
      this[ctTimerRoomUid] = rooms_default.current.uid;
      this.name = name || "unnamed";
      this.isUi = uiDelta;
      this[ctTimerTime] = 0;
      this[ctTimerTimeLeftOriginal] = timeMs / 1e3;
      this.timeLeft = this[ctTimerTimeLeftOriginal];
      this.promise = new Promise((resolve, reject) => {
        this[promiseResolve] = resolve;
        this[promiseReject] = reject;
      });
      timerLib.timers.add(this);
    }
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     *
     * @param {Function} onfulfilled The callback to execute when the Promise is resolved.
     * @param {Function} [onrejected] The callback to execute when the Promise is rejected.
     * @returns {Promise} A Promise for the completion of which ever callback is executed.
     */
    then(arg) {
      return this.promise.then(arg);
    }
    /**
     * Attaches a callback for the rejection of the Promise.
     *
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    catch(onrejected) {
      return this.promise.catch(onrejected);
    }
    /**
     * The time passed on this timer, **in seconds**
     * @type {number}
     */
    get time() {
      return this[ctTimerTime];
    }
    set time(newTime) {
      this[ctTimerTime] = newTime;
    }
    /**
     * Updates the timer. **DONT CALL THIS UNLESS YOU KNOW WHAT YOU ARE DOING**
     *
     * @returns {void}
     * @private
     */
    update() {
      if (this.rejected === true || this.done === true) {
        this.remove();
        return;
      }
      this[ctTimerTime] += this.isUi ? u_default.timeUi : u_default.time;
      if (!rooms_default.current || rooms_default.current.uid !== this[ctTimerRoomUid] && this[ctTimerRoomUid] !== null) {
        this.reject({
          info: "Room has been switched",
          from: "timer"
        });
      }
      if (this.timeLeft !== 0) {
        this.timeLeft = this[ctTimerTimeLeftOriginal] - this.time;
        if (this.timeLeft <= 0) {
          this.resolve();
        }
      }
    }
    /**
     * Instantly triggers the timer and calls the callbacks added through `then` method.
     * @returns {void}
     */
    resolve() {
      if (this.settled) {
        return;
      }
      this.done = true;
      this.settled = true;
      this[promiseResolve]();
      this.remove();
    }
    /**
     * Stops the timer with a given message by rejecting a Promise object.
     * @param {any} message The value to pass to the `catch` callback
     * @returns {void}
     */
    reject(message) {
      if (this.settled) {
        return;
      }
      this.rejected = true;
      this.settled = true;
      this[promiseReject](message);
      this.remove();
    }
    /**
     * Removes the timer from ct.js game loop. This timer will not trigger.
     * @returns {void}
     */
    remove() {
      timerLib.timers.delete(this);
    }
  };
  var timerLib = {
    /**
     * A set with all the active timers.
     * @type Set<CtTimer>
     */
    timers: /* @__PURE__ */ new Set(),
    counter: 0,
    /**
     * Adds a new timer with a given name
     *
     * @param timeMs The length of the timer, **in milliseconds**
     * @param [name] The name of the timer, which you use
     * to access it from `ct.timer.timers`.
     * @returns {CtTimer} The timer
     */
    add(timeMs, name) {
      return new CtTimer(timeMs, name, false);
    },
    /**
     * Adds a new timer with a given name that runs in a UI time scale
     *
     * @param timeMs The length of the timer, **in milliseconds**
     * @param [name=false] The name of the timer, which you use
     * to access it from `ct.timer.timers`.
     * @returns The timer
     */
    addUi(timeMs, name) {
      return new CtTimer(timeMs, name, true);
    },
    /**
     * Updates the timers. **DONT CALL THIS UNLESS YOU KNOW WHAT YOU ARE DOING**
     *
     * @returns {void}
     * @private
     */
    updateTimers() {
      for (const timer of this.timers) {
        timer.update();
      }
    }
  };
  var timer_default = timerLib;

  // src/ct.release/sounds.ts
  var PannerFilter = class extends PIXI.sound.filters.Filter {
    constructor(refDistance, rolloffFactor) {
      const { audioContext } = PIXI.sound.context;
      const panner = audioContext.createPanner();
      panner.panningModel = "equalpower";
      panner.distanceModel = "inverse";
      panner.refDistance = refDistance;
      panner.rolloffFactor = rolloffFactor;
      const destination = panner;
      super(destination);
      this._panner = panner;
    }
    reposition(tracked) {
      if (tracked.kill) {
        return;
      }
      this._panner.positionX.value = tracked.x / camera.referenceLength;
      this._panner.positionY.value = tracked.y / camera.referenceLength;
    }
    destroy() {
      super.destroy();
      this._panner = null;
    }
  };
  var pannedSounds = /* @__PURE__ */ new Map();
  var exportedSounds = [
    []
  ][0] ?? [];
  var soundMap = {};
  for (const exportedSound of exportedSounds) {
    soundMap[exportedSound.name] = exportedSound;
  }
  var pixiSoundInstances = {};
  var fxNames = Object.keys(PIXI.sound.filters).filter((name) => name !== "Filter" && name !== "StreamFilter");
  var fxNamesToClasses = {};
  for (const fxName of fxNames) {
    fxNamesToClasses[fxName] = PIXI.sound.filters[fxName];
  }
  var pixiSoundPrefix = "pixiSound-";
  var randomRange = (min, max) => Math.random() * (max - min) + min;
  var withSound = (name, fn) => {
    const pixiFind = PIXI.sound.exists(name) && PIXI.sound.find(name);
    if (pixiFind) {
      return fn(pixiFind, name);
    }
    if (name in pixiSoundInstances) {
      return fn(pixiSoundInstances[name], name);
    }
    if (name in soundMap) {
      let lastVal;
      for (const variant of soundMap[name].variants) {
        const assetName = `${pixiSoundPrefix}${variant.uid}`;
        lastVal = fn(pixiSoundInstances[assetName], assetName);
      }
      return lastVal;
    }
    throw new Error(`[sounds] Sound "${name}" was not found. Is it a typo?`);
  };
  var playVariant = (sound, variant, options) => {
    const pixiSoundInst = PIXI.sound.find(`${pixiSoundPrefix}${variant.uid}`).play(options);
    if (sound.volume?.enabled) {
      pixiSoundInst.volume = randomRange(sound.volume.min, sound.volume.max) * (options?.volume || 1);
    } else if (options?.volume !== void 0) {
      pixiSoundInst.volume = options.volume;
    }
    if (sound.pitch?.enabled) {
      pixiSoundInst.speed = randomRange(sound.pitch.min, sound.pitch.max) * (options?.speed || 1);
    } else if (options?.speed !== void 0) {
      pixiSoundInst.speed = options.speed;
    }
    if (sound.distortion?.enabled) {
      soundsLib.addDistortion(
        pixiSoundInst,
        randomRange(sound.distortion.min, sound.distortion.max)
      );
    }
    if (sound.reverb?.enabled) {
      soundsLib.addReverb(
        pixiSoundInst,
        randomRange(sound.reverb.secondsMin, sound.reverb.secondsMax),
        randomRange(sound.reverb.decayMin, sound.reverb.decayMax),
        sound.reverb.reverse
      );
    }
    if (sound.eq?.enabled) {
      soundsLib.addEqualizer(
        pixiSoundInst,
        ...sound.eq.bands.map((band) => randomRange(band.min, band.max))
        // 🍝
      );
    }
    return pixiSoundInst;
  };
  var playRandomVariant = (sound, options) => {
    const variant = sound.variants[Math.floor(Math.random() * sound.variants.length)];
    return playVariant(sound, variant, options);
  };
  var soundsLib = {
    /**
     * Preloads a sound. This is usually applied to music files before playing
     * as they are not preloaded by default.
     *
     * @param {string} name The name of a sound
     * @returns {Promise<string>} A promise that resolves into the name of the loaded sound asset.
     */
    async load(name) {
      const promises = [];
      withSound(name, (soundRes, resName) => {
        const s = PIXI.sound.play(resName, {
          muted: true
        });
        if (s instanceof Promise) {
          promises.push(s);
          s.then((i) => {
            i.stop();
          });
        } else {
          s.stop();
        }
      });
      await Promise.all(promises);
      return name;
    },
    /**
     * Plays a sound.
     *
     * @param {string} name Sound's name
     * @catnipAsset name:sound
     * @param {PlayOptions} [options] Options used for sound playback.
     * @param {Function} options.complete When completed.
     * @param {number} options.end End time in seconds.
     * @param {filters.Filter[]} options.filters Filters that apply to play.
     * @param {Function} options.loaded If not already preloaded, callback when finishes load.
     * @param {boolean} options.loop Override default loop, default to the Sound's loop setting.
     * @param {boolean} options.muted If sound instance is muted by default.
     * @param {boolean} options.singleInstance Setting true will stop any playing instances.
     * @param {number} options.speed Override default speed, default to the Sound's speed setting.
     * @param {number} options.start Start time offset in seconds.
     * @param {number} options.volume Override default volume.
     * @returns Either a sound instance, or a promise that resolves into a sound instance.
     * @catnipIgnore It is defined in stdLib/sounds.ts.
     */
    play(name, options) {
      if (name in soundMap) {
        const exported = soundMap[name];
        return playRandomVariant(exported, options);
      }
      if (name in pixiSoundInstances) {
        return pixiSoundInstances[name].play(options);
      }
      throw new Error(`[sounds.play] Sound "${name}" was not found. Is it a typo?`);
    },
    /**
     * Plays a sound in 3D space.
     * @catnipIgnore It is defined in stdLib/sounds.ts.
     */
    playAt(name, position, options) {
      const sound = soundsLib.play(name, options);
      const { panning } = soundMap[name];
      if (sound instanceof Promise) {
        sound.then((instance) => {
          soundsLib.addPannerFilter(
            instance,
            position,
            panning.refDistance,
            panning.rolloffFactor
          );
        });
      } else {
        soundsLib.addPannerFilter(
          sound,
          position,
          panning.refDistance,
          panning.rolloffFactor
        );
      }
      return sound;
    },
    /**
     * Stops a sound if a name is specified, otherwise stops all sound.
     *
     * @param {string|IMediaInstance} [name] Sound's name, or the sound instance.
     * @catnipAsset name:sound
     *
     * @returns {void}
     */
    stop(name) {
      if (name) {
        if (typeof name === "string") {
          withSound(name, (sound) => sound.stop());
        } else {
          name.stop();
        }
      } else {
        PIXI.sound.stopAll();
      }
    },
    /**
     * Pauses a sound if a name is specified, otherwise pauses all sound.
     *
     * @param {string} [name] Sound's name
     * @catnipAsset name:sound
     *
     * @returns {void}
     */
    pause(name) {
      if (name) {
        withSound(name, (sound) => sound.pause());
      } else {
        PIXI.sound.pauseAll();
      }
    },
    /**
     * Resumes a sound if a name is specified, otherwise resumes all sound.
     *
     * @param {string} [name] Sound's name
     * @catnipAsset name:sound
     *
     * @returns {void}
     */
    resume(name) {
      if (name) {
        withSound(name, (sound) => sound.resume());
      } else {
        PIXI.sound.resumeAll();
      }
    },
    /**
     * Returns whether a sound with the specified name was added to the game.
     * This doesn't tell whether it is fully loaded or not, it only checks
     * for existance of sound's metadata in your game.
     *
     * @param {string} name Sound's name
     * @catnipAsset name:sound
     *
     * @returns {boolean}
     */
    exists(name) {
      return name in soundMap || name in pixiSoundInstances;
    },
    /**
     * Returns whether a sound is currently playing if a name is specified,
     * otherwise if any sound is currently playing.
     *
     * @param {string} [name] Sound's name
     * @catnipAsset name:sound
     *
     * @returns {boolean} `true` if the sound is playing, `false` otherwise.
     */
    playing(name) {
      if (!name) {
        return PIXI.sound.isPlaying();
      }
      if (name in pixiSoundInstances) {
        return pixiSoundInstances[name].isPlaying;
      } else if (name in soundMap) {
        for (const variant of soundMap[name].variants) {
          if (pixiSoundInstances[`${pixiSoundPrefix}${variant.uid}`].isPlaying) {
            return true;
          }
        }
      } else {
        throw new Error(`[sounds] Sound "${name}" was not found. Is it a typo?`);
      }
      return false;
    },
    /**
     * Get or set the volume for a sound.
     *
     * @param {string|IMediaInstance} name Sound's name or instance
     * @catnipAsset name:sound
     * @param {number} [volume] The new volume where 1 is 100%.
     * If empty, will return the existing volume.
     *
     * @returns {number} The current volume of the sound.
     * @catnipIgnore
     */
    volume(name, volume) {
      if (volume !== void 0) {
        if (typeof name === "string") {
          withSound(name, (sound) => {
            sound.volume = volume;
          });
        } else {
          name.volume = volume;
        }
      }
      if (typeof name === "string") {
        return withSound(name, (sound) => sound.volume);
      }
      return name.volume;
    },
    /**
     * Set the global volume for all sounds.
     * @param {number} value The new volume where 1 is 100%.
     */
    globalVolume(value) {
      PIXI.sound.volumeAll = value;
    },
    /**
     * Fades a sound to a given volume. Can affect either a specific instance or the whole group.
     *
     * @param [name] Sound's name or instance to affect. If null, all sounds are faded.
     * @catnipAsset name:sound
     * @param [newVolume] The new volume where 1 is 100%. Default is 0.
     * @param [duration] The duration of transition, in milliseconds. Default is 1000.
     */
    fade(name, newVolume = 0, duration = 1e3) {
      const start = {
        time: performance.now(),
        value: name ? soundsLib.volume(name) : PIXI.sound.context.volume
      };
      const updateVolume = (currentTime) => {
        const elapsed = currentTime - start.time;
        const progress = Math.min(elapsed / duration, 1);
        const value = start.value + (newVolume - start.value) * progress;
        if (name) {
          soundsLib.volume(name, value);
        } else {
          soundsLib.globalVolume(value);
        }
        if (progress < 1) {
          requestAnimationFrame(updateVolume);
        }
      };
      requestAnimationFrame(updateVolume);
    },
    /**
     * Adds a filter to the specified sound and remembers its constructor name.
     * This method is not intended to be called directly.
     *
     * @param sound If set to false, applies the filter globally.
     * If set to a string, applies the filter to the specified sound asset.
     * If set to a media instance or PIXI.Sound instance, applies the filter to it.
     * @catnipAsset sound:sound
     * @catnipSaveReturn
     */
    addFilter(sound, filter, filterName) {
      const fx = filter;
      fx.preserved = filterName;
      if (sound === false) {
        PIXI.sound.filtersAll = [...PIXI.sound.filtersAll || [], fx];
      } else if (typeof sound === "string") {
        withSound(sound, (soundInst) => {
          soundInst.filters = [...soundInst.filters || [], fx];
        });
      } else if (sound) {
        sound.filters = [...sound.filters || [], fx];
      } else {
        throw new Error(`[sounds.addFilter] Invalid sound: ${sound}`);
      }
    },
    /**
     * Adds a distortion filter.
     *
     * @param sound If set to false, applies the filter globally.
     * If set to a string, applies the filter to the specified sound asset.
     * If set to a media instance or PIXI.Sound instance, applies the filter to it.
     * @catnipAsset sound:sound
     * @param {number} amount The amount of distortion to set from 0 to 1. Default is 0.
     * @catnipSaveReturn
     */
    addDistortion(sound, amount) {
      const fx = new PIXI.sound.filters.DistortionFilter(amount);
      soundsLib.addFilter(sound, fx, "DistortionFilter");
      return fx;
    },
    /**
     * Adds an equalizer filter.
     *
     * @param sound If set to false, applies the filter globally.
     * If set to a string, applies the filter to the specified sound asset.
     * If set to a media instance or PIXI.Sound instance, applies the filter to it.
     * @catnipAsset sound:sound
     * @param {number} f32 Default gain for 32 Hz. Default is 0.
     * @param {number} f64 Default gain for 64 Hz. Default is 0.
     * @param {number} f125 Default gain for 125 Hz. Default is 0.
     * @param {number} f250 Default gain for 250 Hz. Default is 0.
     * @param {number} f500 Default gain for 500 Hz. Default is 0.
     * @param {number} f1k Default gain for 1000 Hz. Default is 0.
     * @param {number} f2k Default gain for 2000 Hz. Default is 0.
     * @param {number} f4k Default gain for 4000 Hz. Default is 0.
     * @param {number} f8k Default gain for 8000 Hz. Default is 0.
     * @param {number} f16k Default gain for 16000 Hz. Default is 0.
     * @catnipSaveReturn
     */
    /**
     * @catnipAsset sound:sound
    */
    // eslint-disable-next-line max-params
    addEqualizer(sound, f32, f64, f125, f250, f500, f1k, f2k, f4k, f8k, f16k) {
      const fx = new PIXI.sound.filters.EqualizerFilter(f32, f64, f125, f250, f500, f1k, f2k, f4k, f8k, f16k);
      soundsLib.addFilter(sound, fx, "EqualizerFilter");
      return fx;
    },
    /**
     * Combine all channels into mono channel.
     *
     * @param sound If set to false, applies the filter globally.
     * If set to a string, applies the filter to the specified sound asset.
     * If set to a media instance or PIXI.Sound instance, applies the filter to it.
     * @catnipAsset sound:sound
     * @catnipSaveReturn
     */
    addMonoFilter(sound) {
      const fx = new PIXI.sound.filters.MonoFilter();
      soundsLib.addFilter(sound, fx, "MonoFilter");
      return fx;
    },
    /**
     * Adds a reverb filter.
     *
     * @param sound If set to false, applies the filter globally.
     * If set to a string, applies the filter to the specified sound asset.
     * If set to a media instance or PIXI.Sound instance, applies the filter to it.
     * @catnipAsset sound:sound
     * @param {number} seconds Seconds for reverb. Default is 3.
     * @param {number} decay The decay length. Default is 2.
     * @param {boolean} reverse Reverse reverb. Default is false.
     * @catnipSaveReturn
     */
    addReverb(sound, seconds, decay, reverse) {
      const fx = new PIXI.sound.filters.ReverbFilter(seconds, decay, reverse);
      soundsLib.addFilter(sound, fx, "ReverbFilter");
      return fx;
    },
    /**
     * Adds a filter for stereo panning.
     *
     * @param sound If set to false, applies the filter globally.
     * If set to a string, applies the filter to the specified sound asset.
     * If set to a media instance or PIXI.Sound instance, applies the filter to it.
     * @catnipAsset sound:sound
     * @param {number} pan The amount of panning: -1 is left, 1 is right. Default is 0 (centered).
     * @catnipSaveReturn
     */
    addStereoFilter(sound, pan) {
      const fx = new PIXI.sound.filters.StereoFilter(pan);
      soundsLib.addFilter(sound, fx, "StereoFilter");
      return fx;
    },
    /**
     * Adds a 3D sound filter.
     * This filter can only be applied to sound instances.
     *
     * @param sound The sound to apply effect to.
     * @catnipAsset sound:sound
     * @param position Any object with x and y properties — for example, copies.
     * @catnipSaveReturn
     */
    addPannerFilter(sound, position, refDistance, rolloffFactor) {
      const fx = new PannerFilter(refDistance, rolloffFactor);
      soundsLib.addFilter(sound, fx, "PannerFilter");
      pannedSounds.set(position, fx);
      sound.on("end", () => {
        pannedSounds.delete(position);
      });
      return fx;
    },
    /**
     * Adds a telephone-sound filter.
     *
     * @param sound If set to false, applies the filter globally.
     * If set to a string, applies the filter to the specified sound asset.
     * If set to a media instance or PIXI.Sound instance, applies the filter to it.
     * @catnipAsset sound:sound
     * @catnipSaveReturn
     */
    addTelephone(sound) {
      const fx = new PIXI.sound.filters.TelephoneFilter();
      soundsLib.addFilter(sound, fx, "TelephoneFilter");
      return fx;
    },
    /**
     * Remove a filter to the specified sound.
     *
     * @param {string} [name] The sound to affect. Can be a name of the sound asset
     * or the specific sound instance you get from running `sounds.play`.
     * If set to false, it affects all sounds.
     * @catnipAsset name:sound
     * @param {string} [filter] The name of the filter. If omitted, all the filters are removed.
     *
     * @returns {void}
     */
    removeFilter(name, filter) {
      const setFilters = (newFilters) => {
        if (typeof name === "string") {
          withSound(name, (soundInst) => {
            soundInst.filters = newFilters;
          });
        } else {
          name.filters = newFilters;
        }
      };
      if (!name && !filter) {
        PIXI.sound.filtersAll = [];
        return;
      }
      if (name && !filter) {
        setFilters([]);
        return;
      }
      let filters;
      if (!name) {
        filters = PIXI.sound.filtersAll;
      } else {
        filters = typeof name === "string" ? withSound(name, (soundInst) => soundInst.filters) : name.filters;
      }
      if (filter && !filter.includes("Filter")) {
        filter += "Filter";
      }
      const copy = [...filters];
      filters.forEach((f, i) => {
        if (f.preserved === filter) {
          copy.splice(i, 1);
        }
      });
      if (!name) {
        PIXI.sound.filtersAll = copy;
      } else {
        setFilters(copy);
      }
    },
    /**
     * Set the speed (playback rate) of a sound.
     *
     * @param {string|IMediaInstance} name Sound's name or instance
     * @catnipAsset name:sound
     * @param {number} [value] The new speed, where 1 is 100%.
     * If empty, will return the existing speed value.
     *
     * @returns {number} The current speed of the sound.
     * @catnipIgnore
     */
    speed(name, value) {
      if (value) {
        if (typeof name === "string") {
          withSound(name, (sound) => {
            sound.speed = value;
          });
        } else {
          name.speed = value;
        }
        return value;
      }
      if (typeof name === "string") {
        if (name in soundMap) {
          return pixiSoundInstances[soundMap[name].variants[0].uid].speed;
        }
        if (name in pixiSoundInstances) {
          return pixiSoundInstances[name].speed;
        }
        throw new Error(`[sounds.speed] Invalid sound name: ${name}. Is it a typo?`);
      }
      return name.speed;
    },
    /**
     * Set the global speed (playback rate) for all sounds.
     * @param {number} value The new speed, where 1 is 100%.
     *
     */
    speedAll(value) {
      PIXI.sound.speedAll = value;
    },
    /**
    * Toggle muted property for all sounds.
    * @returns {boolean} `true` if all sounds are muted.
    */
    toggleMuteAll() {
      return PIXI.sound.toggleMuteAll();
    },
    /**
    * Toggle paused property for all sounds.
    * @returns {boolean} `true` if all sounds are paused.
    */
    togglePauseAll() {
      return PIXI.sound.togglePauseAll();
    }
  };
  var sounds_default = soundsLib;

  // src/ct.release/res.ts
  var loadingScreen = document.querySelector(".ct-aLoadingScreen");
  var loadingBar = loadingScreen.querySelector(".ct-aLoadingBar");
  var normalizeAssetPath = (path) => {
    path = path.replace(/\\/g, "/");
    if (path[0] === "/") {
      path = path.slice(1);
    }
    return path.split("/").filter((empty) => empty);
  };
  var getEntriesByPath = (nPath) => {
    if (!resLib.tree) {
      throw new Error("[res] Asset tree was not exported; check your project's export settings.");
    }
    let current = resLib.tree;
    for (const subpath of nPath) {
      const folder = current.find((i) => i.name === subpath && i.type === "folder");
      if (!folder) {
        throw new Error(`[res] Could not find folder ${subpath} in path ${nPath.join("/")}`);
      }
      current = folder.entries;
    }
    return current;
  };
  var resLib = {
    sounds: soundMap,
    pixiSounds: pixiSoundInstances,
    textures: {},
    tree: [
      false
    ][0],
    /**
     * Loads and executes a script by its URL
     * @param {string} url The URL of the script file, with its extension.
     * Can be relative or absolute.
     * @returns {Promise<void>}
     * @async
     */
    loadScript(url = required("url", "ct.res.loadScript")) {
      var script = document.createElement("script");
      script.src = url;
      const promise = new Promise((resolve, reject) => {
        script.onload = () => {
          resolve();
        };
        script.onerror = () => {
          reject();
        };
      });
      document.getElementsByTagName("head")[0].appendChild(script);
      return promise;
    },
    /**
     * Loads an individual image as a named ct.js texture.
     * @param {string|boolean} url The path to the source image.
     * @param {string} name The name of the resulting ct.js texture
     * as it will be used in your code.
     * @param {ITextureOptions} textureOptions Information about texture's axis
     * and collision shape.
     * @returns {Promise<CtjsAnimation>} The imported animation, ready to be used.
     */
    async loadTexture(url = required("url", "ct.res.loadTexture"), name = required("name", "ct.res.loadTexture"), textureOptions = {}) {
      let texture;
      try {
        texture = await PIXI.Assets.load(url);
      } catch (e) {
        console.error(`[ct.res] Could not load image ${url}`);
        throw e;
      }
      const ctTexture = [texture];
      ctTexture.shape = texture.shape = textureOptions.shape || {};
      texture.defaultAnchor = ctTexture.defaultAnchor = new PIXI.Point(
        textureOptions.anchor ? textureOptions.anchor.x : 0,
        textureOptions.anchor ? textureOptions.anchor.y : 0
      );
      const hitArea = u_default.getHitArea(texture.shape);
      if (hitArea) {
        texture.hitArea = ctTexture.hitArea = hitArea;
      }
      resLib.textures[name] = ctTexture;
      return ctTexture;
    },
    /**
     * Loads a Texture Packer compatible .json file with its source image,
     * adding ct.js textures to the game.
     * @param {string} url The path to the JSON file that describes the atlas' textures.
     * @returns A promise that resolves into an array
     * of all the loaded textures' names.
     */
    async loadAtlas(url = required("url", "ct.res.loadAtlas")) {
      const sheet = await PIXI.Assets.load(url);
      for (const animation in sheet.animations) {
        const tex = sheet.animations[animation];
        const animData = sheet.data.animations;
        for (let i = 0, l = animData[animation].length; i < l; i++) {
          const a = animData[animation], f = a[i];
          tex[i].shape = sheet.data.frames[f].shape;
        }
        tex.shape = tex[0].shape || {};
        resLib.textures[animation] = tex;
        const hitArea = u_default.getHitArea(resLib.textures[animation].shape);
        if (hitArea) {
          resLib.textures[animation].hitArea = hitArea;
          for (const frame of resLib.textures[animation]) {
            frame.hitArea = hitArea;
          }
        }
      }
      return Object.keys(sheet.animations);
    },
    /**
     * Unloads the specified atlas by its URL and removes all the textures
     * it has introduced to the game.
     * Will do nothing if the specified atlas was not loaded (or was already unloaded).
     */
    async unloadAtlas(url = required("url", "ct.res.unloadAtlas")) {
      const { animations } = PIXI.Assets.get(url);
      if (!animations) {
        console.log(`[ct.res] Attempt to unload an atlas that was not loaded/was unloaded already: ${url}`);
        return;
      }
      for (const animation of animations) {
        delete resLib.textures[animation];
      }
      await PIXI.Assets.unload(url);
    },
    /**
     * Loads a bitmap font by its XML file.
     * @param url The path to the XML file that describes the bitmap fonts.
     * @returns A promise that resolves into the font's name (the one you've passed with `name`).
     */
    async loadBitmapFont(url = required("url", "ct.res.loadBitmapFont")) {
      await PIXI.Assets.load(url);
    },
    async unloadBitmapFont(url = required("url", "ct.res.unloadBitmapFont")) {
      await PIXI.Assets.unload(url);
    },
    /**
     * Loads a sound.
     * @param path Path to the sound
     * @param name The name of the sound as it will be used in ct.js game.
     * @param preload Whether to start loading now or postpone it.
     * Postponed sounds will load when a game tries to play them, or when you manually
     * trigger the download with `sounds.load(name)`.
     * @returns A promise with the name of the imported sound.
     */
    loadSound(path = required("path", "ct.res.loadSound"), name = required("name", "ct.res.loadSound"), preload = true) {
      return new Promise((resolve, reject) => {
        const opts = {
          url: path,
          preload
        };
        if (preload) {
          opts.loaded = (err) => {
            if (err) {
              reject(err);
            } else {
              resLib.pixiSounds[name] = asset;
              resolve(name);
            }
          };
        }
        const asset = PIXI.sound.add(name, opts);
        if (!preload) {
          resolve(name);
        }
      });
    },
    async loadGame() {
      const changeProgress = (percents) => {
        loadingScreen.setAttribute("data-progress", String(percents));
        loadingBar.style.width = percents + "%";
      };
      const atlases = [
        ["./img/a0.{webp,png}.fdb7bc29c2.json"]
      ][0];
      const tiledImages = [
        {}
      ][0];
      const bitmapFonts = [
        []
      ][0];
      const totalAssets = atlases.length;
      let assetsLoaded = 0;
      const loadingPromises = [];
      loadingPromises.push(...atlases.map((atlas) => resLib.loadAtlas(atlas).then((texturesNames) => {
        assetsLoaded++;
        changeProgress(assetsLoaded / totalAssets * 100);
        return texturesNames;
      })));
      for (const name in tiledImages) {
        loadingPromises.push(resLib.loadTexture(
          tiledImages[name].source,
          name,
          {
            anchor: tiledImages[name].anchor,
            shape: tiledImages[name].shape
          }
        ));
      }
      for (const font in bitmapFonts) {
        loadingPromises.push(resLib.loadBitmapFont(bitmapFonts[font]));
      }
      for (const sound of exportedSounds) {
        for (const variant of sound.variants) {
          loadingPromises.push(resLib.loadSound(
            variant.source,
            `${pixiSoundPrefix}${variant.uid}`,
            sound.preload
          ));
        }
      }
      /*!@res@*/
      
      await Promise.all(loadingPromises);
      loadingScreen.classList.add("hidden");
    },
    /**
     * Gets a pixi.js texture from a ct.js' texture name,
     * so that it can be used in pixi.js objects.
     * @param name The name of the ct.js texture, or -1 for an empty texture
     * @catnipAsset name:texture
     * @param [frame] The frame to extract
     * @returns {PIXI.Texture|PIXI.Texture[]} If `frame` was specified,
     * returns a single PIXI.Texture. Otherwise, returns an array
     * with all the frames of this ct.js' texture.
     */
    getTexture: (name, frame) => {
      if (frame === null) {
        frame = void 0;
      }
      if (name === -1) {
        if (frame !== void 0) {
          return PIXI.Texture.EMPTY;
        }
        return [PIXI.Texture.EMPTY];
      }
      if (!(name in resLib.textures)) {
        throw new Error(`Attempt to get a non-existent texture ${name}`);
      }
      const tex = resLib.textures[name];
      if (frame !== void 0) {
        return tex[frame];
      }
      return tex;
    },
    /**
     * Returns the collision shape of the given texture.
     * @param name The name of the ct.js texture, or -1 for an empty collision shape
     * @catnipAsset name:texture
     */
    getTextureShape(name) {
      if (name === -1) {
        return {
          type: "point"
        };
      }
      if (!(name in resLib.textures)) {
        throw new Error(`Attempt to get a shape of a non-existent texture ${name}`);
      }
      return resLib.textures[name].shape;
    },
    /**
     * Gets direct children of a folder
     * @catnipIcon folder
     */
    getChildren(path) {
      return getEntriesByPath(normalizeAssetPath(path || "")).filter((entry) => entry.type !== "folder");
    },
    /**
     * Gets direct children of a folder, filtered by asset type
     * @catnipIcon folder
     */
    getOfType(type, path) {
      return getEntriesByPath(normalizeAssetPath(path || "")).filter((entry) => entry.type === type);
    },
    /**
     * Gets all the assets inside of a folder, including in subfolders.
     * @catnipIcon folder
     */
    getAll(path) {
      const folderEntries = getEntriesByPath(normalizeAssetPath(path || "")), entries = [];
      const walker = (currentList) => {
        for (const entry of currentList) {
          if (entry.type === "folder") {
            walker(entry.entries);
          } else {
            entries.push(entry);
          }
        }
      };
      walker(folderEntries);
      return entries;
    },
    /**
     * Get all the assets inside of a folder, including in subfolders, filtered by type.
     * @catnipIcon folder
     */
    getAllOfType(type, path) {
      const folderEntries = getEntriesByPath(normalizeAssetPath(path || "")), entries = [];
      const walker = (currentList) => {
        for (const entry of currentList) {
          if (entry.type === "folder") {
            walker(entry.entries);
          }
          if (entry.type === type) {
            entries.push(entry);
          }
        }
      };
      walker(folderEntries);
      return entries;
    }
  };
  if (document.fonts) { for (const font of document.fonts) { font.load(); }}
  var res_default = resLib;

  // src/ct.release/backgrounds.ts
  var bgList = {};
  var Background = class extends PIXI.TilingSprite {
    constructor(texName, frame = 0, depth = 0, exts = {
      movementX: 0,
      movementY: 0,
      parallaxX: 0,
      parallaxY: 0,
      repeat: "repeat",
      scaleX: 0,
      scaleY: 0,
      shiftX: 0,
      shiftY: 0
    }) {
      let { width, height } = camera_default;
      const texture = texName instanceof PIXI.Texture ? texName : res_default.getTexture(texName, frame || 0);
      if (exts.repeat === "no-repeat" || exts.repeat === "repeat-x") {
        height = texture.height * (exts.scaleY || 1);
      }
      if (exts.repeat === "no-repeat" || exts.repeat === "repeat-y") {
        width = texture.width * (exts.scaleX || 1);
      }
      super(texture, width, height);
      this.parallaxX = 1;
      this.parallaxY = 1;
      this.shiftX = 0;
      this.shiftY = 0;
      this.movementX = 0;
      this.movementY = 0;
      if (typeof texName === "string") {
        if (!bgList[texName]) {
          bgList[texName] = [];
        }
        bgList[texName].push(this);
      } else {
        if (!bgList.OTHER) {
          bgList.OTHER = [];
        }
        bgList.OTHER.push(this);
      }
      templates_default.list.BACKGROUND.push(this);
      stack.push(this);
      this.on("destroyed", () => {
        templates_default.list.BACKGROUND.splice(templates_default.list.BACKGROUND.indexOf(this), 1);
        stack.splice(stack.indexOf(this), 1);
      });
      this.zIndex = depth;
      this.anchor.set(0, 0);
      if (exts) {
        Object.assign(this, exts);
      }
      if (this.scaleX) {
        this.tileScale.x = Number(this.scaleX);
      }
      if (this.scaleY) {
        this.tileScale.y = Number(this.scaleY);
      }
      this.reposition();
    }
    onStep() {
      this.shiftX += u_default.time * this.movementX;
      this.shiftY += u_default.time * this.movementY;
    }
    /**
     * Updates the position of this background.
     */
    reposition() {
      const cameraBounds = this.isUi ? {
        x: 0,
        y: 0,
        width: camera_default.width,
        height: camera_default.height
      } : camera_default.getBoundingBox();
      const dx = camera_default.x - camera_default.width / 2, dy = camera_default.y - camera_default.height / 2;
      if (this.repeat !== "repeat-x" && this.repeat !== "no-repeat") {
        this.y = cameraBounds.y;
        this.tilePosition.y = -this.y - dy * (this.parallaxY - 1) + this.shiftY;
        this.height = cameraBounds.height + 1;
      } else {
        this.y = this.shiftY + cameraBounds.y * (this.parallaxY - 1);
      }
      if (this.repeat !== "repeat-y" && this.repeat !== "no-repeat") {
        this.x = cameraBounds.x;
        this.tilePosition.x = -this.x - dx * (this.parallaxX - 1) + this.shiftX;
        this.width = cameraBounds.width + 1;
      } else {
        this.x = this.shiftX + cameraBounds.x * (this.parallaxX - 1);
      }
    }
    onDraw() {
      this.reposition();
    }
    static onCreate() {
    }
    static onDestroy() {
    }
    get isUi() {
      return this.parent ? Boolean(this.parent.isUi) : false;
    }
  };
  var backgroundsLib = {
    /**
     * An object that contains all the backgrounds of the current room.
     * @type {Record<string, Background[]>}
     * @catnipList texture
     */
    list: bgList,
    /**
     * @param texName - Name of a texture to use as a background
     * @catnipAsset texName:texture
     * @param [frame] - The index of a frame to use. Defaults to 0
     * @param [depth] - The depth to place the background at. Defaults to 0
     * @param [container] - Where to put the background. Defaults to current room,
     * can be a room or other pixi container.
     * @returns {Background} The created background
     * @catnipSaveReturn
     */
    add(texName, frame = 0, depth = 0, container) {
      if (!rooms_default.current) {
        throw new Error("[backgrounds.add] Cannot add a background before the main room is created");
      }
      if (!container) {
        container = rooms_default.current;
      }
      if (!texName) {
        throw new Error("[backgrounds] The texName argument is required.");
      }
      const bg = new Background(texName, frame, depth);
      if (container instanceof Room) {
        container.backgrounds.push(bg);
      }
      container.addChild(bg);
      return bg;
    }
  };
  var backgrounds_default = backgroundsLib;

  // src/ct.release/tilemaps.ts
  var Tile = class extends PIXI.Sprite {
  };
  var TileChunk = class extends PIXI.Container {
    // pixi.js' Container is a jerk
  };
  var Tilemap = class extends PIXI.Container {
    /**
     * @param template A template object that contains data about depth
     * and tile placement. It is usually used by ct.IDE.
     */
    constructor(template) {
      super();
      this.pixiTiles = [];
      if (template) {
        this.zIndex = template.depth;
        this.tiles = template.tiles.map((tile) => ({
          ...tile
        }));
        if (template.extends) {
          Object.assign(this, template.extends);
        }
        for (let i = 0, l = template.tiles.length; i < l; i++) {
          const tile = template.tiles[i];
          const textures = res_default.getTexture(tile.texture);
          const sprite = new Tile(textures[tile.frame]);
          sprite.anchor.x = textures[0].defaultAnchor.x;
          sprite.anchor.y = textures[0].defaultAnchor.y;
          sprite.shape = textures.shape;
          sprite.scale.set(tile.scale.x, tile.scale.y);
          sprite.rotation = tile.rotation;
          sprite.alpha = tile.opacity;
          sprite.tint = tile.tint;
          sprite.x = tile.x;
          sprite.y = tile.y;
          this.addChild(sprite);
          this.pixiTiles.push(sprite);
          this.tiles[i].sprite = sprite;
        }
        if (template.cache) {
          this.cache();
        }
      } else {
        this.tiles = [];
      }
      templates_default.list.TILEMAP.push(this);
      this.on("destroyed", () => {
        templates_default.list.TILEMAP.splice(templates_default.list.TILEMAP.indexOf(this), 1);
      });
    }
    /**
     * Adds a tile to the tilemap. Will throw an error if a tilemap is cached.
     * @param textureName The name of the texture to use
     * @param x The horizontal location of the tile
     * @param y The vertical location of the tile
     * @param [frame] The frame to pick from the source texture. Defaults to 0.
     * @returns The created tile
     */
    addTile(textureName, x, y, frame = 0) {
      if (this.cached) {
        throw new Error("[ct.tiles] Adding tiles to cached tilemaps is forbidden. Create a new tilemap, or add tiles before caching the tilemap.");
      }
      const texture = res_default.getTexture(textureName, frame);
      const sprite = new Tile(texture);
      sprite.x = x;
      sprite.y = y;
      sprite.shape = texture.shape;
      this.tiles.push({
        texture: textureName,
        frame,
        x,
        y,
        width: sprite.width,
        height: sprite.height,
        sprite,
        opacity: 1,
        rotation: 1,
        scale: {
          x: 1,
          y: 1
        },
        tint: 16777215
      });
      this.addChild(sprite);
      this.pixiTiles.push(sprite);
      return sprite;
    }
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     */
    cache(chunkSize = 1024) {
      if (this.cached) {
        throw new Error("[ct.tiles] Attempt to cache an already cached tilemap.");
      }
      const bounds = this.getLocalBounds();
      const cols = Math.ceil(bounds.width / chunkSize), rows = Math.ceil(bounds.height / chunkSize);
      this.cells = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const cell = new TileChunk();
          this.cells.push(cell);
        }
      }
      for (let i = 0, l = this.tiles.length; i < l; i++) {
        const [tile] = this.children, x = Math.floor((tile.x - bounds.x) / chunkSize), y = Math.floor((tile.y - bounds.y) / chunkSize);
        this.cells[y * cols + x].addChild(tile);
      }
      this.removeChildren();
      for (let i = 0, l = this.cells.length; i < l; i++) {
        if (this.cells[i].children.length === 0) {
          this.cells.splice(i, 1);
          i--;
          l--;
          continue;
        }
        this.addChild(this.cells[i]);
        if (settings.pixelart) {
          this.cells[i].cacheAsBitmapResolution = 1;
        }
        this.cells[i].cacheAsBitmap = true;
      }
      this.cached = true;
    }
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     *
     * This version packs tiles into rhombus-shaped chunks, and sorts them
     * from top to bottom. This fixes seam issues for isometric games.
     */
    cacheDiamond(chunkSize = 1024) {
      if (this.cached) {
        throw new Error("[ct.tiles] Attempt to cache an already cached tilemap.");
      }
      this.cells = [];
      this.diamondCellMap = {};
      for (let i = 0, l = this.tiles.length; i < l; i++) {
        const [tile] = this.children;
        const { x: xNormalized, y: yNormalized } = u_default.rotate(tile.x, tile.y * 2, -45);
        const x = Math.floor(xNormalized / chunkSize), y = Math.floor(yNormalized / chunkSize), key = `${x}:${y}`;
        if (!(key in this.diamondCellMap)) {
          const chunk = new TileChunk();
          chunk.chunkX = x;
          chunk.chunkY = y;
          this.diamondCellMap[key] = chunk;
          this.cells.push(chunk);
        }
        this.diamondCellMap[key].addChild(tile);
      }
      this.removeChildren();
      this.cells.sort((a, b) => {
        const maxA = Math.max(a.chunkY, a.chunkX), maxB = Math.max(b.chunkY, b.chunkX);
        if (maxA === maxB) {
          return b.chunkX - a.chunkX;
        }
        return maxA - maxB;
      });
      for (let i = 0, l = this.cells.length; i < l; i++) {
        this.addChild(this.cells[i]);
        this.cells[i].cacheAsBitmap = true;
      }
      this.cached = true;
    }
  };
  var tilemapsLib = {
    /**
     * Creates a new tilemap at a specified depth, and adds it to the main room (ct.room).
     * @param [depth] The depth of a newly created tilemap. Defaults to 0.
     * @returns {Tilemap} The created tilemap.
     */
    create(depth = 0) {
      if (!rooms_default.current) {
        throw new Error("[emitters.fire] An attempt to create a tilemap before the main room is created.");
      }
      const tilemap = new Tilemap();
      tilemap.zIndex = depth;
      rooms_default.current.addChild(tilemap);
      return tilemap;
    },
    /**
     * Adds a tile to the specified tilemap. It is the same as
     * calling `tilemap.addTile(textureName, x, y, frame).
     * @param tilemap The tilemap to modify.
     * @param textureName The name of the texture to use.
     * @catnipAsset textureName:texture
     * @param x The horizontal location of the tile.
     * @param y The vertical location of the tile.
     * @param frame The frame to pick from the source texture. Defaults to 0.
     * @returns {PIXI.Sprite} The created tile
     */
    addTile(tilemap, textureName, x, y, frame = 0) {
      return tilemap.addTile(textureName, x, y, frame);
    },
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     *
     * This is the same as calling `tilemap.cache();`
     *
     * @param tilemap The tilemap which needs to be cached.
     * @param chunkSize The size of one chunk.
     */
    cache(tilemap, chunkSize) {
      tilemap.cache(chunkSize);
    },
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     *
     * This version packs tiles into rhombus-shaped chunks, and sorts them
     * from top to bottom. This fixes seam issues for isometric games.
     * Note that tiles should be placed on a flat plane for the proper sorting.
     * If you need an effect of elevation, consider shifting each tile with
     * tile.pivot.y property.
     *
     * This is the same as calling `tilemap.cacheDiamond();`
     *
     * @param tilemap The tilemap which needs to be cached.
     * @param chunkSize The size of one chunk.
     */
    cacheDiamond(tilemap, chunkSize) {
      tilemap.cacheDiamond(chunkSize);
    }
  };
  var tilemaps_default = tilemapsLib;

  // src/ct.release/behaviors.ts
  var behaviorsLib = {
    /**
     * @catnipIgnore
     */
    templates: [
      {}
    ][0],
    /**
     * @catnipIgnore
     */
    rooms: [
      {}
    ][0],
    /**
     * Adds a behavior to the given room or template.
     * Only dynamic behaviors can be added.
     * (Static behaviors are marked with a frozen (❄️) sign in UI.)
     * @param target The room or template to which the behavior should be added.
     * @param behavior The name of the behavior to be added, as it was named in ct.IDE.
     * @catnipAsset behavior:behavior
     */
    add(target, behavior) {
      if (target.behaviors.includes(behavior)) {
        throw new Error(`[behaviors.add] Behavior ${behavior} already exists on ${target instanceof Room ? target.name : target.template}`);
      }
      const domain = target instanceof Room ? "rooms" : "templates";
      const bh = behaviorsLib[domain][behavior];
      if (bh === "static") {
        throw new Error(`[behaviors.add] Behavior ${behavior} cannot be added to ${target instanceof Room ? target.name : target.template} because this behavior cannot be added dynamically.`);
      }
      if (!bh) {
        throw new Error(`[behaviors.add] Behavior ${behavior} does not exist or cannot be applied to ${domain}.`);
      }
      target.behaviors.push(behavior);
      if (bh.thisOnAdded) {
        bh.thisOnAdded.apply(target);
      }
    },
    /**
     * Removes a behavior from the given room or template.
     * Only dynamic behaviors can be removed.
     * (Static behaviors are marked with a frozen (❄️) sign in UI.)
     * @param target The room or template from which the behavior should be removed.
     * @param behavior The name of the behavior to be removed, as it was named in ct.IDE.
     * @catnipAsset behavior:behavior
     */
    remove(target, behavior) {
      if (!target.behaviors.includes(behavior)) {
        throw new Error(`[behaviors.remove] Behavior ${behavior} already exists on ${target instanceof Room ? target.name : target.template}`);
      }
      const domain = target instanceof Room ? "rooms" : "templates";
      const bh = behaviorsLib[domain][behavior];
      if (bh === "static") {
        throw new Error(`[behaviors.remove] Behavior ${behavior} cannot be removed from ${target instanceof Room ? target.name : target.template} because this behavior cannot be removed dynamically.`);
      }
      if (!bh) {
        throw new Error(`[behaviors.remove] Behavior ${behavior} does not exist or cannot be applied to ${domain}.`);
      }
      if (bh.thisOnRemoved) {
        bh.thisOnRemoved.apply(target);
      }
      target.behaviors.splice(target.behaviors.indexOf(behavior), 1);
    },
    /**
     * Tells whether the specified object has a behavior applied to it.
     * @param target A room or a copy to test against.
     * @param behavior The behavior to look for.
     * @catnipAsset behavior:behavior
     */
    has(target, behavior) {
      return target.behaviors.includes(behavior);
    }
  };
  var runBehaviors = (target, domain, kind) => {
    for (const bh of target.behaviors) {
      const fn = behaviorsLib[domain][bh];
      if (fn === "static" || !fn) {
        continue;
      }
      fn[kind]?.apply(target);
    }
  };
  var behaviors_default = behaviorsLib;

  // src/ct.release/styles.ts
  var stylesLib = {
    /**
     * @catnipIgnore
     */
    types: {},
    /**
     * Creates a new style with a given name.
     * Technically, it just writes `data` to `styles.types`
     * @catnipIgnore
     */
    new(name, styleTemplate) {
      stylesLib.types[name] = styleTemplate;
      return styleTemplate;
    },
    /**
     * Returns a style of a given name. The actual behavior strongly depends on `copy` parameter.
     * @param name The name of the style to load
     * @catnipAsset name:style
     * @param [copy] If not set, returns the source style object.
     * Editing it will affect all new style calls.
     * When set to `true`, will create a new object, which you can safely modify
     * without affecting the source style.
     * When set to an object, this will create a new object as well,
     * augmenting it with given properties.
     * @returns {object} The resulting style
     */
    get(name, copy) {
      if (copy === true) {
        return Object.assign({}, stylesLib.types[name]);
      }
      if (copy) {
        return Object.assign(Object.assign({}, stylesLib.types[name]), copy);
      }
      return stylesLib.types[name];
    }
  };
  var styles_default = stylesLib;

  // src/ct.release/templateBaseClasses/PixiButton.ts
  var PixiButton = class extends PIXI.Container {
    #disabled;
    get disabled() {
      return this.#disabled;
    }
    set disabled(val) {
      this.#disabled = val;
      if (val) {
        this.panel.texture = this.disabledTexture;
        this.eventMode = "none";
      } else {
        this.panel.texture = this.normalTexture;
        this.eventMode = "dynamic";
      }
    }
    get text() {
      return this.textLabel.text;
    }
    set text(val) {
      this.textLabel.text = val;
    }
    /**
     * The color of the button's texture.
     */
    get tint() {
      return this.panel.tint;
    }
    set tint(val) {
      this.panel.tint = val;
    }
    constructor(t, exts) {
      if (t?.baseClass !== "Button") {
        throw new Error("Don't call PixiButton class directly! Use templates.copy to create an instance instead.");
      }
      super();
      this.normalTexture = res_default.getTexture(t.texture, 0);
      this.hoverTexture = t.hoverTexture ? res_default.getTexture(t.hoverTexture, 0) : this.normalTexture;
      this.pressedTexture = t.pressedTexture ? res_default.getTexture(t.pressedTexture, 0) : this.normalTexture;
      this.disabledTexture = t.disabledTexture ? res_default.getTexture(t.disabledTexture, 0) : this.normalTexture;
      this.panel = new PIXI.NineSlicePlane(
        this.normalTexture,
        t.nineSliceSettings?.left ?? 16,
        t.nineSliceSettings?.top ?? 16,
        t.nineSliceSettings?.right ?? 16,
        t.nineSliceSettings?.bottom ?? 16
      );
      const style = t.textStyle === -1 ? PIXI.TextStyle.defaultStyle : styles_default.get(t.textStyle, true);
      if (exts.customSize) {
        style.fontSize = Number(exts.customSize);
      }
      if (t.useBitmapText) {
        this.textLabel = new PIXI.BitmapText(exts.customText || t.defaultText || "", {
          ...style,
          fontSize: Number(style.fontSize),
          fontName: style.fontFamily.split(",")[0].trim()
        });
        this.textLabel.tint = new PIXI.Color(style.fill);
      } else {
        this.textLabel = new PIXI.Text(exts.customText || t.defaultText || "", style);
      }
      this.textLabel.anchor.set(0.5);
      this.addChild(this.panel, this.textLabel);
      this.eventMode = "dynamic";
      this.cursor = "pointer";
      this.on("pointerenter", this.hover);
      this.on("pointerentercapture", this.hover);
      this.on("pointerleave", this.blur);
      this.on("pointerleavecapture", this.blur);
      this.on("pointerdown", this.press);
      this.on("pointerdowncapture", this.press);
      this.on("pointerup", this.hover);
      this.on("pointerupcapture", this.hover);
      this.on("pointerupoutside", this.blur);
      this.on("pointerupoutsidecapture", this.blur);
      this.updateNineSliceShape = t.nineSliceSettings.autoUpdate;
      let baseWidth = this.panel.width, baseHeight = this.panel.height;
      if ("scaleX" in exts) {
        baseWidth *= exts.scaleX;
      }
      if ("scaleY" in exts) {
        baseHeight *= exts.scaleY;
      }
      this.resize(baseWidth, baseHeight);
      u_default.reshapeNinePatch(this);
    }
    unsize() {
      const { x, y } = this.scale;
      this.panel.scale.x *= x;
      this.panel.scale.y *= y;
      this.scale.set(1);
      this.textLabel.x = this.panel.width / 2;
      this.textLabel.y = this.panel.height / 2;
    }
    resize(newWidth, newHeight) {
      this.panel.width = newWidth;
      this.panel.height = newHeight;
      this.textLabel.x = newWidth / 2;
      this.textLabel.y = newHeight / 2;
    }
    hover() {
      if (this.disabled) {
        return;
      }
      this.panel.texture = this.hoverTexture;
    }
    blur() {
      if (this.disabled) {
        return;
      }
      this.panel.texture = this.normalTexture;
    }
    press() {
      if (this.disabled) {
        return;
      }
      this.panel.texture = this.pressedTexture;
    }
  };

  // src/ct.release/templateBaseClasses/PixiSpritedCounter.ts
  var PixiSpritedCounter = class extends PIXI.TilingSprite {
    #count;
    #baseWidth;
    #baseHeight;
    /**
     * Amount of sprites to show.
     */
    get count() {
      return this.#count;
    }
    set count(val) {
      this.#count = val;
      this.width = this.#count * this.#baseWidth * this.scale.x;
      this.height = this.#baseHeight * this.scale.y;
      this.tileScale.set(this.scale.x, this.scale.y);
      this.shape = {
        type: "rect",
        left: 0,
        top: 0,
        right: this.#baseWidth * this.#count,
        bottom: this.#baseHeight
      };
    }
    constructor(t, exts) {
      if (t.baseClass !== "SpritedCounter") {
        throw new Error("Don't call PixiScrollingTexture class directly! Use templates.copy to create an instance instead.");
      }
      const tex = res_default.getTexture(t.texture, 0);
      super(tex, tex.width, tex.height);
      this.#baseWidth = this.width;
      this.#baseHeight = this.height;
      this.anchor.set(0);
      if ("scaleX" in exts) {
        this.scale.x = exts.scaleX ?? 1;
      }
      if ("scaleY" in exts) {
        this.scale.y = exts.scaleY ?? 1;
      }
      this.count = t.spriteCount;
    }
  };

  // src/ct.release/templateBaseClasses/PixiScrollingTexture.ts
  var PixiScrollingTexture = class extends PIXI.TilingSprite {
    #baseWidth;
    #baseHeight;
    constructor(t, exts) {
      if (t.baseClass !== "RepeatingTexture") {
        throw new Error("Don't call PixiScrollingTexture class directly! Use templates.copy to create an instance instead.");
      }
      const tex = res_default.getTexture(t.texture, 0);
      super(tex, tex.width, tex.height);
      this.#baseWidth = this.width;
      this.#baseHeight = this.height;
      this.anchor.set(0);
      this.scrollSpeedX = t.scrollX;
      this.scrollSpeedY = t.scrollY;
      if ("scaleX" in exts) {
        this.width = this.#baseWidth * (exts.scaleX ?? 1);
      }
      if ("scaleY" in exts) {
        this.height = this.#baseHeight * (exts.scaleY ?? 1);
      }
      this.on("added", () => {
        rooms_default.current.tickerSet.add(this);
      });
      this.on("removed", () => {
        rooms_default.current.tickerSet.delete(this);
      });
      this.shape = {
        type: "rect",
        left: 0,
        top: 0,
        right: this.width,
        bottom: this.height
      };
    }
    tick() {
      if (this.isUi) {
        this.tilePosition.x += this.scrollSpeedX * u_default.timeUi;
        this.tilePosition.y += this.scrollSpeedY * u_default.timeUi;
      } else {
        this.tilePosition.x += this.scrollSpeedX * u_default.time;
        this.tilePosition.y += this.scrollSpeedY * u_default.time;
      }
    }
  };

  // src/ct.release/templateBaseClasses/PixiTextBox.ts
  var cssStyle = document.createElement("style");
  document.head.appendChild(cssStyle);
  var PixiTextBox = class extends PIXI.Container {
    // eslint-disable-next-line max-lines-per-function, complexity
    constructor(t, exts) {
      if (t?.baseClass !== "TextBox") {
        throw new Error("Don't call PixiTextBox class directly! Use templates.copy to create an instance instead.");
      }
      super();
      // eslint-disable-next-line no-empty-function, class-methods-use-this
      this.onchange = () => {
      };
      // eslint-disable-next-line no-empty-function, class-methods-use-this
      this.oninput = () => {
      };
      this.#pointerUp = (e) => {
        if (e.target !== this) {
          this.blur();
        }
      };
      this.#submitHandler = (e) => {
        if (e.key === "Enter" && this.#focused) {
          this.#setFocused(false);
          e.preventDefault();
        }
      };
      this.#repositionRestyleInput = () => {
        const { isUi } = this.getRoom();
        const x1 = this.x, y1 = this.y, x2 = this.x + this.width, y2 = this.y + this.height;
        const scalar = isUi ? u_default.uiToCssScalar : u_default.gameToCssScalar, coord = isUi ? u_default.uiToCssCoord : u_default.gameToCssCoord;
        const lt = coord(x1, y1), br = coord(x2, y2);
        const textStyle = this.style;
        Object.assign(this.#htmlInput.style, {
          fontFamily: textStyle.fontFamily,
          fontSize: scalar(textStyle.fontSize) + "px",
          left: lt.x + "px",
          top: lt.y + "px",
          width: br.x - lt.x + "px",
          height: br.y - lt.y + "px",
          lineHeight: br.y - lt.y + "px",
          color: Array.isArray(textStyle.fill) ? textStyle.fill[0] : textStyle.fill
        });
        if (textStyle.strokeThickness) {
          this.#htmlInput.style.textStroke = `${scalar(textStyle.strokeThickness / 2)}px ${textStyle.stroke}`;
          this.#htmlInput.style.webkitTextStroke = this.#htmlInput.style.textStroke;
        } else {
          this.#htmlInput.style.textStroke = this.#htmlInput.style.webkitTextStroke = "unset";
        }
        if ("dropShadow" in textStyle) {
          const angle = u_default.radToDeg(textStyle.dropShadowAngle ?? 0);
          let x = u_default.ldx(textStyle.dropShadowDistance ?? 0, angle), y = u_default.ldy(textStyle.dropShadowDistance ?? 0, angle);
          x = scalar(x);
          y = scalar(y);
          const css = `${x}px ${y}px ${scalar(textStyle.dropShadowBlur ?? 0)}px ${textStyle.dropShadowColor}`;
          this.#htmlInput.style.textShadow = `${css}, ${css}`;
        }
        if (this.selectionColor) {
          cssStyle.innerHTML = `
                ::selection {
                    background: ${this.selectionColor};
                }
            `;
        } else {
          cssStyle.innerHTML = "";
        }
      };
      forceDestroy.add(this);
      this.normalTexture = res_default.getTexture(t.texture, 0);
      this.hoverTexture = t.hoverTexture ? res_default.getTexture(t.hoverTexture, 0) : this.normalTexture;
      this.pressedTexture = t.pressedTexture ? res_default.getTexture(t.pressedTexture, 0) : this.normalTexture;
      this.disabledTexture = t.disabledTexture ? res_default.getTexture(t.disabledTexture, 0) : this.normalTexture;
      this.panel = new PIXI.NineSlicePlane(
        this.normalTexture,
        t.nineSliceSettings?.left ?? 16,
        t.nineSliceSettings?.top ?? 16,
        t.nineSliceSettings?.right ?? 16,
        t.nineSliceSettings?.bottom ?? 16
      );
      this.maxLength = t.maxTextLength ?? 0;
      this.fieldType = t.fieldType ?? "text";
      const style = t.textStyle === -1 ? PIXI.TextStyle.defaultStyle : styles_default.get(t.textStyle, true);
      if (exts.customSize) {
        style.fontSize = Number(exts.customSize);
      }
      let text = exts.customText || t.defaultText || "";
      this.#text = text;
      if (this.fieldType === "password") {
        text = "\u2022".repeat(text.length);
      }
      this.style = {
        ...style,
        fontSize: Number(style.fontSize),
        fontName: style.fontFamily.split(",")[0].trim()
      };
      if (t.useBitmapText) {
        this.textLabel = new PIXI.BitmapText(exts.customText || t.defaultText || "", this.style);
        this.textLabel.tint = new PIXI.Color(style.fill);
      } else {
        this.textLabel = new PIXI.Text(exts.customText || t.defaultText || "", this.style);
      }
      this.textLabel.anchor.set(0.5);
      this.addChild(this.panel, this.textLabel);
      if (t.selectionColor) {
        this.selectionColor = t.selectionColor;
      }
      this.eventMode = "dynamic";
      this.cursor = "pointer";
      this.on("pointerenter", this.hover);
      this.on("pointerentercapture", this.hover);
      this.on("pointerleave", this.unhover);
      this.on("pointerleavecapture", this.unhover);
      this.on("pointerdown", this.press);
      this.on("pointerdowncapture", this.press);
      this.on("pointerup", this.hover);
      this.on("pointerupcapture", this.hover);
      this.on("pointerupoutside", this.unhover);
      this.on("pointerupoutsidecapture", this.unhover);
      this.updateNineSliceShape = t.nineSliceSettings.autoUpdate;
      let baseWidth = this.panel.width, baseHeight = this.panel.height;
      if ("scaleX" in exts) {
        baseWidth *= exts.scaleX;
      }
      if ("scaleY" in exts) {
        baseHeight *= exts.scaleY;
      }
      this.resize(baseWidth, baseHeight);
      u_default.reshapeNinePatch(this);
      this.#disabled = false;
      this.#focused = false;
      this.#htmlInput = document.createElement("input");
      this.#htmlInput.type = "text";
      this.#htmlInput.className = "aCtJsTextboxInput";
      this.#htmlInput.addEventListener("click", (e) => {
        e.stopPropagation();
      });
      this.#htmlInput.addEventListener("pointerup", (e) => {
        e.stopPropagation();
      });
      this.#htmlInput.addEventListener("input", () => {
        this.oninput(this.#htmlInput.value);
      });
      this.#htmlInput.addEventListener("blur", () => {
        this.#setFocused(false);
      });
      this.on("pointerup", () => {
        this.#setFocused(true);
      });
    }
    #disabled;
    get disabled() {
      return this.#disabled;
    }
    set disabled(val) {
      this.#disabled = val;
      if (val) {
        this.panel.texture = this.disabledTexture;
        this.eventMode = "none";
      } else {
        this.panel.texture = this.normalTexture;
        this.eventMode = "auto";
      }
    }
    #focused;
    #prevPreventDefault;
    get isFocused() {
      return this.#focused;
    }
    #setFocused(val) {
      if (val === this.#focused) {
        return;
      }
      this.#focused = val;
      if (val) {
        if (this.#disabled) {
          this.#focused = false;
          return;
        }
        setFocusedElement(this);
        this.panel.texture = this.pressedTexture ?? this.hoverTexture ?? this.normalTexture;
        this.#repositionRestyleInput();
        if (this.maxLength > 0) {
          this.#htmlInput.maxLength = this.maxLength;
        } else {
          this.#htmlInput.maxLength = 524288;
        }
        this.#htmlInput.type = this.fieldType || "text";
        this.#htmlInput.value = this.text;
        document.body.appendChild(this.#htmlInput);
        this.#htmlInput.focus();
        this.textLabel.alpha = 0;
        try {
          this.#prevPreventDefault = settings.preventDefault;
          settings.preventDefault = false;
        } catch (oO) {
        }
        document.addEventListener("keydown", this.#submitHandler);
        window.addEventListener("resize", this.#repositionRestyleInput);
        pixiApp.stage.off("pointerup", this.#pointerUp);
      } else {
        this.panel.texture = this.normalTexture;
        this.text = this.#htmlInput.value;
        document.body.removeChild(this.#htmlInput);
        this.textLabel.alpha = 1;
        try {
          settings.preventDefault = this.#prevPreventDefault;
        } catch (oO) {
        }
        this.onchange(this.text);
        document.removeEventListener("keydown", this.#submitHandler);
        window.removeEventListener("resize", this.#repositionRestyleInput);
        pixiApp.stage.on("pointerup", this.#pointerUp);
      }
    }
    blur() {
      this.#setFocused(false);
    }
    focus() {
      this.#setFocused(true);
    }
    #htmlInput;
    #pointerUp;
    #submitHandler;
    #repositionRestyleInput;
    #text;
    get text() {
      return this.#text;
    }
    set text(val) {
      this.#text = val;
      if (this.fieldType === "password") {
        this.textLabel.text = "\u2022".repeat(val.length);
      } else {
        this.textLabel.text = val;
      }
    }
    destroy(options) {
      forceDestroy.delete(this);
      if (this.#focused) {
        this.#setFocused(false);
      }
      super.destroy(options);
    }
    unsize() {
      const { x, y } = this.scale;
      this.panel.scale.x *= x;
      this.panel.scale.y *= y;
      this.scale.set(1);
      this.textLabel.x = this.panel.width / 2;
      this.textLabel.y = this.panel.height / 2;
    }
    resize(newWidth, newHeight) {
      this.panel.width = newWidth;
      this.panel.height = newHeight;
      this.textLabel.x = newWidth / 2;
      this.textLabel.y = newHeight / 2;
    }
    hover() {
      if (this.disabled) {
        return;
      }
      this.panel.texture = this.hoverTexture;
    }
    unhover() {
      if (this.disabled) {
        return;
      }
      this.panel.texture = this.normalTexture;
    }
    press() {
      if (this.disabled) {
        return;
      }
      this.panel.texture = this.pressedTexture;
    }
  };

  // src/ct.release/templateBaseClasses/PixiNineSlicePlane.ts
  var PixiPanel = class extends PIXI.NineSlicePlane {
    constructor(t, exts) {
      if (t?.baseClass !== "NineSlicePlane") {
        throw new Error("Don't call PixiPanel class directly! Use templates.copy to create an instance instead.");
      }
      const tex = res_default.getTexture(t.texture, 0);
      super(
        tex,
        t.nineSliceSettings?.left ?? 16,
        t.nineSliceSettings?.top ?? 16,
        t.nineSliceSettings?.right ?? 16,
        t.nineSliceSettings?.bottom ?? 16
      );
      this.baseClass = "NineSlicePlane";
      this.updateNineSliceShape = t.nineSliceSettings.autoUpdate;
      const baseWidth = this.width, baseHeight = this.height;
      if ("scaleX" in exts) {
        this.width = baseWidth * exts.scaleX;
      }
      if ("scaleY" in exts) {
        this.height = baseHeight * exts.scaleY;
      }
      u_default.reshapeNinePatch(this);
      this.blendMode = t.blendMode || PIXI.BLEND_MODES.NORMAL;
    }
  };

  // src/ct.release/templateBaseClasses/PixiText.ts
  var PixiText = class extends PIXI.Text {
    constructor(t, exts) {
      if (t?.baseClass !== "Text") {
        throw new Error("Don't call PixiText class directly! Use templates.copy to create an instance instead.");
      }
      let style;
      if (t.textStyle && t.textStyle !== -1) {
        style = styles_default.get(t.textStyle, true);
      } else {
        style = {};
      }
      if (exts.customWordWrap) {
        style.wordWrap = true;
        style.wordWrapWidth = Number(exts.customWordWrap);
      }
      if (exts.customSize) {
        style.fontSize = Number(exts.customSize);
      }
      super(
        exts.customText || t.defaultText || "",
        style
      );
      if (exts.customAnchor) {
        const anchor = exts.customAnchor;
        this.anchor.set(anchor?.x ?? 0, anchor?.y ?? 0);
      }
      this.shape = u_default.getRectShape(this);
      this.scale.set(
        exts.scaleX ?? 1,
        exts.scaleY ?? 1
      );
      return this;
    }
  };

  // src/ct.release/templateBaseClasses/PixiBitmapText.ts
  var PixiBitmapText = class extends PIXI.BitmapText {
    constructor(t, exts) {
      if (t?.baseClass !== "BitmapText") {
        throw new Error("Don't call PixiBitmapText class directly! Use templates.copy to create an instance instead.");
      }
      let style;
      if (t.textStyle && t.textStyle !== -1) {
        style = styles_default.get(t.textStyle, true);
      } else {
        style = {};
      }
      if (exts.customWordWrap) {
        style.wordWrap = true;
        style.wordWrapWidth = Number(exts.customWordWrap);
      }
      if (exts.customSize) {
        style.fontSize = Number(exts.customSize);
      }
      super(
        exts.customText || t.defaultText || "",
        {
          ...style,
          fontName: style.fontFamily.split(",")[0].trim(),
          tint: new PIXI.Color(style.fill)
        }
      );
      this.tint = new PIXI.Color(style.fill);
      if (exts.customAnchor) {
        const anchor = exts.customAnchor;
        this.anchor.set(anchor?.x ?? 0, anchor?.y ?? 0);
      }
      this.shape = u_default.getRectShape(this);
      this.scale.set(
        exts.scaleX ?? 1,
        exts.scaleY ?? 1
      );
      return this;
    }
  };

  // src/ct.release/templateBaseClasses/PixiContainer.ts
  var PixiContainer = class extends PIXI.Container {
    constructor() {
      super();
      this.shape = {
        type: "point"
      };
      return this;
    }
  };

  // src/ct.release/templateBaseClasses/PixiAnimatedSprite.ts
  var PixiAnimateSprite = class extends PIXI.AnimatedSprite {
    constructor(t, exts) {
      if (t?.baseClass !== "AnimatedSprite") {
        throw new Error("Don't call PixiButton class directly! Use templates.copy to create an instance instead.");
      }
      const textures = res_default.getTexture(t.texture);
      super(textures);
      this.anchor.x = t.anchorX ?? textures[0].defaultAnchor.x ?? 0;
      this.anchor.y = t.anchorY ?? textures[0].defaultAnchor.y ?? 0;
      this.scale.set(
        exts.scaleX ?? 1,
        exts.scaleY ?? 1
      );
      this.blendMode = t.blendMode || PIXI.BLEND_MODES.NORMAL;
      this.loop = t.loopAnimation;
      this.animationSpeed = t.animationFPS / 60;
      if (t.playAnimationOnStart) {
        this.play();
      }
      return this;
    }
  };

  // src/ct.release/templateBaseClasses/index.ts
  var baseClassToPixiClass = {
    AnimatedSprite: PixiAnimateSprite,
    Button: PixiButton,
    Container: PixiContainer,
    NineSlicePlane: PixiPanel,
    RepeatingTexture: PixiScrollingTexture,
    // ScrollBox: PixiScrollBox,
    SpritedCounter: PixiSpritedCounter,
    Text: PixiText,
    BitmapText: PixiBitmapText,
    TextBox: PixiTextBox
  };

  // src/ct.release/templates.ts
  var uid = 0;
  var focusedElement;
  var blurFocusedElement = () => {
    focusedElement.blur();
  };
  var setFocusedElement = (elt) => {
    if (focusedElement && focusedElement !== elt) {
      blurFocusedElement();
    }
    focusedElement = elt;
  };
  var CopyProto = {
    set tex(value) {
      if (this._tex === value) {
        return;
      }
      var { playing } = this;
      this.textures = res_default.getTexture(value);
      [this.texture] = this.textures;
      this._tex = value;
      this.shape = res_default.getTextureShape(value);
      this.hitArea = this.textures.hitArea;
      if (this.anchor) {
        this.anchor.x = this.textures[0].defaultAnchor.x;
        this.anchor.y = this.textures[0].defaultAnchor.y;
        if (playing) {
          this.play();
        }
      }
      if ("_bottomHeight" in this) {
        u_default.reshapeNinePatch(this);
      }
    },
    get tex() {
      return this._tex;
    },
    get speed() {
      return Math.hypot(this.hspeed, this.vspeed);
    },
    set speed(value) {
      if (value === 0) {
        this._zeroDirection = this.direction;
        this.hspeed = this.vspeed = 0;
        return;
      }
      if (this.speed === 0) {
        const restoredDir = this._zeroDirection;
        this._hspeed = value * Math.cos(restoredDir * Math.PI / 180);
        this._vspeed = value * Math.sin(restoredDir * Math.PI / 180);
        return;
      }
      var multiplier = value / this.speed;
      this.hspeed *= multiplier;
      this.vspeed *= multiplier;
    },
    get hspeed() {
      return this._hspeed;
    },
    set hspeed(value) {
      if (this.vspeed === 0 && value === 0) {
        this._zeroDirection = this.direction;
      }
      this._hspeed = value;
    },
    get vspeed() {
      return this._vspeed;
    },
    set vspeed(value) {
      if (this.hspeed === 0 && value === 0) {
        this._zeroDirection = this.direction;
      }
      this._vspeed = value;
    },
    get direction() {
      if (this.speed === 0) {
        return this._zeroDirection;
      }
      return (Math.atan2(this.vspeed, this.hspeed) * 180 / Math.PI + 360) % 360;
    },
    set direction(value) {
      this._zeroDirection = value;
      if (this.speed > 0) {
        var { speed } = this;
        this.hspeed = speed * Math.cos(value * Math.PI / 180);
        this.vspeed = speed * Math.sin(value * Math.PI / 180);
      }
    },
    move() {
      if (this.gravity) {
        this.hspeed += this.gravity * u_default.time * Math.cos(this.gravityDir * Math.PI / 180);
        this.vspeed += this.gravity * u_default.time * Math.sin(this.gravityDir * Math.PI / 180);
      }
      this.x += this.hspeed * u_default.time;
      this.y += this.vspeed * u_default.time;
    },
    addSpeed(spd, dir) {
      this.hspeed += spd * Math.cos(dir * Math.PI / 180);
      this.vspeed += spd * Math.sin(dir * Math.PI / 180);
    },
    getRoom() {
      let { parent } = this;
      while (!(parent instanceof Room)) {
        ({ parent } = parent);
      }
      return parent;
    },
    onBeforeCreateModifier() {
      
      /*!@onbeforecreate@*/
    }
  };
  var assignExtends = (target, exts) => {
    let { tint } = target;
    if (exts.tint || exts.tint === 0) {
      tint = new PIXI.Color(target.tint).multiply(exts.tint).toNumber();
    }
    Object.assign(target, exts);
    target.tint = tint;
  };
  var Copy = function(x, y, template, container, exts) {
    container = container || rooms_default.current;
    this[copyTypeSymbol] = true;
    if (template) {
      this.baseClass = template.baseClass;
      this.parent = container;
      if (template.baseClass === "AnimatedSprite" || template.baseClass === "NineSlicePlane") {
        this._tex = template.texture || -1;
      }
      this.behaviors = [...template.behaviors];
      if (template.visible === false) {
        this.visible = false;
      }
    } else {
      this.behaviors = [];
    }
    const oldScale = this.scale;
    Object.defineProperty(this, "scale", {
      get: () => oldScale,
      set: (value) => {
        this.scale.x = this.scale.y = Number(value);
      }
    });
    this[copyTypeSymbol] = true;
    this.xprev = this.xstart = this.x = x;
    this.yprev = this.ystart = this.y = y;
    this._hspeed = 0;
    this._vspeed = 0;
    this._zeroDirection = 0;
    this.gravity = 0;
    this.gravityDir = 90;
    this.zIndex = 0;
    this.timer1 = this.timer2 = this.timer3 = this.timer4 = this.timer5 = this.timer6 = 0;
    this.uid = ++uid;
    if (template) {
      Object.assign(this, {
        template: template.name,
        zIndex: template.depth,
        onStep: template.onStep,
        onDraw: template.onDraw,
        onBeforeCreateModifier: CopyProto.onBeforeCreateModifier,
        onCreate: template.onCreate,
        onDestroy: template.onDestroy
      });
      this.zIndex = template.depth;
      Object.assign(this, template.extends);
      if (exts) {
        assignExtends(this, exts);
      }
      if ("texture" in template && !this.shape) {
        this.shape = res_default.getTextureShape(template.texture || -1);
        if (typeof template.texture === "string") {
          this.hitArea = res_default.getTexture(template.texture).hitArea;
        }
      }
      if (templatesLib.list[template.name]) {
        templatesLib.list[template.name].push(this);
      } else {
        templatesLib.list[template.name] = [this];
      }
      this.onBeforeCreateModifier.apply(this);
      templatesLib.templates[template.name].onCreate.apply(this);
      onCreateModifier.apply(this);
    } else if (exts) {
      assignExtends(this, exts);
      this.onBeforeCreateModifier.apply(this);
      onCreateModifier.apply(this);
    }
    if (!this.shape) {
      this.shape = res_default.getTextureShape(-1);
    }
    if (this.behaviors.length) {
      runBehaviors(this, "templates", "thisOnCreate");
    }
    return this;
  };
  var mix = (target, x, y, template, parent, exts) => {
    const proto = CopyProto;
    const properties = Object.getOwnPropertyNames(proto);
    for (const i in properties) {
      if (properties[i] !== "constructor") {
        Object.defineProperty(
          target,
          properties[i],
          Object.getOwnPropertyDescriptor(proto, properties[i])
        );
      }
    }
    Copy.apply(target, [x, y, template, parent, exts]);
  };
  var makeCopy = (template, x, y, parent, exts) => {
    if (!(template in templatesLib.templates)) {
      throw new Error(`[ct.templates] An attempt to create a copy of a non-existent template \`${template}\` detected. A typo?`);
    }
    const t = templatesLib.templates[template];
    if (!(t.baseClass in baseClassToPixiClass)) {
      throw new Error(`[internal -> makeCopy] Unknown base class \`${t.baseClass}\` for template \`${template}\`.`);
    }
    const copy = new baseClassToPixiClass[t.baseClass](t, exts);
    mix(copy, x, y, t, parent, exts);
    return copy;
  };
  var onCreateModifier = function() {
    this.$chashes = place.getHashes(this);
for (const hash of this.$chashes) {
    if (!(hash in place.grid)) {
        place.grid[hash] = [this];
    } else {
        place.grid[hash].push(this);
    }
}
if ([false][0] && templates.isCopy(this)) {
    this.$cDebugText = new PIXI.Text('Not initialized', {
        fill: 0xffffff,
        dropShadow: true,
        dropShadowDistance: 2,
        fontSize: [][0] || 16
    });
    this.$cDebugCollision = new PIXI.Graphics();
    this.addChild(this.$cDebugCollision, this.$cDebugText);
}

  };
  var templatesLib = {
    /**
     * @catnipIgnore
     */
    CopyProto,
    /**
     * @catnipIgnore
     */
    Background,
    /**
     * @catnipIgnore
     */
    Tilemap,
    /**
     * An object that contains arrays of copies of all templates.
     * @catnipList template
     */
    list: {
      BACKGROUND: [],
      TILEMAP: []
    },
    /**
     * A map of all the templates of templates exported from ct.IDE.
     * @catnipIgnore
     */
    templates: {},
    /**
     * Creates a new copy of a given template inside the current root room.
     * A shorthand for `templates.copyIntoRoom(template, x, y, rooms.current, exts)`
     * @param template The name of the template to use
     * @catnipAsset template:template
     * @param [x] The x coordinate of a new copy. Defaults to 0.
     * @param [y] The y coordinate of a new copy. Defaults to 0.
     * @param [params] An optional object which parameters will be applied
     * to the copy prior to its OnCreate event.
     * @returns The created copy.
     * @catnipSaveReturn
     * @catnipIgnore
     */
    copy(template, x = 0, y = 0, params = {}) {
      if (!rooms_default.current) {
        throw new Error("[emitters.fire] An attempt to create a copy before the main room is created.");
      }
      return templatesLib.copyIntoRoom(template, x, y, rooms_default.current, params);
    },
    /**
     * Creates a new copy of a given template inside a specific room.
     * @param template The name of the template to use
     * @catnipAsset template:template
     * @param [x] The x coordinate of a new copy. Defaults to 0.
     * @param [y] The y coordinate of a new copy. Defaults to 0.
     * @param [room] The room to which add the copy.
     * Defaults to the current room.
     * @param [params] An optional object which parameters will be applied
     * to the copy prior to its OnCreate event.
     * @returns The created copy.
     * @catnipSaveReturn
     * @catnipIgnore
     */
    // eslint-disable-next-line max-len
    copyIntoRoom(template, x = 0, y = 0, room, params = {}) {
      if (!room || !(room instanceof Room)) {
        throw new Error(`Attempt to spawn a copy of template ${template} inside an invalid room. Room's value provided: ${room}`);
      }
      const obj = makeCopy(template, x, y, room, params);
      room.addChild(obj);
      stack.push(obj);
      return obj;
    },
    /**
     * Applies a function to each copy in the current room
     * @param {Function} func The function to apply
     * @catnipIcon crosshair
     * @returns {void}
     */
    each(func) {
      for (const copy of stack) {
        if (!copy[copyTypeSymbol]) {
          continue;
        }
        func.call(copy, copy);
      }
    },
    /**
     * Applies a function to a given object (e.g. to a copy)
     * @param {Copy} obj The copy to perform function upon.
     * @param {Function} function The function to be applied.
     * @catnipIcon crosshair
     */
    withCopy(obj, func) {
      func.apply(obj, this);
    },
    /**
     * Applies a function to every copy of the given template name
     * @param {string} template The name of the template to perform function upon.
     * @catnipAsset template:template
     * @param {Function} function The function to be applied.
     * @catnipIcon crosshair
     */
    withTemplate(template, func) {
      for (const copy of templatesLib.list[template]) {
        func.apply(copy, this);
      }
    },
    /**
     * Checks whether there are any copies of this template's name.
     * Will throw an error if you pass an invalid template name.
     * @param {string} template The name of a template to check.
     * @catnipAsset template:template
     * @returns {boolean} Returns `true` if at least one copy exists in a room;
     * `false` otherwise.
     */
    exists(template) {
      if (!(template in templatesLib.templates)) {
        throw new Error(`[ct.templates] templates.exists: There is no such template ${template}.`);
      }
      return templatesLib.list[template].length > 0;
    },
    /**
     * Checks whether a given object is a ct.js copy.
     * @param {any} obj The object which needs to be checked.
     * @returns {boolean} Returns `true` if the passed object is a copy; `false` otherwise.
     * @catnipIgnore
     */
    isCopy: (obj) => obj && obj[copyTypeSymbol],
    /**
     * Checks whether a given object exists in game's world.
     * Intended to be applied to copies, but may be used with other PIXI entities.
     * @catnipIgnore
     */
    valid: (obj) => {
      if (typeof obj !== "object" || obj === null) {
        return false;
      }
      if (copyTypeSymbol in obj) {
        return !obj.kill;
      }
      if (obj instanceof PIXI.DisplayObject) {
        return Boolean(obj.position);
      }
      return false;
    },
    /**
     * @catnipIgnore
     */
    beforeStep() {
      
    },
    /**
     * @catnipIgnore
     */
    afterStep() {
      
      if (this.behaviors.length) {
        runBehaviors(this, "templates", "thisOnStep");
      }
    },
    /**
     * @catnipIgnore
     */
    beforeDraw() {
      if ([false][0] && templates.isCopy(this)) {
    const inverse = this.transform.localTransform.clone().invert();
    this.$cDebugCollision.transform.setFromMatrix(inverse);
    this.$cDebugCollision.position.set(0, 0);
    this.$cDebugText.transform.setFromMatrix(inverse);
    this.$cDebugText.position.set(0, 0);

    const newtext = `Partitions: ${this.$chashes.join(', ')}
CGroup: ${this.cgroup || 'unset'}
Shape: ${(this._shape && this._shape.__type) || 'unused'}`;
    if (this.$cDebugText.text !== newtext) {
        this.$cDebugText.text = newtext;
    }
    this.$cDebugCollision
    .clear();
    place.drawDebugGraphic.apply(this);
    this.$cHadCollision = false;
}

    },
    /**
     * @catnipIgnore
     */
    afterDraw() {
      if (this.behaviors.length) {
        runBehaviors(this, "templates", "thisOnDraw");
      }
      if (this.baseClass === "Button" && (this.scale.x !== 1 || this.scale.y !== 1)) {
        this.unsize();
      }
      if (this.updateNineSliceShape) {
        if (this.prevWidth !== this.width || this.prevHeight !== this.height) {
          this.prevWidth = this.width;
          this.prevHeight = this.height;
          u_default.reshapeNinePatch(this);
        }
      }
      /* eslint-disable no-underscore-dangle */
if ((this.transform && (this.transform._localID !== this.transform._currentLocalID)) ||
    this.x !== this.xprev ||
    this.y !== this.yprev
) {
    delete this._shape;
    const oldHashes = this.$chashes || [];
    this.$chashes = place.getHashes(this);
    for (const hash of oldHashes) {
        if (this.$chashes.indexOf(hash) === -1) {
            place.grid[hash].splice(place.grid[hash].indexOf(this), 1);
        }
    }
    for (const hash of this.$chashes) {
        if (oldHashes.indexOf(hash) === -1) {
            if (!(hash in place.grid)) {
                place.grid[hash] = [this];
            } else {
                place.grid[hash].push(this);
            }
        }
    }
}

    },
    /**
     * @catnipIgnore
     */
    onDestroy() {
      if (this.$chashes) {
    for (const hash of this.$chashes) {
        place.grid[hash].splice(place.grid[hash].indexOf(this), 1);
    }
}

      if (this.behaviors.length) {
        runBehaviors(this, "templates", "thisOnDestroy");
      }
    }
  };
  var templates_default = templatesLib;

  // src/ct.release/camera.ts
  var shakeCamera = function shakeCamera2(camera2, time) {
    camera2.shake -= time * camera2.shakeDecay;
    camera2.shake = Math.max(0, camera2.shake);
    if (camera2.shakeMax) {
      camera2.shake = Math.min(camera2.shake, camera2.shakeMax);
    }
    const phaseDelta = time * camera2.shakeFrequency;
    camera2.shakePhase += phaseDelta;
    camera2.shakePhaseX += phaseDelta * (1 + Math.sin(camera2.shakePhase * 0.1489) * 0.25);
    camera2.shakePhaseY += phaseDelta * (1 + Math.sin(camera2.shakePhase * 0.1734) * 0.25);
  };
  var followCamera = function followCamera2(camera2) {
    const bx = camera2.borderX === null ? camera2.width / 2 : Math.min(camera2.borderX, camera2.width / 2), by = camera2.borderY === null ? camera2.height / 2 : Math.min(camera2.borderY, camera2.height / 2);
    const tl = camera2.uiToGameCoord(bx, by), br = camera2.uiToGameCoord(camera2.width - bx, camera2.height - by);
    if (!camera2.follow) {
      return;
    }
    if (camera2.followX) {
      if (camera2.follow.x < tl.x - camera2.interpolatedShiftX) {
        camera2.targetX = camera2.follow.x - bx + camera2.width / 2;
      } else if (camera2.follow.x > br.x - camera2.interpolatedShiftX) {
        camera2.targetX = camera2.follow.x + bx - camera2.width / 2;
      }
    }
    if (camera2.followY) {
      if (camera2.follow.y < tl.y - camera2.interpolatedShiftY) {
        camera2.targetY = camera2.follow.y - by + camera2.height / 2;
      } else if (camera2.follow.y > br.y - camera2.interpolatedShiftY) {
        camera2.targetY = camera2.follow.y + by - camera2.height / 2;
      }
    }
  };
  var restrictInRect = function restrictInRect2(camera2) {
    if (camera2.minX !== void 0) {
      const boundary = camera2.minX + camera2.width * camera2.scale.x * 0.5;
      camera2.x = Math.max(boundary, camera2.x);
      camera2.targetX = Math.max(boundary, camera2.targetX);
    }
    if (camera2.maxX !== void 0) {
      const boundary = camera2.maxX - camera2.width * camera2.scale.x * 0.5;
      camera2.x = Math.min(boundary, camera2.x);
      camera2.targetX = Math.min(boundary, camera2.targetX);
    }
    if (camera2.minY !== void 0) {
      const boundary = camera2.minY + camera2.height * camera2.scale.y * 0.5;
      camera2.y = Math.max(boundary, camera2.y);
      camera2.targetY = Math.max(boundary, camera2.targetY);
    }
    if (camera2.maxY !== void 0) {
      const boundary = camera2.maxY - camera2.height * camera2.scale.y * 0.5;
      camera2.y = Math.min(boundary, camera2.y);
      camera2.targetY = Math.min(boundary, camera2.targetY);
    }
  };
  var Camera = class extends PIXI.DisplayObject {
    constructor(x, y, w, h) {
      super();
      // Same story
      this.sortDirty = false;
      this.reset(x, y, w, h);
      this.getBounds = this.getBoundingBox;
    }
    #width;
    #height;
    reset(x, y, w, h) {
      this.followX = this.followY = true;
      this.follow = void 0;
      this.targetX = this.x = x;
      this.targetY = this.y = y;
      this.z = 500;
      this.#width = w || 1920;
      this.#height = h || 1080;
      this.referenceLength = Math.max(this.#width, this.#height) / 2;
      this.shiftX = this.shiftY = this.interpolatedShiftX = this.interpolatedShiftY = 0;
      this.borderX = this.borderY = null;
      this.minX = this.maxX = this.minY = this.maxY = void 0;
      this.drift = 0;
      this.shake = 0;
      this.shakeDecay = 5;
      this.shakeX = this.shakeY = 1;
      this.shakeFrequency = 50;
      this.shakePhase = this.shakePhaseX = this.shakePhaseY = 0;
      this.shakeMax = 10;
    }
    get width() {
      return this.#width;
    }
    set width(value) {
      this.#width = value;
    }
    get height() {
      return this.#height;
    }
    set height(value) {
      this.#height = value;
    }
    get scale() {
      return this.transform.scale;
    }
    set scale(value) {
      if (typeof value === "number") {
        this.transform.scale.x = this.transform.scale.y = value;
      } else {
        this.transform.scale.copyFrom(value);
      }
    }
    // Dummying unneeded methods that need implementation in non-abstract classes of DisplayObject
    render() {
    }
    // Can't have children as it is not a container
    removeChild() {
    }
    calculateBounds() {
    }
    /**
     * Moves the camera to a new position. It will have a smooth transition
     * if a `drift` parameter is set.
     * @param x New x coordinate
     * @param y New y coordinate
     */
    moveTo(x, y) {
      this.targetX = x;
      this.targetY = y;
    }
    /**
     * Moves the camera to a new position. Ignores the `drift` value.
     * @param x New x coordinate
     * @param y New y coordinate
     */
    teleportTo(x, y) {
      this.targetX = this.x = x;
      this.targetY = this.y = y;
      this.shakePhase = this.shakePhaseX = this.shakePhaseY = 0;
      this.interpolatedShiftX = this.shiftX;
      this.interpolatedShiftY = this.shiftY;
    }
    /**
     * Updates the position of the camera
     * @param time Time between the last two frames, in seconds.
     * This is usually `u.time`.
     */
    update(time) {
      shakeCamera(this, time);
      if (this.follow && copyTypeSymbol in this.follow && this.follow.kill) {
        this.follow = false;
      }
      if (!this.follow && rooms_default.current.follow) {
        [this.follow] = templates_default.list[rooms_default.current.follow];
      }
      if (this.follow && "x" in this.follow && "y" in this.follow) {
        followCamera(this);
      }
      const speed = this.drift ? Math.min(1, (1 - this.drift) * time * 60) : 1;
      this.x = this.targetX * speed + this.x * (1 - speed);
      this.y = this.targetY * speed + this.y * (1 - speed);
      this.interpolatedShiftX = this.shiftX * speed + this.interpolatedShiftX * (1 - speed);
      this.interpolatedShiftY = this.shiftY * speed + this.interpolatedShiftY * (1 - speed);
      restrictInRect(this);
      this.x = this.x || 0;
      this.y = this.y || 0;
      const { listener } = PIXI.sound.context.audioContext;
      if ("positionX" in listener) {
        listener.positionX.value = this.x / this.referenceLength;
        listener.positionY.value = this.y / this.referenceLength;
        listener.positionZ.value = this.scale.x;
      } else {
        listener.setPosition(
          this.x / this.referenceLength,
          this.y / this.referenceLength,
          this.scale.x
        );
      }
      pannedSounds.forEach((filter, pos) => filter.reposition(pos));
    }
    /**
     * Returns the current camera position plus the screen shake effect.
     * @readonly
     */
    get computedX() {
      const dx = (Math.sin(this.shakePhaseX) + Math.sin(this.shakePhaseX * 3.1846) * 0.25) / 1.25;
      const x = this.x + dx * this.shake * Math.max(this.width, this.height) / 100 * this.shakeX;
      return x + this.interpolatedShiftX;
    }
    /**
     * Returns the current camera position plus the screen shake effect.
     * @readonly
     */
    get computedY() {
      const dy = (Math.sin(this.shakePhaseY) + Math.sin(this.shakePhaseY * 2.8948) * 0.25) / 1.25;
      const y = this.y + dy * this.shake * Math.max(this.width, this.height) / 100 * this.shakeY;
      return y + this.interpolatedShiftY;
    }
    /**
     * Returns the position of the left edge where the visible rectangle ends,
     * in game coordinates.
     * This can be used for UI positioning in game coordinates.
     * This does not count for rotations, though.
     * For rotated and/or scaled viewports, see `getTopLeftCorner`
     * and `getBottomLeftCorner` methods.
     * @returns The location of the left edge.
     * @readonly
     */
    get left() {
      return this.computedX - this.width / 2 * this.scale.x;
    }
    /**
     * Returns the position of the top edge where the visible rectangle ends,
     * in game coordinates.
     * This can be used for UI positioning in game coordinates.
     * This does not count for rotations, though.
     * For rotated and/or scaled viewports, see `getTopLeftCorner`
     * and `getTopRightCorner` methods.
     * @returns The location of the top edge.
     * @readonly
     */
    get top() {
      return this.computedY - this.height / 2 * this.scale.y;
    }
    /**
     * Returns the position of the right edge where the visible rectangle ends,
     * in game coordinates.
     * This can be used for UI positioning in game coordinates.
     * This does not count for rotations, though.
     * For rotated and/or scaled viewports, see `getTopRightCorner`
     * and `getBottomRightCorner` methods.
     * @returns The location of the right edge.
     * @readonly
     */
    get right() {
      return this.computedX + this.width / 2 * this.scale.x;
    }
    /**
     * Returns the position of the bottom edge where the visible rectangle ends,
     * in game coordinates. This can be used for UI positioning in game coordinates.
     * This does not count for rotations, though.
     * For rotated and/or scaled viewports, see `getBottomLeftCorner`
     * and `getBottomRightCorner` methods.
     * @returns The location of the bottom edge.
     * @readonly
     */
    get bottom() {
      return this.computedY + this.height / 2 * this.scale.y;
    }
    /**
     * Translates a point from UI space to game space.
     * @param x The x coordinate in UI space.
     * @param y The y coordinate in UI space.
     * @returns A pair of new `x` and `y` coordinates.
     */
    uiToGameCoord(x, y) {
      const modx = (x - this.width / 2) * this.scale.x, mody = (y - this.height / 2) * this.scale.y;
      const result = u_default.rotate(modx, mody, this.angle);
      return new PIXI.Point(
        result.x + this.computedX,
        result.y + this.computedY
      );
    }
    /**
     * Translates a point from game space to UI space.
     * @param {number} x The x coordinate in game space.
     * @param {number} y The y coordinate in game space.
     * @returns {PIXI.Point} A pair of new `x` and `y` coordinates.
     */
    gameToUiCoord(x, y) {
      const relx = x - this.computedX, rely = y - this.computedY;
      const unrotated = u_default.rotate(relx, rely, -this.angle);
      return new PIXI.Point(
        unrotated.x / this.scale.x + this.width / 2,
        unrotated.y / this.scale.y + this.height / 2
      );
    }
    /**
     * Gets the position of the top-left corner of the viewport in game coordinates.
     * This is useful for positioning UI elements in game coordinates,
     * especially with rotated viewports.
     * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
     */
    getTopLeftCorner() {
      return this.uiToGameCoord(0, 0);
    }
    /**
     * Gets the position of the top-right corner of the viewport in game coordinates.
     * This is useful for positioning UI elements in game coordinates,
     * especially with rotated viewports.
     * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
     */
    getTopRightCorner() {
      return this.uiToGameCoord(this.width, 0);
    }
    /**
     * Gets the position of the bottom-left corner of the viewport in game coordinates.
     * This is useful for positioning UI elements in game coordinates,
     * especially with rotated viewports.
     * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
     */
    getBottomLeftCorner() {
      return this.uiToGameCoord(0, this.height);
    }
    /**
     * Gets the position of the bottom-right corner of the viewport in game coordinates.
     * This is useful for positioning UI elements in game coordinates,
     * especially with rotated viewports.
     * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
     */
    getBottomRightCorner() {
      return this.uiToGameCoord(this.width, this.height);
    }
    /**
     * Returns the bounding box of the camera.
     * Useful for rotated viewports when something needs to be reliably covered by a rectangle.
     * @returns {PIXI.Rectangle} The bounding box of the camera.
     */
    getBoundingBox() {
      const bb = new PIXI.Bounds();
      const tl = this.getTopLeftCorner(), tr = this.getTopRightCorner(), bl = this.getBottomLeftCorner(), br = this.getBottomRightCorner();
      bb.addPoint(new PIXI.Point(tl.x, tl.y));
      bb.addPoint(new PIXI.Point(tr.x, tr.y));
      bb.addPoint(new PIXI.Point(bl.x, bl.y));
      bb.addPoint(new PIXI.Point(br.x, br.y));
      return bb.getRectangle();
    }
    /**
     * Checks whether a given object (or any Pixi's DisplayObject)
     * is potentially visible, meaning that its bounding box intersects
     * the camera's bounding box.
     * @param {PIXI.DisplayObject} copy An object to check for.
     * @returns {boolean} `true` if an object is visible, `false` otherwise.
     */
    contains(copy) {
      const bounds = copy.getBounds(true);
      return bounds.right > 0 && bounds.left < this.width * this.scale.x && bounds.bottom > 0 && bounds.top < this.width * this.scale.y;
    }
    /**
     * Realigns all the copies in a room so that they distribute proportionally
     * to a new camera size based on their `xstart` and `ystart` coordinates.
     * Will throw an error if the given room is not in UI space (if `room.isUi` is not `true`).
     * You can skip the realignment for some copies
     * if you set their `skipRealign` parameter to `true`.
     * @param {Room} room The room which copies will be realigned.
     * @returns {void}
     */
    realign(room) {
      if (!room.isUi) {
        console.error("[ct.camera] An attempt to realing a room that is not in UI space. The room in question is", room);
        throw new Error("[ct.camera] An attempt to realing a room that is not in UI space.");
      }
      const w = rooms_default.templates[room.name].width || 1, h = rooms_default.templates[room.name].height || 1;
      for (const copy of room.children) {
        if (!(copyTypeSymbol in copy)) {
          continue;
        }
        if (copy.skipRealign) {
          continue;
        }
        copy.x = copy.xstart / w * this.width;
        copy.y = copy.ystart / h * this.height;
      }
    }
    /**
     * This will align all non-UI layers in the game according to the camera's transforms.
     * This is automatically called internally, and you will hardly ever use it.
     */
    manageStage() {
      const px = this.computedX, py = this.computedY, sx = 1 / (isNaN(this.scale.x) ? 1 : this.scale.x), sy = 1 / (isNaN(this.scale.y) ? 1 : this.scale.y);
      for (const item of pixiApp.stage.children) {
        if (!("isUi" in item && item.isUi) && item.pivot) {
          item.x = -this.width / 2;
          item.y = -this.height / 2;
          item.pivot.x = px;
          item.pivot.y = py;
          item.scale.x = sx;
          item.scale.y = sy;
          item.angle = -this.angle;
        }
      }
    }
  };
  var mainCamera = new Camera(
    0,
    0,
    [
      208
    ][0],
    [
      208
    ][0]
  );
  var camera_default = mainCamera;

  // src/ct.release/u.ts
  var required = function required2(paramName, method) {
    let str = "The parameter ";
    if (paramName) {
      str += `${paramName} `;
    }
    if (method) {
      str += `of ${method} `;
    }
    str += "is required.";
    throw new Error(str);
  };
  var uLib = {
    /**
     * A measure of how long the previous frame took time to draw,
     * usually equal to 1 and larger on lags.
     * For example, if it is equal to 2, it means that the previous frame took twice as much time
     * compared to expected FPS rate.
     *
     * Note that `this.move()` already uses it, so there is no need to premultiply
     * `this.speed` with it.
     *
     * **A minimal example:**
     * ```js
     * this.x += this.windSpeed * u.delta;
     * ```
     *
     * @deprecated Use `u.time` instead.
     * @catnipIgnore
     */
    delta: 1,
    /**
     * A measure of how long the previous frame took time to draw, usually equal to 1
     * and larger on lags.
     * For example, if it is equal to 2, it means that the previous frame took twice as much time
     * compared to expected FPS rate.
     *
     * This is a version for UI elements, as it is not affected by time scaling, and thus works well
     * both with slow-mo effects and game pause.
     *
     * @deprecated Use `u.timeUi` instead.
     * @catnipIgnore
     */
    deltaUi: 1,
    /**
     * A measure of how long the previous frame took time to draw, in seconds.
     * You can use it by multiplying it with your copies' speed and other values with velocity
     * to get the same speed with different framerate, regardless of lags or max framerate cap.
     *
     * If you plan on changing your game's target framerate,
     * you should use `u.time` instead of `u.delta`.
     *
     * **A minimal example:**
     * ```js
     * this.x += this.windSpeed * u.time;
     * ```
     */
    time: 1 / 60,
    /**
     * A measure of how long the previous frame took time to draw, in seconds.
     * You can use it by multiplying it with your copies' speed and other values with velocity
     * to get the same speed with different framerate, regardless of lags or max framerate cap.
     *
     * This version ignores the effects of slow-mo effects and game pause,
     * and thus is perfect for UI element.
     *
     * If you plan on changing your game's target framerate,
     * you should use `u.timeUi` instead of `u.deltaUi`.
     */
    timeUi: 1 / 60,
    /**
     * A measure of how long the previous frame took time to draw, in seconds.
     * You can use it by multiplying it with your copies' speed and other values with velocity
     * to get the same speed with different framerate, regardless of lags or max framerate cap.
     *
     * This version ignores the effects of slow-mo effects and game pause,
     * and thus is perfect for UI element.
     *
     * If you plan on changing your game's target framerate,
     * you should use `u.timeUi` instead of `u.deltaUi`.
     *
     * @catnipIgnore
     */
    timeUI: 1 / 60,
    // ⚠️ keep this "duplicate": it is an alias with different capitalization
    /**
     * Get the environment the game runs on.
     * @returns {string} Either 'ct.ide', or 'nw', or 'electron', or 'browser', or 'neutralino'.
     */
    getEnvironment() {
      if (window.name === "ct.js debugger") {
        return "ct.ide";
      }
      if ("NL_OS" in window) {
        return "neutralino";
      }
      try {
        if ("nw" in window && "require" in window.nw) {
          return "nw";
        }
      } catch (oO) {
      }
      try {
        __require("electron");
        return "electron";
      } catch (Oo) {
      }
      return "browser";
    },
    /**
     * Get the current operating system the game runs on.
     * @returns {string} One of 'windows', 'darwin' (which is MacOS), 'linux', or 'unknown'.
     */
    getOS() {
      const ua = window.navigator.userAgent;
      if (ua.indexOf("Windows") !== -1) {
        return "windows";
      }
      if (ua.indexOf("Linux") !== -1) {
        return "linux";
      }
      if (ua.indexOf("Mac") !== -1) {
        return "darwin";
      }
      return "unknown";
    },
    /**
     * Returns the length of a vector projection onto an X axis.
     * @param {number} l The length of the vector
     * @param {number} d The direction of the vector
     * @returns {number} The length of the projection
     */
    ldx(l, d) {
      return l * Math.cos(d * Math.PI / 180);
    },
    /**
     * Returns the length of a vector projection onto an Y axis.
     * @param {number} l The length of the vector
     * @param {number} d The direction of the vector
     * @returns {number} The length of the projection
     */
    ldy(l, d) {
      return l * Math.sin(d * Math.PI / 180);
    },
    /**
     * Returns the direction of a vector that points from the first point to the second one.
     * @param {number} x1 The x location of the first point
     * @param {number} y1 The y location of the first point
     * @param {number} x2 The x location of the second point
     * @param {number} y2 The y location of the second point
     * @returns {number} The angle of the resulting vector, in degrees
     */
    pdn(x1, y1, x2, y2) {
      return (Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + 360) % 360;
    },
    // Point-point DistanCe
    /**
     * Returns the distance between two points
     * @param {number} x1 The x location of the first point
     * @param {number} y1 The y location of the first point
     * @param {number} x2 The x location of the second point
     * @param {number} y2 The y location of the second point
     * @returns {number} The distance between the two points
     */
    pdc(x1, y1, x2, y2) {
      return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    },
    /**
     * Convers degrees to radians
     * @param {number} deg The degrees to convert
     * @returns {number} The resulting radian value
     */
    degToRad(deg) {
      return deg * Math.PI / 180;
    },
    /**
     * Convers radians to degrees
     * @param {number} rad The radian value to convert
     * @returns {number} The resulting degree
     */
    radToDeg(rad) {
      return rad / Math.PI * 180;
    },
    /**
     * Rotates a vector (x; y) by `deg` around (0; 0)
     * @param {number} x The x component
     * @param {number} y The y component
     * @param {number} deg The degree to rotate by
     * @returns {PIXI.Point} A pair of new `x` and `y` parameters.
     */
    rotate(x, y, deg) {
      return uLib.rotateRad(x, y, uLib.degToRad(deg));
    },
    /**
     * Rotates a vector (x; y) by `rad` around (0; 0)
     * @param {number} x The x component
     * @param {number} y The y component
     * @param {number} rad The radian value to rotate around
     * @returns {PIXI.Point} A pair of new `x` and `y` parameters.
     */
    rotateRad(x, y, rad) {
      const sin = Math.sin(rad), cos = Math.cos(rad);
      return new PIXI.Point(
        cos * x - sin * y,
        cos * y + sin * x
      );
    },
    /**
     * Gets the most narrow angle between two vectors of given directions
     * @param {number} dir1 The direction of the first vector
     * @param {number} dir2 The direction of the second vector
     * @returns {number} The resulting angle
     */
    deltaDir(dir1, dir2) {
      dir1 = (dir1 % 360 + 360) % 360;
      dir2 = (dir2 % 360 + 360) % 360;
      var t = dir1, h = dir2, ta = h - t;
      if (ta > 180) {
        ta -= 360;
      }
      if (ta < -180) {
        ta += 360;
      }
      return ta;
    },
    /**
     * Returns a number in between the given range (clamps it).
     * @param {number} min The minimum value of the given number
     * @param {number} val The value to fit in the range
     * @param {number} max The maximum value of the given number
     * @returns {number} The clamped value
     */
    clamp(min, val, max) {
      return Math.max(min, Math.min(max, val));
    },
    /**
     * Linearly interpolates between two values by the apha value.
     * Can also be describing as mixing between two values with a given proportion `alpha`.
     * @param {number} a The first value to interpolate from
     * @param {number} b The second value to interpolate to
     * @param {number} alpha The mixing value
     * @returns {number} The result of the interpolation
     */
    lerp(a, b, alpha) {
      return a + (b - a) * alpha;
    },
    /**
     * Returns the position of a given value in a given range. Opposite to linear interpolation.
     * @param  {number} a The first value to interpolate from
     * @param  {number} b The second value to interpolate top
     * @param  {number} val The interpolated values
     * @return {number} The position of the value in the specified range.
     * When a <= val <= b, the result will be inside the [0;1] range.
     */
    unlerp(a, b, val) {
      return (val - a) / (b - a);
    },
    /**
     * Re-maps the given value from one number range to another.
     * @param  {number} val The value to be mapped
     * @param  {number} inMin Lower bound of the value's current range
     * @param  {number} inMax Upper bound of the value's current range
     * @param  {number} outMin Lower bound of the value's target range
     * @param  {number} outMax Upper bound of the value's target range
     * @returns {number} The mapped value.
     */
    map(val, inMin, inMax, outMin, outMax) {
      return (val - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },
    hexToPixi(hex) {
      return Number("0x" + hex.slice(1));
    },
    pixiToHex(pixi) {
      return "#" + pixi.toString(16).padStart(6, "0");
    },
    /**
     * Returns a shape object based on the dimensions of the given sprite.
     */
    getRectShape(sprite) {
      return {
        type: "rect",
        left: sprite.width * sprite.anchor.x,
        top: sprite.height * sprite.anchor.y,
        right: sprite.width * (1 - sprite.anchor.x),
        bottom: sprite.height * (1 - sprite.anchor.y)
      };
    },
    /**
     * Takes a CopyPanel instance and changes its shape to accommodate its new dimensions.
     * Doesn't work with circular collision shapes.
     */
    reshapeNinePatch(copy) {
      const target = copy.baseClass === "NineSlicePlane" ? copy : copy.panel;
      const origTex = target.texture;
      const origShape = origTex.shape;
      const origWidth = origTex.width, origHeight = origTex.height;
      const dwx = target.width - origWidth, dhy = target.height - origHeight;
      const bw = origWidth - target.leftWidth - target.rightWidth, bh = origHeight - target.topHeight - target.bottomHeight;
      if (origShape.type === "circle") {
        throw new Error(`[u.reshapeNinePatch] Cannot reshape a circular collision mask for ${copy.template}. Please use a different collision type for its texture.`);
      }
      if (origShape.type === "rect") {
        const shape = {
          type: "rect",
          left: origShape.left,
          top: origShape.top,
          right: origShape.right + dwx,
          bottom: origShape.bottom + dhy
        };
        if (origShape.left > target.leftWidth) {
          shape.left = (origShape.left - target.leftWidth) * (1 + dwx) / bw;
        }
        if (origShape.right < target.rightWidth) {
          shape.right = (origShape.right - target.rightWidth) * (1 + dwx) / bw;
        }
        if (origShape.top > target.topHeight) {
          shape.top = (origShape.top - target.topHeight) * (1 + dhy) / bh;
        }
        if (origShape.bottom < target.bottomHeight) {
          shape.bottom = (origShape.bottom - target.bottomHeight) * (1 + dhy) / bh;
        }
        copy.shape = shape;
        return;
      }
      if (origShape.type === "strip") {
        const shape = {
          type: "strip",
          points: [],
          closedStrip: origShape.closedStrip
        };
        shape.points = origShape.points.map((point) => {
          let { x, y } = point;
          if (point.x >= origWidth - target.rightWidth) {
            x += dwx;
          } else if (point.x > target.leftWidth) {
            x = target.leftWidth + (point.x - target.leftWidth) * (1 + dwx / bw);
          }
          if (point.y >= origHeight - target.bottomHeight) {
            y += dhy;
          } else if (point.y > target.topHeight) {
            y = target.topHeight + (point.y - target.topHeight) * (1 + dhy / bh);
          }
          return {
            x,
            y
          };
        });
        copy.shape = shape;
      }
      const hitarea = uLib.getHitArea(copy.shape);
      if (hitarea) {
        copy.hitArea = hitarea;
      }
    },
    /**
     * @catnipIgnore
     */
    getHitArea(shape) {
      if (shape.type === "circle") {
        return new PIXI.Circle(0, 0, shape.r);
      }
      if (shape.type === "rect") {
        return new PIXI.Rectangle(
          -shape.left,
          -shape.top,
          shape.left + shape.right,
          shape.top + shape.bottom
        );
      }
      if (shape.type === "strip") {
        return new PIXI.Polygon(shape.points.map((point) => new PIXI.Point(point.x, point.y)));
      }
      return false;
    },
    /**
     * Tests whether a given point is inside the given rectangle
     * (it can be either a copy or an array).
     * @param {number} x The x coordinate of the point.
     * @param {number} y The y coordinate of the point.
     * @param {(Copy|Array<Number>)} arg Either a copy (it must have a rectangular shape)
     * or an array in a form of [x1, y1, x2, y2], where (x1;y1) and (x2;y2) specify
     * the two opposite corners of the rectangle.
     * @returns {boolean} `true` if the point is inside the rectangle, `false` otherwise.
     */
    prect(x, y, arg) {
      var xmin, xmax, ymin, ymax;
      if (arg instanceof Array) {
        xmin = Math.min(arg[0], arg[2]);
        xmax = Math.max(arg[0], arg[2]);
        ymin = Math.min(arg[1], arg[3]);
        ymax = Math.max(arg[1], arg[3]);
      } else {
        if (arg.shape.type !== "rect") {
          throw new Error("[ct.u.prect] The specified copy doesn't have a rectangular collision shape.");
        }
        xmin = arg.x - arg.shape.left * arg.scale.x;
        xmax = arg.x + arg.shape.right * arg.scale.x;
        ymin = arg.y - arg.shape.top * arg.scale.y;
        ymax = arg.y + arg.shape.bottom * arg.scale.y;
      }
      return x >= xmin && y >= ymin && x <= xmax && y <= ymax;
    },
    /**
     * Tests whether a given point is inside the given circle (it can be either a copy or an array)
     * @param {number} x The x coordinate of the point
     * @param {number} y The y coordinate of the point
     * @param {(Copy|Array<Number>)} arg Either a copy (it must have a circular shape)
     * or an array in a form of [x1, y1, r], where (x1;y1) define the center of the circle
     * and `r` defines the radius of it.
     * @returns {boolean} `true` if the point is inside the circle, `false` otherwise
     */
    pcircle(x, y, arg) {
      if (arg instanceof Array) {
        return uLib.pdc(x, y, arg[0], arg[1]) < arg[2];
      }
      if (arg.shape.type !== "circle") {
        throw new Error("[ct.u.pcircle] The specified copy doesn't have a circular shape");
      }
      return uLib.pdc(0, 0, (arg.x - x) / arg.scale.x, (arg.y - y) / arg.scale.y) < arg.shape.r;
    },
    /**
     * Converts the position of a point in UI coordinates
     * to its position in HTML page in CSS pixels.
     */
    uiToCssCoord(x, y) {
      const cpos = canvasCssPosition;
      return new PIXI.Point(
        x / camera_default.width * cpos.width + cpos.x,
        y / camera_default.height * cpos.height + cpos.y
      );
    },
    /**
     * Converts the position of a point in gameplay coordinates
     * to its position in HTML page in CSS pixels.
     */
    gameToCssCoord(x, y) {
      const ui = camera_default.gameToUiCoord(x, y);
      return uLib.uiToCssCoord(ui.x, ui.y);
    },
    /**
     * Converts UI pixels into CSS pixels, but ignores canvas shift
     * that usually happens due to letterboxing.
     */
    uiToCssScalar(val) {
      return val / camera_default.width * canvasCssPosition.width;
    },
    /**
     * Converts UI pixels into CSS pixels, but ignores canvas shift
     * that usually happens due to letterboxing.
     */
    gameToCssScalar(val) {
      return val / (camera_default.width * camera_default.scale.x) * canvasCssPosition.width;
    },
    gameToUiCoord(x, y) {
      return camera_default.gameToUiCoord(x, y);
    },
    uiToGameCoord(x, y) {
      return camera_default.uiToGameCoord(x, y);
    },
    /**
     * Returns a Promise that resolves after the given time.
     * This timer is run in gameplay time scale, meaning that it is affected by time stretching.
     * @param {number} time Time to wait, in milliseconds
     * @returns {CtTimer} The timer, which you can call `.then()` to
     * @catnipPromise both
     */
    wait(time) {
      return timer_default.add(time);
    },
    /**
     * Returns a Promise that resolves after the given time.
     * This timer runs in UI time scale and is not sensitive to time stretching.
     * @param {number} time Time to wait, in milliseconds
     * @returns {CtTimer} The timer, which you can call `.then()` to
     * @catnipPromise both
     */
    waitUi(time) {
      return timer_default.addUi(time);
    },
    /**
     * Creates a new function that returns a promise, based
     * on a function with a regular (err, result) => {...} callback.
     * @param {Function} f The function that needs to be promisified
     * @see https://javascript.info/promisify
     * @catnipIgnore
     */
    promisify(f) {
      return function(...args2) {
        return new Promise((resolve, reject) => {
          const callback = function callback2(err, result) {
            if (err) {
              reject(err);
            } else {
              resolve(result);
            }
          };
          args2.push(callback);
          f.call(this, ...args2);
        });
      };
    },
    /**
     * @catnipIgnore
     */
    required,
    /**
     * Takes a prefix and a number to make a string in format Prefix_XX,
     * mainly used to get nice names for assets.
     */
    numberedString(prefix, input) {
      return prefix + "_" + input.toString().padStart(2, "0");
    },
    /**
     * Gets the number of a string with pattern Prefix_XX,
     * generally used to work with asset names.
     */
    getStringNumber(str) {
      return Number(str.split("_").pop());
    }
  };
  Object.assign(uLib, {
    // make aliases
    getOs: uLib.getOS,
    lengthDirX: uLib.ldx,
    lengthDirY: uLib.ldy,
    pointDirection: uLib.pdn,
    pointDistance: uLib.pdc,
    pointRectangle: uLib.prect,
    pointCircle: uLib.pcircle
  });
  var u_default = uLib;

  // src/ct.release/rooms.ts
  var Room = class _Room extends PIXI.Container {
    // eslint-disable-next-line max-lines-per-function
    constructor(template, isRoot) {
      super();
      this.alignElements = [];
      this.kill = false;
      this.tileLayers = [];
      this.backgrounds = [];
      this.bindings = /* @__PURE__ */ new Set();
      this.tickerSet = /* @__PURE__ */ new Set();
      /** Time for the next run of the 1st timer, in seconds. */
      this.timer1 = 0;
      /** Time for the next run of the 2nd timer, in seconds. */
      this.timer2 = 0;
      /** Time for the next run of the 3rd timer, in seconds. */
      this.timer3 = 0;
      /** Time for the next run of the 4th timer, in seconds. */
      this.timer4 = 0;
      /** Time for the next run of the 5th timer, in seconds. */
      this.timer5 = 0;
      /** Time for the next run of the 6th timer, in seconds. */
      this.timer6 = 0;
      this.x = this.y = 0;
      this.sortableChildren = true;
      this.uid = _Room.getNewId();
      if (template) {
        this.onCreate = template.onCreate;
        this.onStep = template.onStep;
        this.onDraw = template.onDraw;
        this.onLeave = template.onLeave;
        this.template = template;
        this.name = template.name;
        this.isUi = template.isUi;
        this.follow = template.follow;
        this.viewWidth = template.width;
        this.viewHeight = template.height;
        this.behaviors = [...template.behaviors];
        if (template.extends) {
          Object.assign(this, template.extends);
        }
        if (isRoot) {
          roomsLib.current = this;
          pixiApp.renderer.background.color = u_default.hexToPixi(this.template.backgroundColor);
        }
        if (this === rooms.current) {
    place.tileGrid = {};
}

        for (let i = 0, li = template.bgs.length; i < li; i++) {
          const bg = new Background(
            template.bgs[i].texture,
            0,
            template.bgs[i].depth,
            template.bgs[i].exts
          );
          this.addChild(bg);
        }
        for (let i = 0, li = template.tiles.length; i < li; i++) {
          const tl = new Tilemap(template.tiles[i]);
          this.tileLayers.push(tl);
          this.addChild(tl);
        }
        for (let i = 0, li = template.objects.length; i < li; i++) {
          const copy = template.objects[i];
          const exts = copy.exts || {};
          const customProperties = copy.customProperties || {};
          const ctCopy = templates_default.copyIntoRoom(
            copy.template,
            copy.x,
            copy.y,
            this,
            {
              ...exts,
              ...customProperties,
              scaleX: copy.scale.x,
              scaleY: copy.scale.y,
              rotation: copy.rotation,
              alpha: copy.opacity,
              tint: copy.tint,
              customSize: copy.customSize,
              customWordWrap: copy.customWordWrap,
              customText: copy.customText,
              customAnchor: copy.customAnchor,
              align: copy.align
            }
          );
          if (copy.align) {
            this.alignElements.push(ctCopy);
          }
          if (template.bindings[i]) {
            this.bindings.add(template.bindings[i].bind(ctCopy));
          }
        }
        if (this.alignElements.length) {
          this.realignElements(
            template.width,
            template.height,
            camera_default.width,
            camera_default.height
          );
        }
      } else {
        this.behaviors = [];
      }
      return this;
    }
    static {
      this.roomId = 0;
    }
    static getNewId() {
      this.roomId++;
      return this.roomId;
    }
    realignElements(oldWidth, oldHeight, newWidth, newHeight) {
      for (const copy of this.alignElements) {
        _Room.realignElement(copy, oldWidth, oldHeight, newWidth, newHeight);
      }
    }
    static realignElement(copy, oldWidth, oldHeight, newWidth, newHeight) {
      if (!copy.align) {
        return;
      }
      const { padding, frame } = copy.align;
      const xref = oldWidth * frame.x1 / 100 + padding.left, yref = oldHeight * frame.y1 / 100 + padding.top;
      const wref = oldWidth * (frame.x2 - frame.x1) / 100 - padding.left - padding.right, href = oldHeight * (frame.y2 - frame.y1) / 100 - padding.top - padding.bottom;
      const xnew = newWidth * frame.x1 / 100 + padding.left, ynew = newHeight * frame.y1 / 100 + padding.top;
      const wnew = newWidth * (frame.x2 - frame.x1) / 100 - padding.left - padding.right, hnew = newHeight * (frame.y2 - frame.y1) / 100 - padding.top - padding.bottom;
      if (oldWidth !== newWidth) {
        switch (copy.align.alignX) {
          case "start":
            copy.x += xnew - xref;
            break;
          case "both":
            copy.x += xnew - xref;
            copy.width += wnew - wref;
            break;
          case "end":
            copy.x += wnew - wref + xnew - xref;
            break;
          case "center":
            copy.x += (wnew - wref) / 2 + xnew - xref;
            break;
          case "scale":
            {
              const k = wnew / wref || 1;
              copy.width *= k;
              copy.x = (copy.x - xref) * k + xnew;
            }
            break;
          default:
        }
      }
      if (oldHeight !== newHeight) {
        switch (copy.align.alignY) {
          case "start":
            copy.y += ynew - yref;
            break;
          case "both":
            copy.y += ynew - yref;
            copy.height += hnew - href;
            break;
          case "end":
            copy.y += hnew - href + ynew - yref;
            break;
          case "center":
            copy.y += (hnew - href) / 2 + ynew - yref;
            break;
          case "scale":
            {
              const k = hnew / href || 1;
              copy.height *= k;
              copy.y = (copy.y - yref) * k + ynew;
            }
            break;
          default:
        }
      }
    }
    /**
     * Adds a new copy to the list of elements that should be aligned when window size changes,
     * with the specified alignment settings.
     * The copy must be positioned relative to the current camera dimensions beforehand.
     * @param copy The copy to add
     * @param align The alignment settings
     */
    makeCopyAligned(copy, align) {
      const alignObj = Object.assign({}, align);
      if (!align.frame) {
        alignObj.frame = {
          x1: 0,
          y1: 0,
          x2: 100,
          y2: 100
        };
      }
      if (!align.padding) {
        alignObj.padding = {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0
        };
      }
      copy.align = alignObj;
      this.alignElements.push(copy);
    }
    /**
     * Adds a new copy to the list of elements that should be aligned when window size changes,
     * with the specified alignment settings.
     * The copy must be positioned relative to the room's template beforehand.
     * @param copy The copy to add
     * @param align The alignment settings
     */
    makeCopyAlignedRef(copy, align) {
      this.makeCopyAligned(copy, align);
      _Room.realignElement(
        copy,
        this.template.width,
        this.template.height,
        camera_default.width,
        camera_default.height
      );
    }
    get x() {
      return -this.position.x;
    }
    set x(value) {
      this.position.x = -value;
    }
    get y() {
      return -this.position.y;
    }
    set y(value) {
      this.position.y = -value;
    }
  };
  Room.roomId = 0;
  var nextRoom;
  var roomsLib = {
    /**
     * All the existing room templates that can be used in the game.
     * It is usually prefilled by ct.IDE.
     * @catnipIgnore
     */
    templates: {},
    /**
     * @catnipIgnore
     */
    Room,
    /** The current top-level room in the game. */
    current: null,
    /**
     * An object that contains arrays of currently present rooms.
     * These include the current room (`rooms.current`), as well as any rooms
     * appended or prepended through `rooms.append` and `rooms.prepend`.
     * @catnipList room
     */
    list: {},
    /**
     * Creates and adds a background to the current room, at the given depth.
     * @param {string} texture The name of the texture to use
     * @catnipAsset texture:texture
     * @param {number} depth The depth of the new background
     * @returns {Background} The created background
     * @catnipSaveReturn
     */
    addBg(texture, depth) {
      if (!roomsLib.current) {
        throw new Error("[rooms.addBg] You cannot add a background before a room is created");
      }
      const bg = new Background(texture, 0, depth);
      roomsLib.current.addChild(bg);
      return bg;
    },
    /**
     * Clears the current stage, removing all rooms with copies, tile layers, backgrounds,
     * and other potential entities.
     * @returns {void}
     */
    clear() {
      pixiApp.stage.children.length = 0;
      stack.length = 0;
      for (const i in templates_default.list) {
        templates_default.list[i] = [];
      }
      for (const i in backgrounds_default.list) {
        backgrounds_default.list[i] = [];
      }
      roomsLib.list = {};
      for (const name in roomsLib.templates) {
        roomsLib.list[name] = [];
      }
    },
    /**
     * This method safely removes a previously appended/prepended room from the stage.
     * It will trigger "On Leave" for a room and "On Destroy" event
     * for all the copies of the removed room.
     * The room will also have `this.kill` set to `true` in its event, if it comes in handy.
     * This method cannot remove `rooms.current`, the main room.
     * @param {Room} room The `room` argument must be a reference
     * to the previously created room.
     * @returns {void}
     */
    remove(room) {
      if (!(room instanceof Room)) {
        if (typeof room === "string") {
          console.error("[rooms.remove] To remove a room, you should provide a reference to it (to an object), not its name. Provided value:", room);
          throw new Error("[rooms.remove] Invalid argument type");
        }
        throw new Error("[rooms] An attempt to remove a room that is not actually a room! Provided value:" + room);
      }
      const ind = roomsLib.list[room.name].indexOf(room);
      if (ind !== -1) {
        roomsLib.list[room.name].splice(ind, 1);
      } else {
        console.warn("[rooms] Removing a room that was not found in rooms.list. This is strange\u2026");
      }
      room.kill = true;
      pixiApp.stage.removeChild(room);
      for (const copy of room.children) {
        if (copyTypeSymbol in copy) {
          copy.kill = true;
        }
      }
      room.onLeave();
      roomsLib.onLeave.apply(room);
    },
    /**
     * Switches to the given room. Note that this transition happens at the end
     * of the frame, so the name of a new room may be overridden.
     * @catnipAsset roomName:room
     */
    "switch"(roomName) {
      if (roomsLib.templates[roomName]) {
        nextRoom = roomName;
        roomsLib.switching = true;
      } else {
        console.error('[rooms] The room "' + roomName + '" does not exist!');
      }
    },
    /**
     * Whether a room switch is scheduled.
     * @catnipIgnore
     */
    switching: false,
    /**
     * Restarts the current room.
     * @returns {void}
     */
    restart() {
      if (!roomsLib.current) {
        throw new Error("[rooms.restart] Cannot restart a room before it is created");
      }
      roomsLib.switch(roomsLib.current.name);
    },
    /**
     * Creates a new room and adds it to the stage, separating its draw stack
     * from existing ones.
     * This room is added to `ct.stage` after all the other rooms.
     * @param {string} roomName The name of the room to be appended
     * @param {object} [params] Any additional parameters applied to the new room.
     * Useful for passing settings and data to new widgets and prefabs.
     * @returns {Room} A newly created room
     * @catnipIgnore Defined in catnip/stdLib/rooms.ts
     */
    append(roomName, params) {
      if (!(roomName in roomsLib.templates)) {
        throw new Error(`[rooms.append] append failed: the room ${roomName} does not exist!`);
      }
      const room = new Room(roomsLib.templates[roomName], false);
      if (params) {
        Object.assign(room, params);
      }
      pixiApp.stage.addChild(room);
      room.onCreate.apply(room);
      roomsLib.onCreate.apply(room);
      roomsLib.list[roomName].push(room);
      return room;
    },
    /**
     * Creates a new room and adds it to the stage, separating its draw stack
     * from existing ones.
     * This room is added to `ct.stage` before all the other rooms.
     * @param {string} roomName The name of the room to be prepended
     * @param {object} [params] Any additional parameters applied to the new room.
     * Useful for passing settings and data to new widgets and prefabs.
     * @returns {Room} A newly created room
     * @catnipIgnore Defined in catnip/stdLib/rooms.ts
     */
    prepend(roomName, params) {
      if (!(roomName in roomsLib.templates)) {
        throw new Error(`[rooms] prepend failed: the room ${roomName} does not exist!`);
      }
      const room = new Room(roomsLib.templates[roomName], false);
      if (params) {
        Object.assign(room, params);
      }
      pixiApp.stage.addChildAt(room, 0);
      room.onCreate.apply(room);
      roomsLib.onCreate.apply(room);
      roomsLib.list[roomName].push(room);
      return room;
    },
    /**
     * Merges a given room into the current one. Skips room's OnCreate event.
     *
     * @param roomName The name of the room that needs to be merged
     * @catnipAsset roomName:room
     * @returns Arrays of created copies, backgrounds, tile layers,
     * added to the current room (`rooms.current`). Note: it does not get updated,
     * so beware of memory leaks if you keep a reference to this array for a long time!
     * @catnipSaveReturn
     */
    merge(roomName) {
      if (!roomsLib.current) {
        throw new Error("[rooms.merge] Cannot merge in a room before the main one is created");
      }
      if (!(roomName in roomsLib.templates)) {
        console.error(`[rooms] merge failed: the room ${roomName} does not exist!`);
        return false;
      }
      const generated = {
        copies: [],
        tileLayers: [],
        backgrounds: []
      };
      const template = roomsLib.templates[roomName];
      const target = roomsLib.current;
      for (const t of template.bgs) {
        const bg = new Background(t.texture, 0, t.depth, t.exts);
        target.backgrounds.push(bg);
        target.addChild(bg);
        generated.backgrounds.push(bg);
      }
      for (const t of template.tiles) {
        const tl = new Tilemap(t);
        target.tileLayers.push(tl);
        target.addChild(tl);
        generated.tileLayers.push(tl);
      }
      for (const t of template.objects) {
        const c = templates_default.copyIntoRoom(t.template, t.x, t.y, target, {
          tx: t.scale.x || 1,
          ty: t.scale.y || 1,
          tr: t.rotation || 0,
          scaleX: t.scale?.x,
          scaleY: t.scale?.y,
          rotation: t.rotation,
          alpha: t.opacity,
          ...t.customProperties
        });
        generated.copies.push(c);
      }
      return generated;
    },
    /**
     * @catnipIgnore
     */
    forceSwitch(roomName) {
      if (nextRoom) {
        roomName = nextRoom;
      }
      if (roomsLib.current) {
        roomsLib.rootRoomOnLeave.apply(roomsLib.current);
        roomsLib.current.onLeave();
        roomsLib.onLeave.apply(roomsLib.current);
        roomsLib.current = null;
      }
      roomsLib.clear();
      for (const copy of forceDestroy) {
        copy.destroy();
      }
      forceDestroy.clear();
      deadPool.length = 0;
      var template = roomsLib.templates[roomName];
      camera_default.reset(
        template.width / 2,
        template.height / 2,
        template.width,
        template.height
      );
      if (template.cameraConstraints) {
        camera_default.minX = template.cameraConstraints.x1;
        camera_default.maxX = template.cameraConstraints.x2;
        camera_default.minY = template.cameraConstraints.y1;
        camera_default.maxY = template.cameraConstraints.y2;
      }
      roomsLib.current = new Room(template, true);
      pixiApp.stage.addChild(roomsLib.current);
      updateViewport();
      roomsLib.rootRoomOnCreate.apply(roomsLib.current);
      roomsLib.current.onCreate();
      roomsLib.onCreate.apply(roomsLib.current);
      roomsLib.list[roomName].push(roomsLib.current);
      
      camera_default.manageStage();
      roomsLib.switching = false;
      nextRoom = void 0;
    },
    /**
     * @catnipIgnore
     */
    onCreate() {
      if (this === rooms.current) {
    const debugTraceGraphics = new PIXI.Graphics();
    debugTraceGraphics.depth = 10000000; // Why not. Overlap everything.
    rooms.current.addChild(debugTraceGraphics);
    place.debugTraceGraphics = debugTraceGraphics;
}
for (const layer of this.tileLayers) {
    if (this.children.indexOf(layer) === -1) {
        continue;
    }
    place.enableTilemapCollisions(layer);
}

      if (this.behaviors.length) {
        runBehaviors(this, "rooms", "thisOnCreate");
      }
    },
    /**
     * @catnipIgnore
     */
    onLeave() {
      if (this === rooms.current) {
    place.grid = {};
}

      if (this.behaviors.length) {
        runBehaviors(this, "rooms", "thisOnDestroy");
      }
    },
    /**
     * @catnipIgnore
     */
    beforeStep() {
      pointer.updateGestures();
{
    const positionGame = camera.uiToGameCoord(pointer.xui, pointer.yui);
    pointer.x = positionGame.x;
    pointer.y = positionGame.y;
}

    },
    /**
     * @catnipIgnore
     */
    afterStep() {
      
      if (this.behaviors.length) {
        runBehaviors(this, "rooms", "thisOnStep");
      }
      for (const c of this.tickerSet) {
        c.tick();
      }
    },
    /**
     * @catnipIgnore
     */
    beforeDraw() {
      
    },
    /**
     * @catnipIgnore
     */
    afterDraw() {
      for (const p of pointer.down) {
    p.xprev = p.x;
    p.yprev = p.y;
    p.xuiprev = p.x;
    p.yuiprev = p.y;
}
for (const p of pointer.hover) {
    p.xprev = p.x;
    p.yprev = p.y;
    p.xuiprev = p.x;
    p.yuiprev = p.y;
}
inputs.registry['pointer.Wheel'] = 0;
pointer.clearReleased();
pointer.xmovement = pointer.ymovement = 0;
keyboard.clear();

      if (this.behaviors.length) {
        runBehaviors(this, "rooms", "thisOnDraw");
      }
      for (const fn of this.bindings) {
        fn();
      }
    },
    /**
     * @catnipIgnore
     */
    rootRoomOnCreate() {
      

    },
    /**
     * @catnipIgnore
     */
    rootRoomOnStep() {
      

    },
    /**
     * @catnipIgnore
     */
    rootRoomOnDraw() {
      

    },
    /**
     * @catnipIgnore
     */
    rootRoomOnLeave() {
      

    },
    /**
     * The name of the starting room, as it was set in ct.IDE.
     * @type {string}
     */
    starting: "New Room"
  };
  var rooms_default = roomsLib;

  // src/ct.release/fittoscreen.ts
  document.body.style.overflow = "hidden";
  var canvasCssPosition = {
    x: 0,
    y: 0,
    width: 0,
    height: 0
  };
  var positionCanvas = function positionCanvas2(mode, scale) {
    const canv = pixiApp.view;
    if (mode === "fastScale" || mode === "fastScaleInteger") {
      canv.style.transform = `translate(-50%, -50%) scale(${scale})`;
      canv.style.position = "absolute";
      canv.style.top = "50%";
      canv.style.left = "50%";
    } else if (mode === "expand" || mode === "scaleFill") {
      canv.style.transform = "";
      canv.style.position = "static";
      canv.style.top = "unset";
      canv.style.left = "unset";
    } else if (mode === "scaleFit") {
      canv.style.transform = "translate(-50%, -50%)";
      canv.style.position = "absolute";
      canv.style.top = "50%";
      canv.style.left = "50%";
    } else {
      canv.style.transform = canv.style.position = canv.style.top = canv.style.left = "";
    }
    const bbox = canv.getBoundingClientRect();
    canvasCssPosition.x = bbox.left;
    canvasCssPosition.y = bbox.top;
    canvasCssPosition.width = bbox.width;
    canvasCssPosition.height = bbox.height;
  };
  var updateViewport = () => {
    if (!rooms_default.current) {
      return;
    }
    const mode = settings.viewMode;
    let pixelScaleModifier = settings.highDensity ? window.devicePixelRatio || 1 : 1;
    if (mode === "fastScale" || mode === "fastScaleInteger") {
      pixelScaleModifier = 1;
    }
    const kw = window.innerWidth / rooms_default.current.viewWidth, kh = window.innerHeight / rooms_default.current.viewHeight;
    let k = Math.min(kw, kh);
    if (mode === "fastScaleInteger") {
      k = k < 1 ? k : Math.floor(k);
    }
    var canvasWidth, canvasHeight, cameraWidth, cameraHeight;
    if (mode === "expand") {
      canvasWidth = Math.ceil(window.innerWidth * pixelScaleModifier);
      canvasHeight = Math.ceil(window.innerHeight * pixelScaleModifier);
      cameraWidth = window.innerWidth;
      cameraHeight = window.innerHeight;
    } else if (mode === "scaleFit" || mode === "scaleFill") {
      if (mode === "scaleFill") {
        canvasWidth = Math.ceil(rooms_default.current.viewWidth * kw * pixelScaleModifier);
        canvasHeight = Math.ceil(rooms_default.current.viewHeight * kh * pixelScaleModifier);
        cameraWidth = window.innerWidth / k;
        cameraHeight = window.innerHeight / k;
      } else {
        canvasWidth = Math.ceil(rooms_default.current.viewWidth * k * pixelScaleModifier);
        canvasHeight = Math.ceil(rooms_default.current.viewHeight * k * pixelScaleModifier);
        cameraWidth = rooms_default.current.viewWidth;
        cameraHeight = rooms_default.current.viewHeight;
      }
    } else {
      canvasWidth = rooms_default.current.viewWidth;
      canvasHeight = rooms_default.current.viewHeight;
      cameraWidth = canvasWidth;
      cameraHeight = canvasHeight;
    }
    pixiApp.renderer.resize(canvasWidth, canvasHeight);
    if (mode !== "scaleFill" && mode !== "scaleFit") {
      if (mode === "fastScale" || mode === "fastScaleInteger") {
        pixiApp.stage.scale.x = pixiApp.stage.scale.y = 1;
      } else {
        pixiApp.stage.scale.x = pixiApp.stage.scale.y = pixelScaleModifier;
      }
    } else {
      pixiApp.stage.scale.x = pixiApp.stage.scale.y = pixelScaleModifier * k;
    }
    if (pixiApp.view.style) {
      pixiApp.view.style.width = Math.ceil(canvasWidth / pixelScaleModifier) + "px";
      pixiApp.view.style.height = Math.ceil(canvasHeight / pixelScaleModifier) + "px";
    }
    if (camera_default) {
      const oldWidth = camera_default.width, oldHeight = camera_default.height;
      camera_default.width = cameraWidth;
      camera_default.height = cameraHeight;
      for (const item of pixiApp.stage.children) {
        if (!(item instanceof Room)) {
          continue;
        }
        item.realignElements(oldWidth, oldHeight, cameraWidth, cameraHeight);
      }
    }
    positionCanvas(mode, k);
  };
  window.addEventListener("resize", updateViewport);
  var toggleFullscreen = function() {
    try {
      const win = __require("electron").remote.BrowserWindow.getFocusedWindow();
      win.setFullScreen(!win.isFullScreen());
      return;
    } catch (e) {
    }
    const canvas = document.fullscreenElement;
    const requester = document.getElementById("ct");
    if (!canvas) {
      var promise = requester.requestFullscreen();
      if (promise) {
        promise.catch(function fullscreenError(err) {
          console.error("[fittoscreen]", err);
        });
      }
    } else {
      document.exitFullscreen();
    }
  };
  var getIsFullscreen = function getIsFullscreen2() {
    try {
      const win = __require("electron").remote.BrowserWindow.getFocusedWindow;
      return win.isFullScreen;
    } catch (e) {
    }
    return Boolean(document.fullscreenElement);
  };

  // src/ct.release/inputs.ts
  var inputRegistry = {};
  var CtAction = class {
    /**
     * This is a custom action defined in the Settings tab → Edit actions section.
     * Actions are used to abstract different input methods into one gameplay-related interface:
     * for example, joystick movement, WASD keys and arrows can be turned into two actions:
     * `MoveHorizontally` and `MoveVertically`.
     * @param {string} name The name of the new action.
     */
    constructor(name) {
      this.methodCodes = [];
      this.methodMultipliers = [];
      this.prevValue = 0;
      this.value = 0;
      this.name = name;
      return this;
    }
    /**
     * Checks whether the current action listens to a given input method.
     * This *does not* check whether this input method is supported by ct.
     *
     * @param {string} code The code to look up.
     * @returns {boolean} `true` if it exists, `false` otherwise.
     */
    methodExists(code) {
      return this.methodCodes.indexOf(code) !== -1;
    }
    /**
     * Adds a new input method to listen.
     *
     * @param {string} code The input method's code to listen to. Must be unique per action.
     * @param {number} multiplier An optional multiplier, e.g. to flip its value.
     * Often used with two buttons to combine them into a scalar input identical to joysticks.
     * @returns {void}
     */
    addMethod(code, multiplier) {
      if (this.methodCodes.indexOf(code) === -1) {
        this.methodCodes.push(code);
        this.methodMultipliers.push(multiplier !== void 0 ? multiplier : 1);
      } else {
        throw new Error(`[ct.inputs] An attempt to add an already added input "${code}" to an action "${this.name}".`);
      }
    }
    /**
     * Removes the provided input method for an action.
     *
     * @param {string} code The input method to remove.
     * @returns {void}
     */
    removeMethod(code) {
      const ind = this.methodCodes.indexOf(code);
      if (ind !== -1) {
        this.methodCodes.splice(ind, 1);
        this.methodMultipliers.splice(ind, 1);
      }
    }
    /**
     * Changes the multiplier for an input method with the provided code.
     * This method will produce a warning if one is trying to change an input method
     * that is not listened by this action.
     *
     * @param {string} code The input method's code to change
     * @param {number} multiplier The new value
     * @returns {void}
     */
    setMultiplier(code, multiplier) {
      const ind = this.methodCodes.indexOf(code);
      if (ind !== -1) {
        this.methodMultipliers[ind] = multiplier;
      } else {
        console.warn(`[ct.inputs] An attempt to change multiplier of a non-existent method "${code}" at event ${this.name}`);
        console.trace();
      }
    }
    /**
     * Recalculates the digital value of an action.
     *
     * @returns {number} A scalar value between -1 and 1.
     */
    update() {
      this.prevValue = this.value;
      this.value = 0;
      for (let i = 0, l = this.methodCodes.length; i < l; i++) {
        const rawValue = inputRegistry[this.methodCodes[i]] || 0;
        this.value += rawValue * this.methodMultipliers[i];
      }
      this.value = Math.max(-1, Math.min(this.value, 1));
      return this.value;
    }
    /**
     * Resets the state of this action, setting its value to `0`
     * and its pressed, down, released states to `false`.
     *
     * @returns {void}
     */
    reset() {
      this.prevValue = this.value = 0;
    }
    /**
     * Returns whether the action became active in the current frame,
     * either by a button just pressed or by using a scalar input.
     *
     * `true` for being pressed and `false` otherwise
     */
    get pressed() {
      return this.prevValue === 0 && this.value !== 0;
    }
    /**
     * Returns whether the action became inactive in the current frame,
     * either by releasing all buttons or by resting all scalar inputs.
     *
     * `true` for being released and `false` otherwise
     */
    get released() {
      return this.prevValue !== 0 && this.value === 0;
    }
    /**
     * Returns whether the action is active, e.g. by a pressed button
     * or a currently used scalar input.
     *
     * `true` for being active and `false` otherwise
     */
    get down() {
      return this.value !== 0;
    }
    /* In case you need to be hated for the rest of your life, uncomment this */
    /*
    valueOf() {
        return this.value;
    }
    */
  };
  var actionsLib = {};
  var inputsLib = {
    registry: inputRegistry,
    /**
     * Adds a new action and puts it into `ct.actions`.
     *
     * @param name The name of an action, as it will be used in `ct.actions`.
     * @param methods A list of input methods. This list can be changed later.
     * @returns {CtAction} The created action
     */
    addAction(name, methods) {
      if (name in actionsLib) {
        throw new Error(`[ct.inputs] An action "${name}" already exists, can't add a new one with the same name.`);
      }
      const action = new CtAction(name);
      for (const method of methods) {
        action.addMethod(method.code, method.multiplier);
      }
      actionsLib[name] = action;
      return action;
    },
    /**
     * Removes an action with a given name.
     * @param {string} name The name of an action
     * @returns {void}
     */
    removeAction(name) {
      delete actionsLib[name];
    },
    /**
     * Recalculates values for every action in a game.
     * @returns {void}
     */
    updateActions() {
      for (const i in actionsLib) {
        actionsLib[i].update();
      }
    }
  };

  // src/ct.release/content.ts
  var contentLib = JSON.parse([
    "{}"
  ][0] || "{}");
  var content_default = contentLib;

  // src/ct.release/emitters.ts
  PIXI.particles.Particle.prototype.isInteractive = () => false;
  {
    const hexToRGB = (color, output) => {
      if (!output) {
        output = {};
      }
      if (color.charAt(0) === "#") {
        color = color.substr(1);
      } else if (color.indexOf("0x") === 0) {
        color = color.substr(2);
      }
      let alpha;
      if (color.length === 8) {
        alpha = color.substr(0, 2);
        color = color.substr(2);
      }
      output.r = parseInt(color.substr(0, 2), 16);
      output.g = parseInt(color.substr(2, 2), 16);
      output.b = parseInt(color.substr(4, 2), 16);
      if (alpha) {
        output.a = parseInt(alpha, 16);
      }
      return output;
    };
    PIXI.particles.PropertyNode.createList = (data) => {
      const array = data.list;
      let node;
      const { value, time } = array[0];
      const first = node = new PIXI.particles.PropertyNode(typeof value === "string" ? hexToRGB(value) : value, time, data.ease);
      if (array.length > 1) {
        for (let i = 1; i < array.length; ++i) {
          const { value: value2, time: time2 } = array[i];
          node.next = new PIXI.particles.PropertyNode(typeof value2 === "string" ? hexToRGB(value2) : value2, time2);
          node = node.next;
        }
      }
      first.isStepped = Boolean(data.isStepped);
      return first;
    };
  }
  var EmitterTandem = class extends PIXI.Container {
    /**
     * Creates a new emitter tandem. This method should not be called directly;
     * better use the methods of `emittersLib`.
     * @param tandemData The template object of the tandem, as it was exported from ct.IDE.
     * @param opts Additional settings applied to the tandem
     * @constructor
     */
    // eslint-disable-next-line max-lines-per-function
    constructor(tandemData, opts) {
      super();
      /** If set to true, the tandem will stop updating its emitters */
      this.frozen = false;
      this.stopped = false;
      this.kill = false;
      this.isUi = false;
      this.emitters = [];
      this.delayed = [];
      for (const emt of tandemData) {
        let { settings: settings2 } = emt;
        settings2 = {
          ...settings2,
          behaviors: structuredClone(settings2.behaviors)
        };
        if (opts.tint) {
          const tintColor = new PIXI.Color(opts.tint);
          const colorList = settings2.behaviors[1].config.color.list;
          colorList.forEach((item) => {
            item.value = new PIXI.Color(item.value).multiply(tintColor).toHex().slice(1);
          });
        }
        const textures = res_default.getTexture(emt.texture);
        if (emt.textureBehavior === "textureRandom") {
          settings2.behaviors.push({
            type: "textureRandom",
            config: {
              textures
            }
          });
        } else {
          settings2.behaviors.push({
            type: "animatedSingle",
            config: {
              anim: {
                framerate: emt.animatedSingleFramerate,
                loop: true,
                textures
              }
            }
          });
        }
        const inst = new PIXI.particles.Emitter(this, settings2);
        const d = emt.settings.delay + (opts.prewarmDelay || 0);
        if (d > 0) {
          inst.emit = false;
          this.delayed.push({
            value: d,
            emitter: inst
          });
        } else if (d < 0) {
          inst.emit = true;
          inst.update(-d);
        } else {
          inst.emit = true;
        }
        inst.initialDeltaPos = {
          x: emt.settings.pos.x,
          y: emt.settings.pos.y
        };
        this.emitters.push(inst);
        inst.playOnce(() => {
          this.emitters.splice(this.emitters.indexOf(inst), 1);
        });
      }
      this.isUi = opts.isUi || false;
      const scale = opts.scale || {
        x: 1,
        y: 1
      };
      this.scale.x = scale.x;
      this.scale.y = scale.y;
      if (opts.rotation) {
        this.rotation = opts.rotation;
      } else if (opts.angle) {
        this.angle = opts.angle;
      }
      this.deltaPosition = opts.position || {
        x: 0,
        y: 0
      };
      this.zIndex = opts.depth || 0;
      this.frozen = false;
      if (this.isUi) {
        emittersLib.uiTandems.push(this);
      } else {
        emittersLib.tandems.push(this);
      }
    }
    /**
     * A method for internal use; advances the particle simulation further
     * according to either a UI ticker or ct.delta.
     * @returns {void}
     */
    update() {
      if (this.stopped) {
        for (const emitter of this.emitters) {
          if (!emitter.particleCount) {
            this.emitters.splice(this.emitters.indexOf(emitter), 1);
          }
        }
      }
      if (this.appendant && this.appendant.destroyed || this.kill || !this.emitters.length) {
        this.emit("done");
        if (this.isUi) {
          emittersLib.uiTandems.splice(emittersLib.uiTandems.indexOf(this), 1);
        } else {
          emittersLib.tandems.splice(emittersLib.tandems.indexOf(this), 1);
        }
        this.destroy();
        return;
      }
      if (this.frozen) {
        return;
      }
      const s = (this.isUi ? PIXI.Ticker.shared.elapsedMS : PIXI.Ticker.shared.deltaMS) / 1e3;
      for (const delayed of this.delayed) {
        delayed.value -= s;
        if (delayed.value <= 0) {
          delayed.emitter.emit = true;
          this.delayed.splice(this.delayed.indexOf(delayed), 1);
        }
      }
      for (const emt of this.emitters) {
        if (this.delayed.find((delayed) => delayed.emitter === emt)) {
          continue;
        }
        emt.update(s);
      }
      if (this.follow) {
        this.updateFollow();
      }
    }
    /**
     * Stops spawning new particles, then destroys itself.
     * Can be fired only once, otherwise it will log a warning.
     * @returns {void}
     */
    stop() {
      if (this.stopped) {
        console.trace("[emitters] An attempt to stop an already stopped emitter tandem. Continuing\u2026");
        return;
      }
      this.stopped = true;
      for (const emt of this.emitters) {
        emt.emit = false;
      }
      this.delayed = [];
    }
    /**
     * Stops spawning new particles, but continues simulation and allows to resume
     * the effect later with `emitter.resume();`
     * @returns {void}
     */
    pause() {
      for (const emt of this.emitters) {
        if (emt.maxParticles !== 0) {
          emt.oldMaxParticles = emt.maxParticles;
          emt.maxParticles = 0;
        }
      }
    }
    /**
     * Resumes previously paused effect.
     * @returns {void}
     */
    resume() {
      for (const emt of this.emitters) {
        emt.maxParticles = emt.oldMaxParticles || emt.maxParticles;
      }
    }
    /**
     * Removes all the particles from the tandem, but continues spawning new ones.
     * @returns {void}
     */
    clear() {
      for (const emt of this.emitters) {
        emt.cleanup();
      }
    }
    updateFollow() {
      if (!this.follow) {
        return;
      }
      if ("kill" in this.follow && this.follow.kill || !this.follow.scale) {
        this.follow = null;
        this.stop();
        return;
      }
      const delta = u_default.rotate(
        this.deltaPosition.x * this.follow.scale.x,
        this.deltaPosition.y * this.follow.scale.y,
        this.follow.angle
      );
      for (const emitter of this.emitters) {
        emitter.updateOwnerPos(this.follow.x + delta.x, this.follow.y + delta.y);
        const ownDelta = u_default.rotate(
          emitter.initialDeltaPos.x * this.follow.scale.x,
          emitter.initialDeltaPos.y * this.follow.scale.y,
          this.follow.angle
        );
        emitter.updateSpawnPos(ownDelta.x, ownDelta.y);
      }
    }
  };
  var defaultSettings = {
    prewarmDelay: 0,
    scale: {
      x: 1,
      y: 1
    },
    tint: 16777215,
    alpha: 1,
    position: {
      x: 0,
      y: 0
    },
    isUi: false,
    depth: Infinity
  };
  var emittersLib = {
    /**
     * A map of existing emitter templates.
     * @type Array<object>
     * @catnipIgnore
     */
    templates: [
      {}
    ][0] || {},
    /**
     * A list of all the emitters that are simulated in UI time scale.
     * @type Array<EmitterTandem>
     * @catnipIgnore
     */
    uiTandems: [],
    /**
     * A list of all the emitters that are simulated in a regular game loop.
     * @type Array<EmitterTandem>
     * @catnipIgnore
     */
    tandems: [],
    /**
     * Creates a new emitter tandem in the world at the given position.
     * @param {string} name The name of the tandem template, as it was named in ct.IDE.
     * @catnipAsset name:tandem
     * @param {number} x The x coordinate of the new tandem.
     * @param {number} y The y coordinate of the new tandem.
     * @param {ITandemSettings} [settings] Additional configs for the created tandem.
     * @return {EmitterTandem} The newly created tandem.
     * @catnipSaveReturn
     */
    fire(name, x, y, settings2) {
      if (!(name in emittersLib.templates)) {
        throw new Error(`[emitters] An attempt to create a non-existent emitter ${name}.`);
      }
      const opts = Object.assign({}, defaultSettings, settings2);
      const tandem = new EmitterTandem(emittersLib.templates[name], opts);
      tandem.x = x;
      tandem.y = y;
      if (!opts.room) {
        if (!rooms_default.current) {
          throw new Error("[emitters.fire] An attempt to create an emitter before the main room is created.");
        }
        rooms_default.current.addChild(tandem);
        tandem.isUi = rooms_default.current.isUi;
      } else {
        opts.room.addChild(tandem);
        tandem.isUi = opts.room.isUi;
      }
      return tandem;
    },
    /**
     * Creates a new emitter tandem and attaches it to the given copy
     * (or to any other DisplayObject).
     * @param parent The parent of the created tandem.
     * @param name The name of the tandem template.
     * @catnipAsset name:tandem
     * @param [settings] Additional options for the created tandem.
     * @returns {EmitterTandem} The newly created emitter tandem.
     * @catnipSaveReturn
     */
    append(parent, name, settings2) {
      if (!(name in emittersLib.templates)) {
        throw new Error(`[emitters] An attempt to create a non-existent emitter ${name}.`);
      }
      if (!(parent instanceof PIXI.Container)) {
        throw new Error("[emitters] Cannot attach an emitter as the specified parent cannot have child elements.");
      }
      const opts = Object.assign({}, defaultSettings, settings2);
      const tandem = new EmitterTandem(emittersLib.templates[name], opts);
      if (opts.position) {
        tandem.x = opts.position.x;
        tandem.y = opts.position.y;
      }
      tandem.appendant = parent;
      if (!("addChild" in parent)) {
        console.error(parent);
        throw new Error("[emitters] An attempt to append an emitter to an entity that doesn't support children.");
      }
      parent.addChild(tandem);
      return tandem;
    },
    /**
     * Creates a new emitter tandem in the world, and configs it so it will follow a given copy.
     * This includes handling position, scale, and rotation.
     * @param parent The copy to follow.
     * @param name The name of the tandem template.
     * @catnipAsset name:tandem
     * @param [settings] Additional options for the created tandem.
     * @returns The newly created emitter tandem.
     * @catnipSaveReturn
     */
    follow(parent, name, settings2) {
      if (!(name in emittersLib.templates)) {
        throw new Error(`[emitters] An attempt to create a non-existent emitter ${name}.`);
      }
      const opts = Object.assign({}, defaultSettings, settings2);
      const tandem = new EmitterTandem(emittersLib.templates[name], opts);
      tandem.follow = parent;
      tandem.updateFollow();
      if (!("getRoom" in parent)) {
        if (!rooms_default.current) {
          throw new Error("[emitters.fire] An attempt to create an emitter before the main room is created.");
        }
        rooms_default.current.addChild(tandem);
      } else {
        parent.getRoom().addChild(tandem);
      }
      return tandem;
    },
    /**
     * Stops spawning new particles, then destroys the emitter.
     * Can be fired only once, otherwise it will log a warning.
     * @returns {void}
     */
    stop(emitter) {
      emitter.stop();
    },
    /**
     * Stops spawning new particles, but continues simulation and allows to resume
     * the effect later with `emitters.resume(emitter);`
     * @returns {void}
     */
    pause(emitter) {
      emitter.pause();
    },
    /**
     * Resumes previously paused emitter.
     * @returns {void}
     */
    resume(emitter) {
      emitter.resume();
    },
    /**
     * Removes all the particles from the tandem, but continues spawning new ones.
     * @returns {void}
     */
    clear(emitter) {
      emitter.clear();
    }
  };
  PIXI.Ticker.shared.add(() => {
    for (const tandem of emittersLib.uiTandems) {
      tandem.update();
    }
    for (const tandem of emittersLib.tandems) {
      tandem.update();
    }
  });
  var emitters_default = emittersLib;

  // src/ct.release/scripts.ts
  var scriptsLib = {
    'highlight': function (options) {globalThis.highlight = () => {
    if(globalThis.canGo){
        globalThis.canGo.forEach(pos => {
            let _ = templates.copy("highlight", pos.x, pos.y, {alpha : 1})
            _.X = Math.min(7, Math.max(0, Math.round((_.x - globalThis.offset) / 16)))
            _.Y = Math.min(7, Math.max(0, Math.round((_.y - globalThis.offset) / 16)))

            _.gotoAndStop(1)
            if(_.X%2 == 0 && _.Y%2==0){
                _.gotoAndStop(0)
            } else if(_.X%2 != 0 && _.Y%2 != 0){
                _.gotoAndStop(0)
            }
        })
    }
}
},'lowlight': function (options) {globalThis.lowlight = (options) => {
    globalThis.canGo = []
    templates.list['highlight'].forEach(p => p.kill = true)
    templates.list['Piece'].forEach(p =>{
        p.tex = `P${p.pts}_N`
        p.gotoAndStop(p.frame)
    })
};},'pawnMoves': function (options) {globalThis.pawnMoves = (pawn) => {
    let x = pawn.x;
    let y = pawn.y;
    let moved = pawn.moved;
    let one = place.meet(pawn, x, y + (pawn.pts == "W" ? -16 : 16), 'Piece');
    let two = place.meet(pawn, x, y + (pawn.pts == "W" ? -32 : 32), 'Piece');
    

    if (!templates.isCopy(one)) {
        globalThis.canGo.push({x, y: y + (pawn.pts == "W" ? -16 : 16)})
        if (!moved) {
            if (!templates.isCopy(two)) {
                globalThis.canGo.push({x, y: y + (pawn.pts == "W" ? -32 : 32)})
            }
        }
    }

    y = y + (pawn.pts == "W" ? -16 : 16)

    two = place.meet(pawn, x + 16, y, 'Piece');
    if (templates.isCopy(two)) {
        globalThis.canGo.push({x: x + 16, y })
    }

    two = place.meet(pawn, x - 16, y, 'Piece');
    if (templates.isCopy(two)) {
        globalThis.canGo.push({x: x - 16, y })
    }
}},'bishopMoves': function (options) {globalThis.bishopMoves = (bishop) => {
    let x = bishop.x;
    let y = bishop.y;
    
    //Right Up
    for(let Y = -1; Y < 0; Y--){
        let X = Math.abs(Y)
        if(bishop.Y + Y == -1 || bishop.X + X == 8) break
        let p = place.meet(bishop, x + X * 16, y + Y * 16, 'Piece');
        if (!templates.isCopy(p)) {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
        } else {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
            break
        }
    }

    //Right Down
    for(let Y = 1; Y < 8; Y++){
        let X = Y
        if(bishop.Y + Y == 8 || bishop.X + X == 8) break
        let p = place.meet(bishop, x + X * 16, y + Y * 16, 'Piece');
        if (!templates.isCopy(p)) {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
        } else {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
            break
        }
    }

    //Left Down
    for(let Y = 1; Y < 8; Y++){
        let X = Y * -1
        if(bishop.Y + Y == 8 || bishop.X + X == -1) break
        let p = place.meet(bishop, x + X * 16, y + Y * 16, 'Piece');
        if (!templates.isCopy(p)) {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
        } else {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
            break
        }
    }

    //Left Up
    for(let Y = -1; Y < 0; Y--){
        let X = Y
        if(bishop.Y + Y == -1 || bishop.X + X == -1) break
        let p = place.meet(bishop, x + X * 16, y + Y * 16, 'Piece');
        if (!templates.isCopy(p)) {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
        } else {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
            break
        }
    }
}},'kingMoves': function (options) {globalThis.kingMoves = (king) => {
    let x = king.x;
    let y = king.y;
    
    for(let Y = -1; Y < 2; Y++){
        if(king.Y + Y == -1 || king.Y + Y == 8) continue
        for(let X = -1; X < 2; X++){
            if(king.X + X == -1 || king.X + X == 8) continue
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
        }   
    }
}},'moves': function (options) {globalThis.moves = (piece) => {
    switch(piece.frame){
        case 0:
            globalThis.pawnMoves(piece)
            break
        case 1:
            globalThis.horseMoves(piece)
            break
        case 2:
            globalThis.towerMoves(piece)
            break
        case 3:
            globalThis.bishopMoves(piece)
            break
        case 4:
            globalThis.queenMoves(piece)
            break
        case 5:
            globalThis.kingMoves(piece)
            break
    }
}},'towerMoves': function (options) {globalThis.towerMoves = (tower) => {
    let x = tower.x;
    let y = tower.y;
    
    //Up
    for(let Y = -1; Y > -8; Y--){
        if(tower.Y + Y == -1) break
        let one = place.meet(tower, x, y + Y * 16, 'Piece');
        if (!templates.isCopy(one)) {
            globalThis.canGo.push({x , y: y + Y * 16})
        } else {
            globalThis.canGo.push({x , y: y + Y * 16})
            break
        }
    }

    //Right
    for(let X = 1; X < 8; X++){
        if(tower.X + X >= 8) break
        let one = place.meet(tower, x + X * 16, y, 'Piece');
        if (!templates.isCopy(one)) {
            globalThis.canGo.push({x: x + X * 16 , y})
        } else {
            globalThis.canGo.push({x: x + X * 16 , y})
            break
        }
    }

    //Down
    for(let Y = 1; Y < 8; Y++){
        if(tower.Y + Y >= 8) break
        let one = place.meet(tower, x, y + Y * 16, 'Piece');
        if (!templates.isCopy(one)) {
            globalThis.canGo.push({x , y: y + Y * 16})
        } else {
            globalThis.canGo.push({x , y: y + Y * 16})
            break
        }
    }

    //Left
    for(let X = -1; X > -8; X--){
        if(tower.X + X == -1) break
        let one = place.meet(tower, x + X * 16, y, 'Piece');
        if (!templates.isCopy(one)) {
            globalThis.canGo.push({x: x + X * 16 , y: y})
        } else {
            globalThis.canGo.push({x: x + X * 16 , y})
            break
        }
    }
}},'horseMoves': function (options) {globalThis.horseMoves = (horse) => {
    let x = horse.x;
    let y = horse.y;

    let X, Y;
    let one;

    //Up
    Y = -2*16
    if(horse.Y -2 > -1){
        for(let _ = -1; _ < 2; _+=2){
            if(horse.X + _ == -1 || horse.X + _ == 8) continue
            X = _ * 16
            globalThis.canGo.push({x: x + X, y: y + Y})
        }
    }

    //Right
    X = 2*16
    if(horse.X +2 < 8){
        for(let _ = -1; _ < 2; _+=2){
            if(horse.Y + _ == -1 || horse.Y + _ == 8) continue
            Y = _ * 16
            globalThis.canGo.push({x: x + X, y: y + Y})
        }
    }

    //Down
    Y = 2*16
    if(horse.Y +2 < 8){
        for(let _ = -1; _ < 2; _+=2){
            if(horse.X + _ == -1 || horse.X + _ == 8) continue
            X = _ * 16
            globalThis.canGo.push({x: x + X, y: y + Y})
        }
    }

    //Left
    X = -2*16
    if(horse.X -2 > -1){
        for(let _ = -1; _ < 2; _+=2){
            if(horse.Y + _ == -1 || horse.Y + _ == 8) continue
            Y = _ * 16
            globalThis.canGo.push({x: x + X, y: y + Y})
        }
    }
}
},'queenMoves': function (options) {globalThis.queenMoves = (queen) => {
    let x = queen.x
    let y = queen.y
    
    //Up
    for(let Y = -1; Y > -8; Y--){
        if(queen.Y + Y == -1) break
        let one = place.meet(queen, x, y + Y * 16, 'Piece');
        if (!templates.isCopy(one)) {
            globalThis.canGo.push({x , y: y + Y * 16}) 
        } else {
            globalThis.canGo.push({x , y: y + Y * 16})
            break
        }
    }

    //Right Up
    for(let Y = -1; Y < 0; Y--){
        let X = Math.abs(Y)
        if(queen.Y + Y == -1 || queen.X + X == 8) break
        let p = place.meet(queen, x + X * 16, y + Y * 16, 'Piece');
        if (!templates.isCopy(p)) {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
        } else {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
            break
        }
    }

    //Right
    for(let X = 1; X < 8; X++){
        if(queen.X + X >= 8) break
        let one = place.meet(queen, x + X * 16, y, 'Piece');
        if (!templates.isCopy(one)) {
            globalThis.canGo.push({x: x + X * 16 , y})
        } else {
            globalThis.canGo.push({x: x + X * 16 , y})
            break
        }
    }

    //Right Down
    for(let Y = 1; Y < 8; Y++){
        let X = Y
        if(queen.Y + Y == 8 || queen.X + X == 8) break
        let p = place.meet(queen, x + X * 16, y + Y * 16, 'Piece');
        if (!templates.isCopy(p)) {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
        } else {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
            break
        }
    }

    //Down
    for(let Y = 1; Y < 8; Y++){
        if(queen.Y + Y >= 8) break
        let one = place.meet(queen, x, y + Y * 16, 'Piece');
        if (!templates.isCopy(one)) {
            globalThis.canGo.push({x , y: y + Y * 16})
        } else {
            globalThis.canGo.push({x , y: y + Y * 16})
            break
        }
    }

    //Left Down
    for(let Y = 1; Y < 8; Y++){
        let X = Y * -1
        if(queen.Y + Y == 8 || queen.X + X == -1) break
        let p = place.meet(queen, x + X * 16, y + Y * 16, 'Piece');
        if (!templates.isCopy(p)) {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
        } else {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
            break
        }
    }

    //Left
    for(let X = -1; X > -8; X--){
        if(queen.X + X == -1) break
        let one = place.meet(queen, x + X * 16, y, 'Piece');
        if (!templates.isCopy(one)) {
            globalThis.canGo.push({x: x + X * 16 , y: y})
        } else {
            globalThis.canGo.push({x: x + X * 16 , y: y})
            break
        }
    }

    //Left Up
    for(let Y = -1; Y < 0; Y--){
        let X = Y
        if(queen.Y + Y == -1 || queen.X + X == -1) break
        let p = place.meet(queen, x + X * 16, y + Y * 16, 'Piece');
        if (!templates.isCopy(p)) {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
        } else {
            globalThis.canGo.push({x: x + X * 16, y: y + Y * 16})
            break
        }
    }
}},'validateMove': function (options) {let turns = {
    W : "B",
    B : "W"
}

let P = {
    W: {X:0,Y:0, off: 43 - 32},
    B: {X:0,Y:0, off: 53 + 16*8}
}

globalThis.validateMove = (piece) => {
    if(globalThis.turn != piece.pts) return sendBack(piece)

    let _ = place.meet(piece, "Piece")
    if(_ && _.pts == piece.pts){
        //do the castling
        let king;
        let tower;

        if(_.frame == 5 && piece.frame == 2){
            king = _
            tower = piece
        } else if (_.frame == 2 && piece.frame == 5){
            king = piece
            tower = _
        } else return false

        if(king.Y != tower.Y || king.moved || tower.moved) return false

        if(king.X > tower.X){
            if(place.meet(tower, tower.x+16, tower.y, "Piece")) return
            if(place.meet(tower, tower.x+32, tower.y, "Piece")) return
            if(place.meet(tower, tower.x+48, tower.y, "Piece")) return
            king.X -= 3
            tower.X += 2
            sendBack(king)
            sendBack(tower)
            if(globalThis.isInCheck(king)){
                king.X += 3
                tower.X -= 2
                sendBack(king)
                sendBack(tower)
            } else {
                king.moved = true
                tower.moved = true
                globalThis.turn = turns[piece.pts]
                return true
            }
        } else {
            if(place.meet(king, king.x+16, king.y, "Piece")) return
            if(place.meet(king, king.x+32, king.y, "Piece")) return
            king.X += 2
            tower.X -= 2
            sendBack(king)
            sendBack(tower)
            if(globalThis.isInCheck(king)){
                king.X -= 2
                tower.X += 2
                sendBack(king)
                sendBack(tower)
                
            }else{
                king.moved = true
                tower.moved = true
                globalThis.turn = turns[piece.pts]
                return true
            }
        }
    }

    if(!place.occupied(piece, "place")) {
        sendBack(piece)
        return false
    }

    
    if(_) _.eaten = true

    if(globalThis.isKingInCheck(piece.pts)){
        sendBack(piece)
        if(_) _.eaten = false
        return false
    }

    if(_){
        let p = templates.copy('placeholder', globalThis.offset + P[_.pts].X*16, P[_.pts].off + P[_.pts].Y*16)
        p.tex = `P${_.pts}`
        p.gotoAndStop(_.frame)
        P[_.pts].X++

        if(P[_.pts].X == 8){
            P[_.pts].X = 0
            P[_.pts].Y++
        }
        _.kill = true
    }

    globalThis.turn = turns[piece.pts]
    piece.X = clamp(0, (piece.x - globalThis.offset) / 16, 7)
    piece.Y = clamp(0, (piece.y - globalThis.offset) / 16, 7)

    if(piece.frame == 0){
        if(piece.Y == 0 || piece.Y == 7){
            globalThis.pawn = piece
            piece.dragging = false
            templates.copy('shadow', 104, 104)
            templates.copy('select', camera.right/2 - 48, camera.bottom/2, {frame:0, tex: `select_${piece.pts}`})
            templates.copy('select', camera.right/2 - 16, camera.bottom/2, {frame:1, tex: `select_${piece.pts}`})
            templates.copy('select', camera.right/2 + 16, camera.bottom/2, {frame:2, tex: `select_${piece.pts}`})
            templates.copy('select', camera.right/2 + 48, camera.bottom/2, {frame:3, tex: `select_${piece.pts}`})
        }
    }

    return true
}

function sendBack(piece){
    piece.x = (piece.X * 16) + globalThis.offset
    piece.y = (piece.Y * 16) + globalThis.offset
}

function clamp(min,x,max){
    return Math.min(max, Math.max(min, x))
}},'isInCheck': function (options) {//1: 83
//2: 125
//121

globalThis.isInCheck = (piece) => {
    let {x, y} = piece;
    let X, Y;

    let enemyPiece;

    let frames = ["pawn", "horse", "tower", "bishop", "queen", "king"]

    //Up
    for(let Y = -1; Y > -8; Y--){
        if(piece.Y + Y == -1) break
        enemyPiece = place.meet(piece, x, y + Y * 16, 'Piece');
        if (templates.isCopy(enemyPiece)) {
            if(enemyPiece.pts == piece.pts) break
            if(frames[enemyPiece.frame] == "tower" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "queen" && !enemyPiece.eaten) return true
        }
    }

    //Right Up
    for(let Y = -1; Y < 0; Y--){
        let X = Math.abs(Y)
        if(piece.Y + Y == -1 || piece.X + X == 8) break
        enemyPiece = place.meet(piece, x + X * 16, y + Y * 16, 'Piece');
        if (templates.isCopy(enemyPiece)) {
            if(enemyPiece.pts == piece.pts) break
            if(frames[enemyPiece.frame] == "bishop" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "queen" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "pawn" &&
                Math.abs(piece.X - X) == 1 &&
                Math.abs(piece.Y - Y) == 1 && !enemyPiece.eaten) return true
        }
    }

    //Right
    for(let X = 1; X < 8; X++){
        if(piece.X + X >= 8) break
        enemyPiece = place.meet(piece, x + X * 16, y, 'Piece');
        if (templates.isCopy(enemyPiece)) {
            if(enemyPiece.pts == piece.pts) break
            if(frames[enemyPiece.frame] == "tower" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "queen" && !enemyPiece.eaten) return true
        }
    }

    //Right Down
    for(let Y = 1; Y < 8; Y++){
        let X = Y
        if(piece.Y + Y == 8 || piece.X + X == 8) break
        enemyPiece = place.meet(piece, x + X * 16, y + Y * 16, 'Piece');
        if (templates.isCopy(enemyPiece)) {
            if(enemyPiece.pts == piece.pts) break
            if(frames[enemyPiece.frame] == "bishop" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "queen" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "pawn" &&
                Math.abs(piece.X - X) == 1 &&
                Math.abs(piece.Y - Y) == 1 && !enemyPiece.eaten) return true
        }
    }

    //Down
    for(let Y = 1; Y < 8; Y++){
        if(piece.Y + Y >= 8) break
        enemyPiece = place.meet(piece, x, y + Y * 16, 'Piece');
        if (templates.isCopy(enemyPiece)) {
            if(enemyPiece.pts == piece.pts) break
            if(frames[enemyPiece.frame] == "tower" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "queen" && !enemyPiece.eaten) return true
        }
    }

    //Left Down
    for(let Y = 1; Y < 8; Y++){
        let X = Y * -1
        if(piece.Y + Y == 8 || piece.X + X == -1) break
        enemyPiece = place.meet(piece, x + X * 16, y + Y * 16, 'Piece');
        if (templates.isCopy(enemyPiece)) {
            if(enemyPiece.pts == piece.pts) break
            if(frames[enemyPiece.frame] == "bishop" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "queen" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "pawn" &&
                Math.abs(piece.X - X) == 1 &&
                Math.abs(piece.Y - Y) == 1 && !enemyPiece.eaten) return true
        }
    }

    //Left
    for(let X = -1; X > -8; X--){
        if(piece.X + X == -1) break
        enemyPiece = place.meet(piece, x + X * 16, y, 'Piece');
        if (templates.isCopy(enemyPiece)) {
            if(enemyPiece.pts == piece.pts) break
            if(frames[enemyPiece.frame] == "tower" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "queen" && !enemyPiece.eaten) return true
        }
    }

    //Left Up
    for(let Y = -1; Y < 0; Y--){
        let X = Y
        if(piece.Y + Y == -1 || piece.X + X == -1) break
        enemyPiece = place.meet(piece, x + X * 16, y + Y * 16, 'Piece');
        if (templates.isCopy(enemyPiece)) {
            if(enemyPiece.pts == piece.pts) break
            if(frames[enemyPiece.frame] == "bishop" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "queen" && !enemyPiece.eaten) return true
            if(frames[enemyPiece.frame] == "pawn" &&
                Math.abs(piece.X - X) == 1 &&
                Math.abs(piece.Y - Y) == 1 && !enemyPiece.eaten) return true
        }
    }

    //Up
    Y = -2*16
    if(piece.Y -2 > -1){
        for(let _ = -1; _ < 2; _+=2){
            X = _ * 16
            enemyPiece = place.meet(piece, x + X, y + Y, 'Piece');
            if(piece.X + _ == -1 || piece.X + _ == 8) continue
            if(enemyPiece.pts == piece.pts) continue
            if(frames[enemyPiece.frame] == "horse" && !enemyPiece.eaten) return true
        }
    }

    //Right
    X = 2*16
    if(piece.X +2 < 8){
        for(let _ = -1; _ < 2; _+=2){
            Y = _ * 16
            enemyPiece = place.meet(piece, x + X, y + Y, 'Piece');
            if(piece.Y + _ == -1 || piece.Y + _ == 8) continue
            if(enemyPiece.pts == piece.pts) continue
            if(frames[enemyPiece.frame] == "horse" && !enemyPiece.eaten) return true
        }
    }

    //Down
    Y = 2*16
    if(piece.Y +2 < 8){
        for(let _ = -1; _ < 2; _+=2){
            X = _ * 16
            enemyPiece = place.meet(piece, x + X, y + Y, 'Piece');
            if(piece.X + _ == -1 || piece.X + _ == 8) continue
            if(enemyPiece.pts == piece.pts) continue
            if(frames[enemyPiece.frame] == "horse" && !enemyPiece.eaten) return true
        }
    }

    //Left
    X = -2*16
    if(piece.X -2 > -1){
        for(let _ = -1; _ < 2; _+=2){
            Y = _ * 16
            enemyPiece = place.meet(piece, x + X, y + Y, 'Piece');
            if(piece.Y + _ == -1 || piece.Y + _ == 8) continue
            if(enemyPiece.pts == piece.pts) continue
            if(frames[enemyPiece.frame] == "horse" && !enemyPiece.eaten) return true
        }
    }

    return false
}

globalThis.isKingInCheck = (pts) => {
    let piece = templates.list['Piece'].find((piece) => piece.pts == pts && piece.frame == 5)
    return globalThis.isInCheck(piece)
}},'start': function (options) {let _ = templates.copy('button', 187, 19)
_.action = () => {
    templates.list['button'].forEach(b => {if(b.x != _.x && b.y != _.y) b.kill = true})
    templates.list['shadow'].forEach(s => s.kill = true)

    let back = templates.copy('shadow', 104, 104)
    let one = templates.copy('button', camera.right/2 - 15, camera.bottom/2, {tex:"b1", zIndex: 20})
    let two = templates.copy('button', camera.right/2 + 15, camera.bottom/2, {tex:"b2", zIndex: 20})
    one.action = () => rooms.restart()
    two.action = () => {
        back.kill = one.kill = two.kill = true
        back.aplha = one.alpha = two.alpha = 0
    }
}},
  };

  // src/ct.release/errors.ts
  var errors = 0;
  var mute = ![
    true
  ][0];
  var reportLink = [
    ""
  ][0];
  var errorsContainer = document.querySelector(".ct-Errors");
  var tooManyErrors;
  var copyContent = function() {
    const errorHeader = this.nextSibling;
    const errorBody = errorHeader.nextSibling;
    navigator.clipboard.writeText(`${errorHeader.innerText}
${errorBody.innerText}`);
  };
  var hideErrors = function() {
    const parent = this.parentNode;
    parent.style.display = "none";
    mute = true;
  };
  var onError = function(ev) {
    if (mute) {
      return;
    }
    if (!errors) {
      const hideButton = document.createElement("button");
      hideButton.innerText = "\u274C";
      hideButton.style.fontSize = "80%";
      hideButton.addEventListener("click", hideErrors);
      const header = document.createElement("b");
      header.innerHTML = "\u{1F63F} An error has occurred: ";
      errorsContainer.appendChild(hideButton);
      errorsContainer.appendChild(header);
      if (reportLink) {
        const reportA = document.createElement("a");
        reportA.innerText = "Report this issue \u2197\uFE0F";
        reportA.href = reportLink;
        reportA.target = "_blank";
        errorsContainer.appendChild(reportA);
      }
      errorsContainer.style.display = "block";
    }
    errors++;
    if (errors <= 50) {
      const errorBlock = document.createElement("div");
      errorBlock.className = "ct-anError";
      const errorHeader = document.createElement("b");
      errorHeader.innerHTML = `In position ${ev.lineno}:${ev.colno} of <a href="${ev.filename}" target="_blank">${ev.filename}</a>`;
      const errorCopy = document.createElement("button");
      errorCopy.innerText = "\u{1F4CB} Copy";
      errorCopy.addEventListener("click", copyContent);
      const errorBody = document.createElement("div");
      errorBody.innerText = `${ev.message}
${ev.error?.stack ?? "(no stack available)"}`;
      errorBlock.appendChild(errorCopy);
      errorBlock.appendChild(errorHeader);
      errorBlock.appendChild(errorBody);
      errorsContainer.appendChild(errorBlock);
    } else if (!tooManyErrors) {
      tooManyErrors = document.createElement("div");
      tooManyErrors.className = "ct-anError";
      tooManyErrors.innerText = `Too many errors (${errors}).`;
      errorsContainer.appendChild(tooManyErrors);
    } else {
      tooManyErrors.innerText = `Too many errors (${errors}).`;
    }
  };
  var mount = () => {
    window.addEventListener("error", onError);
  };

  // src/ct.release/index.ts
  /*! Made with ct.js http://ctjs.rocks/ */
  console.log(
    "%c \u{1F63A} %c ct.js game engine %c v5.0.1 %c https://ctjs.rocks/ ",
    "background: #446adb; color: #fff; padding: 0.5em 0;",
    "background: #5144db; color: #fff; padding: 0.5em 0;",
    "background: #446adb; color: #fff; padding: 0.5em 0;",
    "background: #5144db; color: #fff; padding: 0.5em 0;"
  );
  try {
    __require("electron");
  } catch {
    try {
      __require("electron/main");
    } catch {
      if (location.protocol === "file:") {
        alert("Your game won't work like this because\nWeb \u{1F44F} builds \u{1F44F} require \u{1F44F} a web \u{1F44F} server!\n\nConsider using a desktop build, or upload your web build to itch.io, GameJolt or your own website.\n\nIf you haven't created this game, please contact the developer about this issue.\n\n Also note that ct.js games do not work inside the itch app; you will need to open the game with your browser of choice.");
      }
    }
  }
  if ("NL_OS" in window) {
    Neutralino.init();
    if ([
      true
    ][0]) {
      Neutralino.events.on("windowClose", () => {
        Neutralino.app.exit();
      });
    }
  }
  var deadPool = [];
  var copyTypeSymbol = Symbol("I am a ct.js copy");
  var forceDestroy = /* @__PURE__ */ new Set();
  setInterval(function cleanDeadPool() {
    deadPool.length = 0;
  }, 1e3 * 60);
  var meta = [
    {"name":"chess","author":"","site":"","version":"0.0.0"}
  ][0];
  var currentViewMode = "scaleFill";
  var currentHighDPIMode = Boolean([
    true
  ][0]);
  var settings = {
    /** If set to true, enables retina (high-pixel density) rendering. */
    get highDensity() {
      return currentHighDPIMode;
    },
    set highDensity(value) {
      currentHighDPIMode = value;
      if (currentHighDPIMode) {
        PIXI.settings.RESOLUTION = window.devicePixelRatio;
      } else {
        PIXI.settings.RESOLUTION = 1;
      }
      if (rooms_default.current) {
        updateViewport();
      }
    },
    /** A target number of frames per second. */
    get targetFps() {
      return pixiApp.ticker.maxFPS;
    },
    set targetFps(value) {
      pixiApp.ticker.maxFPS = value;
    },
    /**
     * A string that indicates the current scaling approach (can be changed).
     * Possible options:
     *
     * * `asIs` — disables any viewport management; the rendered canvas
     * will be placed as is in the top-left corner.
     * * `fastScale` — the viewport will proportionally fill the screen
     * without changing the resolution.
     * * `fastScaleInteger` — the viewport will be positioned at the middle
     * of the screen, and will be scaled by whole numbers (x2, x3, x4 and so on).
     * * `expand` — the viewport will fill the whole screen. The camera will
     * expand to accommodate the new area.
     * * `scaleFit` — the viewport will proportionally fill the screen, leaving letterboxes
     * around the base viewport. The resolution is changed to match the screen.
     * * `scaleFill` — the viewport fills the screen, expanding the camera to avoid letterboxing.
     * The resolution is changed to match the screen.
     */
    get viewMode() {
      return currentViewMode;
    },
    set viewMode(value) {
      currentViewMode = value;
      updateViewport();
    },
    /**
     * A boolean property that can be changed to exit or enter fullscreen mode.
     * In web builds, you can only change this value in pointer events of your templates.
     */
    get fullscreen() {
      return getIsFullscreen();
    },
    set fullscreen(value) {
      if (getIsFullscreen() !== value) {
        toggleFullscreen();
      }
    },
    get pixelart() {
      return [
        true
      ][0];
    },
    /**
     * Sets whether ct.js should prevent default behavior of pointer and keyboard events.
     * This is usually needed to prevent accidental zooming in page or scrolling.
     */
    preventDefault: true
  };
  var stack = [];
  var pixiApp;
  {
    const pixiAppSettings = {
      width: [
        208
      ][0],
      height: [
        208
      ][0],
      antialias: ![
        true
      ][0],
      powerPreference: "high-performance",
      autoDensity: false,
      sharedTicker: false,
      backgroundAlpha: [
        false
      ][0] ? 0 : 1
    };
    PIXI.settings.RESOLUTION = 1;
    try {
      pixiApp = new PIXI.Application(pixiAppSettings);
    } catch (e) {
      console.error(e);
      console.warn("[ct.js] Something bad has just happened. This is usually due to hardware problems. I'll try to fix them now, but if the game still doesn't run, try including a legacy renderer in the project's settings.");
      PIXI.settings.SPRITE_MAX_TEXTURES = Math.min(PIXI.settings.SPRITE_MAX_TEXTURES || 16, 16);
      pixiApp = new PIXI.Application(pixiAppSettings);
    }
    PIXI.settings.ROUND_PIXELS = [
      true
    ][0];
    if (!pixiApp.renderer.options.antialias) {
      PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    }
    settings.targetFps = [
      60
    ][0] || 60;
    document.getElementById("ct").appendChild(pixiApp.view);
  }
  var loading;
  {
    const killRecursive = (copy) => {
      copy.kill = true;
      if (templates_default.isCopy(copy) && copy.onDestroy) {
        templates_default.onDestroy.apply(copy);
        copy.onDestroy.apply(copy);
      }
      if (copy.children) {
        for (const child of copy.children) {
          if (templates_default.isCopy(child)) {
            killRecursive(child);
          }
        }
      }
      const stackIndex = stack.indexOf(copy);
      if (stackIndex !== -1) {
        stack.splice(stackIndex, 1);
      }
      if (templates_default.isCopy(copy) && copy.template) {
        if (copy.template) {
          const { template } = copy;
          if (template) {
            const templatelistIndex = templates_default.list[template].indexOf(copy);
            if (templatelistIndex !== -1) {
              templates_default.list[template].splice(templatelistIndex, 1);
            }
          }
        }
      }
      deadPool.push(copy);
    };
    const manageCamera = () => {
      camera_default.update(u_default.timeUi);
      camera_default.manageStage();
    };
    const loop = () => {
      const { ticker } = pixiApp;
      u_default.delta = ticker.deltaMS / (1e3 / (settings.targetFps || 60));
      u_default.deltaUi = ticker.elapsedMS / (1e3 / (settings.targetFps || 60));
      u_default.time = ticker.deltaMS / 1e3;
      u_default.timeUi = u_default.timeUI = ticker.elapsedMS / 1e3;
      inputsLib.updateActions();
      timer_default.updateTimers();
      place.debugTraceGraphics.clear();

      rooms_default.rootRoomOnStep.apply(rooms_default.current);
      for (let i = 0, li = stack.length; i < li; i++) {
        templates_default.isCopy(stack[i]) && templates_default.beforeStep.apply(stack[i]);
        stack[i].onStep.apply(stack[i]);
        templates_default.isCopy(stack[i]) && templates_default.afterStep.apply(stack[i]);
      }
      for (const item of pixiApp.stage.children) {
        if (!(item instanceof Room)) {
          continue;
        }
        rooms_default.beforeStep.apply(item);
        item.onStep.apply(item);
        rooms_default.afterStep.apply(item);
      }
      for (const copy of stack) {
        if (copy.kill && !copy._destroyed) {
          killRecursive(copy);
          copy.destroy({
            children: true
          });
        }
      }
      manageCamera();
      for (let i = 0, li = stack.length; i < li; i++) {
        templates_default.isCopy(stack[i]) && templates_default.beforeDraw.apply(stack[i]);
        stack[i].onDraw.apply(stack[i]);
        templates_default.isCopy(stack[i]) && templates_default.afterDraw.apply(stack[i]);
        stack[i].xprev = stack[i].x;
        stack[i].yprev = stack[i].y;
      }
      for (const item of pixiApp.stage.children) {
        if (!(item instanceof Room)) {
          continue;
        }
        rooms_default.beforeDraw.apply(item);
        item.onDraw.apply(item);
        rooms_default.afterDraw.apply(item);
      }
      rooms_default.rootRoomOnDraw.apply(rooms_default.current);
      /*!%afterframe%*/
      if (rooms_default.switching) {
        rooms_default.forceSwitch();
      }
    };
    loading = res_default.loadGame();
    loading.then(() => {
      setTimeout(() => {
        pixiApp.ticker.add(loop);
        rooms_default.forceSwitch(rooms_default.starting);
      }, 0);
    });
  }
  window.PIXI = PIXI;
  mount();
  let dragging, pawnMove, canGo, highlight, lowlight, offset;
  {
    const actions = actionsLib;
    const backgrounds = backgrounds_default;
    const behaviors = behaviors_default;
    const camera2 = camera_default;
    const content = content_default;
    const emitters = emitters_default;
    const inputs = inputsLib;
    const res = res_default;
    const rooms = rooms_default;
    const scripts = scriptsLib;
    const sounds = sounds_default;
    const styles = styles_default;
    const templates = templates_default;
    const tilemaps = tilemaps_default;
    const timer = timer_default;
    const u = u_default;
    Object.assign(window, {
      actions,
      backgrounds,
      behaviors,
      Camera,
      camera: camera2,
      CtAction,
      content,
      emitters,
      inputs,
      res,
      rooms,
      scripts,
      sounds,
      styles,
      templates,
      Tilemap,
      tilemaps,
      timer,
      u,
      meta,
      settings,
      pixiApp
    });
    loading.then(() => {
      pointer.setupListeners();

    });
    
    
    
    
templates.templates["Piece"] = {
    name: "Piece",
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    visible: true,
    baseClass: "AnimatedSprite",
    
            texture: "PW_N",
        animationFPS: 30,
        playAnimationOnStart: false,
        loopAnimation: false,
    behaviors: JSON.parse('[]'),
    onStep: function () {
        /* template Piece — core_OnStep (On frame start event) */
{
this.zIndex = Math.min(7, Math.max(0, Math.round(((this['y'] - offset) / 16))));
if (this['dragging']) {
    this.x = (offset + (Math.min(7, Math.max(0, Math.round(((pointer.x - offset) / 16)))) * 16));
this.y = (offset + (Math.min(7, Math.max(0, Math.round(((pointer.y - offset) / 16)))) * 16));
if(place.meet(this, "Piece")){
    this.zIndex = 999
}

}

}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template Piece — core_OnCreate (On create event) */
{
this['dragging'] = false;
this.tex =
    this.pts
        ? `P${this.pts}_N`
        : "PW_N"
// console.log(this.tex)
if (!this['frame']) {
    this['frame'] = 0;
}
this.gotoAndStop(Number(this['frame']));
this['moved'] = false;
this['cgroup'] = this['pts'];
this['start'] = {
X: this['X'],
Y: this['Y']
};
this.zIndex = this['Y'];

}
/* template Piece — core_OnPointerDown (OnPointerDown event) */
this.eventMode = 'dynamic';
this.on('pointerdown', () => {
    
let trash, offset;
if ((!this['dragging'] && !dragging)) {
    dragging = true;
this['dragging'] = true;
globalThis.moves(this)
globalThis.highlight()

} else {
    if ((this['dragging'] && dragging)) {
    if(globalThis.validateMove(this) && !this.moved){
    this.moved = true
}
globalThis.lowlight()
dragging = false;
this['dragging'] = false;

}
}

});

    },
    extends: {
    "cgroup": "W"
}
};
templates.list['Piece'] = [];
        
templates.templates["placeholder"] = {
    name: "placeholder",
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    visible: true,
    baseClass: "AnimatedSprite",
    
            texture: "PW",
        animationFPS: 30,
        playAnimationOnStart: false,
        loopAnimation: true,
    behaviors: JSON.parse('[]'),
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template placeholder — core_OnCreate (On create event) */
{
this.tex =
    this.pts
        ? `P${this.pts}`
        : "PW"
// console.log(this.tex)
if (!this['frame']) {
    this['frame'] = 0;
}
this.gotoAndStop(Number(this['frame']));

}

    },
    extends: {}
};
templates.list['placeholder'] = [];
        
templates.templates["select"] = {
    name: "select",
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    visible: true,
    baseClass: "AnimatedSprite",
    
            texture: "select_W",
        animationFPS: 30,
        playAnimationOnStart: false,
        loopAnimation: true,
    behaviors: JSON.parse('[]'),
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template select — core_OnPointerDown (OnPointerDown event) */
this.eventMode = 'dynamic';
this.on('pointerdown', () => {
    
globalThis.pawn.frame = this.frame + 1
globalThis.pawn.gotoAndStop(globalThis.pawn.frame)
templates.list['select'].forEach(s => s.kill = true)
templates.list['shadow'][0].kill = true

});
/* template select — core_OnCreate (On create event) */
{
this.zIndex = 20;
this.gotoAndStop(this['frame']);

}

    },
    extends: {}
};
templates.list['select'] = [];
        
templates.templates["board"] = {
    name: "board",
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    visible: true,
    baseClass: "AnimatedSprite",
    
            texture: "screen_board",
        animationFPS: 30,
        playAnimationOnStart: false,
        loopAnimation: true,
    behaviors: JSON.parse('[]'),
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template board — core_OnCreate (On create event) */
{
this.tex = 'main_board';
}

    },
    extends: {}
};
templates.list['board'] = [];
        
templates.templates["builder"] = {
    name: "builder",
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    visible: true,
    baseClass: "AnimatedSprite",
    
            texture: -1,
        animationFPS: 30,
        playAnimationOnStart: false,
        loopAnimation: true,
    behaviors: JSON.parse('[]'),
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template builder — core_OnCreate (On create event) */
{
let off, X, Y, posX, posY, trash, frames, frame;
dragging = false;
frames = {
0: 2,
1: 1,
2: 3,
3: 4,
4: 5,
5: 3,
6: 1,
7: 2
};
globalThis.canGo = []
globalThis.offset = 48
globalThis.turn = "W"
off = 48;
offset = off;
for (Y = 0; Y < 2; Y++) {
    posY = (offset + (Y * 16));
for (X = 0; X < 8; X++) {
    if ((Y < 1)) {
    frame = String(X);
} else {
    frame = -1;
}
posX = (off + (X * 16));
trash = templates.copy('Piece', posX, posY, {
frame: frames[frame],
pts: "B",
X: X,
Y: Y
});

}

}
for (Y = 0; Y < 2; Y++) {
    posY = (off + ((Y + 6) * 16));
for (X = 0; X < 8; X++) {
    if ((Y > 0)) {
    frame = String(X);
} else {
    frame = -1;
}
posX = (off + (X * 16));
trash = templates.copy('Piece', posX, posY, {
frame: frames[frame],
pts: "W",
X: X,
Y: (Y + 6)
});

}

}
scripts['start']();

}

    },
    extends: {
    "cgroup": ""
}
};
templates.list['builder'] = [];
        
templates.templates["highlight"] = {
    name: "highlight",
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    visible: true,
    baseClass: "AnimatedSprite",
    
            texture: "greenLight",
        animationFPS: 30,
        playAnimationOnStart: false,
        loopAnimation: true,
    behaviors: JSON.parse('[]'),
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template highlight — core_OnCreate (On create event) */
{
if (place.meet(this, this['x'], this['y'], 'Piece')) {
    let _ = templates.list['Piece'].find((v) => v.dragging)
let $ = place.meet(this, 'Piece')
if(_ && $.pts != _.pts){
    $.tex = `P${$.pts}_C`
    $.gotoAndStop($.frame)
    this.alpha = 0
} else if(_){
    this.alpha = 0
    this.kill = true 
}
}
}

    },
    extends: {
    "cgroup": "place"
}
};
templates.list['highlight'] = [];
        
templates.templates["shadow"] = {
    name: "shadow",
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    visible: true,
    baseClass: "AnimatedSprite",
    
            texture: "shadow",
        animationFPS: 30,
        playAnimationOnStart: false,
        loopAnimation: true,
    behaviors: JSON.parse('[]'),
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template shadow — core_OnCreate (On create event) */
{
this.alpha = 0.9;
this.zIndex = 10;

}

    },
    extends: {}
};
templates.list['shadow'] = [];
        
templates.templates["button"] = {
    name: "button",
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    visible: true,
    baseClass: "AnimatedSprite",
    
            texture: "pixil-frame-0(37)",
        animationFPS: 30,
        playAnimationOnStart: false,
        loopAnimation: true,
    behaviors: JSON.parse('[]'),
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template button — core_OnPointerDown (OnPointerDown event) */
this.eventMode = 'dynamic';
this.on('pointerdown', () => {
    
this['killYourself'] = this['action']();

});

    },
    extends: {}
};
templates.list['button'] = [];
        
    
    
rooms.templates['New Room'] = {
    name: 'New Room',
    width: 208,
    height: 208,
    behaviors: JSON.parse('[]'),
    objects: JSON.parse('[{"x":104,"y":104,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"board"},{"x":3.72302967,"y":215.38947341,"opacity":1,"tint":16777215,"scale":{"x":0.1,"y":0.1},"rotation":0,"exts":{},"customProperties":{},"template":"builder"}]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        
    },
    isUi: false,
    follow: false,
    extends: {},
    bindings: {
    
    }
}
        
    
  }
  /**
 * @typedef ICtPlaceRectangle
 * @property {number} [x1] The left side of the rectangle.
 * @property {number} [y1] The upper side of the rectangle.
 * @property {number} [x2] The right side of the rectangle.
 * @property {number} [y2] The bottom side of the rectangle.
 * @property {number} [x] The left side of the rectangle.
 * @property {number} [y] The upper side of the rectangle.
 * @property {number} [width] The right side of the rectangle.
 * @property {number} [height] The bottom side of the rectangle.
 */
/**
 * @typedef ICtPlaceLineSegment
 * @property {number} x1 The horizontal coordinate of the starting point of the ray.
 * @property {number} y1 The vertical coordinate of the starting point of the ray.
 * @property {number} x2 The horizontal coordinate of the ending point of the ray.
 * @property {number} y2 The vertical coordinate of the ending point of the ray.
 */
/**
 * @typedef ICtPlaceCircle
 * @property {number} x The horizontal coordinate of the circle's center.
 * @property {number} y The vertical coordinate of the circle's center.
 * @property {number} radius The radius of the circle.
 */
/* eslint-disable no-underscore-dangle */
/* global SSCD */
/* eslint prefer-destructuring: 0 */
const place = (function ctPlace() {
    const circlePrecision = 16;
    const debugMode = [false][0];

    const getSSCDShapeFromRect = function (obj) {
        const {shape} = obj,
              position = new SSCD.Vector(obj.x, obj.y);
        const scaleX = obj instanceof PIXI.NineSlicePlane ? 1 : obj.scale.x,
              scaleY = obj instanceof PIXI.NineSlicePlane ? 1 : obj.scale.y;
        if (obj.angle === 0) {
            position.x -= scaleX > 0 ?
                (shape.left * scaleX) :
                (-scaleX * shape.right);
            position.y -= scaleY > 0 ?
                (shape.top * scaleY) :
                (-shape.bottom * scaleY);
            return new SSCD.Rectangle(
                position,
                new SSCD.Vector(
                    Math.abs((shape.left + shape.right) * scaleX),
                    Math.abs((shape.bottom + shape.top) * scaleY)
                )
            );
        }
        const upperLeft = u.rotate(
            -shape.left * scaleX,
            -shape.top * scaleY, obj.angle
        );
        const bottomLeft = u.rotate(
            -shape.left * scaleX,
            shape.bottom * scaleY, obj.angle
        );
        const bottomRight = u.rotate(
            shape.right * scaleX,
            shape.bottom * scaleY, obj.angle
        );
        const upperRight = u.rotate(
            shape.right * scaleX,
            -shape.top * scaleY, obj.angle
        );
        return new SSCD.LineStrip(position, [
            new SSCD.Vector(upperLeft.x, upperLeft.y),
            new SSCD.Vector(bottomLeft.x, bottomLeft.y),
            new SSCD.Vector(bottomRight.x, bottomRight.y),
            new SSCD.Vector(upperRight.x, upperRight.y)
        ], true);
    };

    const getSSCDShapeFromCircle = function (obj) {
        const {shape} = obj,
              position = new SSCD.Vector(obj.x, obj.y);
        if (Math.abs(obj.scale.x) === Math.abs(obj.scale.y)) {
            return new SSCD.Circle(position, shape.r * Math.abs(obj.scale.x));
        }
        const vertices = [];
        for (let i = 0; i < circlePrecision; i++) {
            const point = [
                u.ldx(shape.r * obj.scale.x, 360 / circlePrecision * i),
                u.ldy(shape.r * obj.scale.y, 360 / circlePrecision * i)
            ];
            if (obj.angle !== 0) {
                const {x, y} = u.rotate(point[0], point[1], obj.angle);
                vertices.push(new SSCD.Vector(x, y));
            } else {
                vertices.push(new SSCD.Vector(point[0], point[1]));
            }
        }
        return new SSCD.LineStrip(position, vertices, true);
    };

    const getSSCDShapeFromStrip = function (obj) {
        const {shape} = obj,
              position = new SSCD.Vector(obj.x, obj.y);
        const scaleX = obj instanceof PIXI.NineSlicePlane ? 1 : obj.scale.x,
              scaleY = obj instanceof PIXI.NineSlicePlane ? 1 : obj.scale.y;
        const vertices = [];
        if (obj.angle !== 0) {
            for (const point of shape.points) {
                const {x, y} = u.rotate(
                    point.x * scaleX,
                    point.y * scaleY, obj.angle
                );
                vertices.push(new SSCD.Vector(x, y));
            }
        } else {
            for (const point of shape.points) {
                vertices.push(new SSCD.Vector(point.x * scaleX, point.y * scaleY));
            }
        }
        return new SSCD.LineStrip(position, vertices, Boolean(shape.closedStrip));
    };

    const getSSCDShapeFromLine = function (obj) {
        const {shape} = obj;
        if (obj.angle !== 0) {
            const {x: x1, y: y1} = u.rotate(
                shape.x1 * obj.scale.x,
                shape.y1 * obj.scale.y,
                obj.angle
            );
            const {x: x2, y: y2} = u.rotate(
                shape.x2 * obj.scale.x,
                shape.y2 * obj.scale.y,
                obj.angle
            );
            return new SSCD.Line(
                new SSCD.Vector(
                    obj.x + x1,
                    obj.y + y1
                ),
                new SSCD.Vector(
                    x2 - x1,
                    y2 - y1
                )
            );
        }
        return new SSCD.Line(
            new SSCD.Vector(
                obj.x + shape.x1 * obj.scale.x,
                obj.y + shape.y1 * obj.scale.y
            ),
            new SSCD.Vector(
                (shape.x2 - shape.x1) * obj.scale.x,
                (shape.y2 - shape.y1) * obj.scale.y
            )
        );
    };

    /**
     * Gets SSCD shapes from object's shape field and its transforms.
     */
    var getSSCDShape = function (obj) {
        switch (obj.shape.type) {
        case 'rect':
            return getSSCDShapeFromRect(obj);
        case 'circle':
            return getSSCDShapeFromCircle(obj);
        case 'strip':
            return getSSCDShapeFromStrip(obj);
        case 'line':
            return getSSCDShapeFromLine(obj);
        default:
            return new SSCD.Circle(new SSCD.Vector(obj.x, obj.y), 0);
        }
    };

    // Premade filter predicates to avoid function creation and memory bloat during the game loop.
    const templateNameFilter = (target, other, template) => other.template === template;
    const cgroupFilter = (target, other, cgroup) => !cgroup || cgroup === other.cgroup;

    // Core collision-checking method that accepts various filtering predicates
    // and a variable partitioning grid.

    // eslint-disable-next-line max-params
    const genericCollisionQuery = function (
        target,
        customX,
        customY,
        partitioningGrid,
        queryAll,
        filterPredicate,
        filterVariable
    ) {
        const oldx = target.x,
              oldy = target.y;
        const shapeCashed = target._shape;
        let hashes, results;
        // Apply arbitrary location to the checked object
        if (customX !== void 0 && (oldx !== customX || oldy !== customY)) {
            target.x = customX;
            target.y = customY;
            target._shape = getSSCDShape(target);
            hashes = place.getHashes(target);
        } else {
            hashes = target.$chashes || place.getHashes(target);
            target._shape = target._shape || getSSCDShape(target);
        }
        if (queryAll) {
            results = [];
        }
        // Get all the known objects in close proximity to the tested object,
        // sourcing from the passed partitioning grid.
        for (const hash of hashes) {
            const array = partitioningGrid[hash];
            // Such partition cell is absent
            if (!array) {
                continue;
            }
            for (const obj of array) {
                // Skip checks against the tested object itself.
                if (obj === target) {
                    continue;
                }
                // Filter out objects
                if (!filterPredicate(target, obj, filterVariable)) {
                    continue;
                }
                // Check for collision between two objects
                if (place.collide(target, obj)) {
                    // Singular pick; return the collided object immediately.
                    if (!queryAll) {
                        // Return the object back to its old position.
                        // Skip SSCD shape re-calculation.
                        if (oldx !== target.x || oldy !== target.y) {
                            target.x = oldx;
                            target.y = oldy;
                            target._shape = shapeCashed;
                        }
                        return obj;
                    }
                    // Multiple pick; push the collided object into an array.
                    if (!results.includes(obj)) {
                        results.push(obj);
                    }
                }
            }
        }
        // Return the object back to its old position.
        // Skip SSCD shape re-calculation.
        if (oldx !== target.x || oldy !== target.y) {
            target.x = oldx;
            target.y = oldy;
            target._shape = shapeCashed;
        }
        if (!queryAll) {
            return false;
        }
        return results;
    };

    const place = {
        m: 1, // direction modifier in place.go,
        gridX: [1024][0] || 512,
        gridY: [1024][0] || 512,
        grid: {},
        tileGrid: {},
        getHashes(copy) {
            var hashes = [];
            var x = Math.round(copy.x / place.gridX),
                y = Math.round(copy.y / place.gridY),
                dx = Math.sign(copy.x - place.gridX * x),
                dy = Math.sign(copy.y - place.gridY * y);
            hashes.push(`${x}:${y}`);
            if (dx) {
                hashes.push(`${x + dx}:${y}`);
                if (dy) {
                    hashes.push(`${x + dx}:${y + dy}`);
                }
            }
            if (dy) {
                hashes.push(`${x}:${y + dy}`);
            }
            return hashes;
        },
        /**
         * Applied to copies in the debug mode. Draws a collision shape
         * @this Copy
         * @param {boolean} [absolute] Whether to use room coordinates
         * instead of coordinates relative to the copy.
         * @returns {void}
         */
        drawDebugGraphic(absolute) {
            const shape = this._shape || getSSCDShape(this);
            const g = this.$cDebugCollision;
            const inverse = this.transform.localTransform.clone().invert();
            this.$cDebugCollision.transform.setFromMatrix(inverse);
            this.$cDebugCollision.position.set(0, 0);
            let color = 0x00ffff;
            if (this instanceof Copy) {
                color = 0x0066ff;
            } else if (this instanceof PIXI.Sprite) {
                color = 0x6600ff;
            }
            if (this.$cHadCollision) {
                color = 0x00ff00;
            }
            g.lineStyle(2, color);
            if (shape instanceof SSCD.Rectangle) {
                const pos = shape.get_position(),
                      size = shape.get_size();
                g.beginFill(color, 0.1);
                if (!absolute) {
                    g.drawRect(pos.x - this.x, pos.y - this.y, size.x, size.y);
                } else {
                    g.drawRect(pos.x, pos.y, size.x, size.y);
                }
                g.endFill();
            } else if (shape instanceof SSCD.LineStrip) {
                if (!absolute) {
                    g.moveTo(shape.__points[0].x, shape.__points[0].y);
                    for (let i = 1; i < shape.__points.length; i++) {
                        g.lineTo(shape.__points[i].x, shape.__points[i].y);
                    }
                } else {
                    g.moveTo(shape.__points[0].x + this.x, shape.__points[0].y + this.y);
                    for (let i = 1; i < shape.__points.length; i++) {
                        g.lineTo(shape.__points[i].x + this.x, shape.__points[i].y + this.y);
                    }
                }
            } else if (shape instanceof SSCD.Circle && shape.get_radius() > 0) {
                g.beginFill(color, 0.1);
                if (!absolute) {
                    g.drawCircle(0, 0, shape.get_radius());
                } else {
                    g.drawCircle(this.x, this.y, shape.get_radius());
                }
                g.endFill();
            } else if (shape instanceof SSCD.Line) {
                if (!absolute) {
                    g.moveTo(
                        shape.__position.x,
                        shape.__position.y
                    ).lineTo(
                        shape.__position.x + shape.__dest.x,
                        shape.__position.y + shape.__dest.y
                    );
                } else {
                    const p1 = shape.get_p1();
                    const p2 = shape.get_p2();
                    g.moveTo(p1.x, p1.y)
                    .lineTo(p2.x, p2.y);
                }
            } else if (!absolute) { // Treat as a point
                g.moveTo(-16, -16)
                .lineTo(16, 16)
                .moveTo(-16, 16)
                .lineTo(16, -16);
            } else {
                g.moveTo(-16 + this.x, -16 + this.y)
                .lineTo(16 + this.x, 16 + this.y)
                .moveTo(-16 + this.x, 16 + this.y)
                .lineTo(16 + this.x, -16 + this.y);
            }
        },
        collide(c1, c2) {
            // place.collide(<c1: Copy, c2: Copy>)
            // Test collision between two copies
            c1._shape = c1._shape || getSSCDShape(c1);
            c2._shape = c2._shape || getSSCDShape(c2);
            if (c1._shape.__type === 'strip' ||
                c2._shape.__type === 'strip' ||
                c1._shape.__type === 'complex' ||
                c2._shape.__type === 'complex'
            ) {
                const aabb1 = c1._shape.get_aabb(),
                      aabb2 = c2._shape.get_aabb();
                if (!aabb1.intersects(aabb2)) {
                    return false;
                }
            }
            if (SSCD.CollisionManager.test_collision(c1._shape, c2._shape)) {
                if ([false][0]) {
                    c1.$cHadCollision = true;
                    c2.$cHadCollision = true;
                }
                return true;
            }
            return false;
        },
        /**
         * Determines if the place in (x,y) is occupied by any copies or tiles.
         * Optionally can take 'cgroup' as a filter for obstacles'
         * collision group (not shape type).
         *
         * @param {Copy} me The object to check collisions on.
         * @param {number} [x] The x coordinate to check, as if `me` was placed there.
         * @param {number} [y] The y coordinate to check, as if `me` was placed there.
         * @param {String} [cgroup] The collision group to check against
         * @returns {Copy|Array<Copy>} The collided copy, or an array of all the detected collisions
         * (if `multiple` is `true`)
         */
        occupied(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            const copies = genericCollisionQuery(
                target, x, y,
                place.grid,
                false,
                cgroupFilter, cgroup
            );
            // Was any suitable copy found? Return it immediately and skip the query for tiles.
            if (copies) {
                return copies;
            }
            // Return query result for tiles.
            return genericCollisionQuery(
                target, x, y,
                place.tileGrid,
                false,
                cgroupFilter, cgroup
            );
        },
        occupiedMultiple(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            const copies = genericCollisionQuery(
                target, x, y,
                place.grid,
                true,
                cgroupFilter, cgroup
            );
            const tiles = genericCollisionQuery(
                target, x, y,
                place.tileGrid,
                true,
                cgroupFilter, cgroup
            );
            return copies.concat(tiles);
        },
        free(me, x, y, cgroup) {
            return !place.occupied(me, x, y, cgroup);
        },
        meet(target, x, y, templateName) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                templateName = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                place.grid,
                false,
                templateNameFilter, templateName
            );
        },
        meetMultiple(target, x, y, templateName) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                templateName = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                place.grid,
                true,
                templateNameFilter, templateName
            );
        },
        copies(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                place.grid,
                false,
                cgroupFilter, cgroup
            );
        },
        copiesMultiple(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                place.grid,
                true,
                cgroupFilter, cgroup
            );
        },
        tiles(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                place.tileGrid,
                false,
                cgroupFilter, cgroup
            );
        },
        tilesMultiple(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                place.tileGrid,
                true,
                cgroupFilter, cgroup
            );
        },
        lastdist: null,
        nearest(x, y, templateName) {
            // place.nearest(x: number, y: number, templateName: string)
            const copies = templates.list[templateName];
            if (copies.length > 0) {
                var dist = Math.hypot(x - copies[0].x, y - copies[0].y);
                var inst = copies[0];
                for (const copy of copies) {
                    if (Math.hypot(x - copy.x, y - copy.y) < dist) {
                        dist = Math.hypot(x - copy.x, y - copy.y);
                        inst = copy;
                    }
                }
                place.lastdist = dist;
                return inst;
            }
            return false;
        },
        furthest(x, y, template) {
            // place.furthest(<x: number, y: number, template: Template>)
            const templates = templates.list[template];
            if (templates.length > 0) {
                var dist = Math.hypot(x - templates[0].x, y - templates[0].y);
                var inst = templates[0];
                for (const copy of templates) {
                    if (Math.hypot(x - copy.x, y - copy.y) > dist) {
                        dist = Math.hypot(x - copy.x, y - copy.y);
                        inst = copy;
                    }
                }
                place.lastdist = dist;
                return inst;
            }
            return false;
        },
        enableTilemapCollisions(tilemap, exactCgroup) {
            const cgroup = exactCgroup || tilemap.cgroup;
            if (tilemap.addedCollisions) {
                throw new Error('[place] The tilemap already has collisions enabled.');
            }
            tilemap.cgroup = cgroup;
            // Prebake hashes and SSCD shapes for all the tiles
            for (const pixiSprite of tilemap.pixiTiles) {
                // eslint-disable-next-line no-underscore-dangle
                pixiSprite._shape = getSSCDShape(pixiSprite);
                pixiSprite.cgroup = cgroup;
                pixiSprite.$chashes = place.getHashes(pixiSprite);
                /* eslint max-depth: 0 */
                for (const hash of pixiSprite.$chashes) {
                    if (!(hash in place.tileGrid)) {
                        place.tileGrid[hash] = [pixiSprite];
                    } else {
                        place.tileGrid[hash].push(pixiSprite);
                    }
                }
                pixiSprite.depth = tilemap.depth;
            }
            if (debugMode) {
                for (const pixiSprite of tilemap.pixiTiles) {
                    pixiSprite.$cDebugCollision = new PIXI.Graphics();
                    place.drawDebugGraphic.apply(pixiSprite, [false]);
                    pixiSprite.addChild(pixiSprite.$cDebugCollision);
                }
            }
            tilemap.addedCollisions = true;
        },
        moveAlong(me, dir, length, cgroup, precision) {
            if (!length) {
                return false;
            }
            if (typeof cgroup === 'number') {
                precision = cgroup;
                cgroup = void 0;
            }
            precision = Math.abs(precision || 1);
            if (length < 0) {
                length *= -1;
                dir += 180;
            }
            var dx = Math.cos(dir * Math.PI / 180) * precision,
                dy = Math.sin(dir * Math.PI / 180) * precision;
            while (length > 0) {
                if (length < 1) {
                    dx *= length;
                    dy *= length;
                }
                const occupied = place.occupied(me, me.x + dx, me.y + dy, cgroup);
                if (!occupied) {
                    me.x += dx;
                    me.y += dy;
                    delete me._shape;
                } else {
                    return occupied;
                }
                length--;
            }
            return false;
        },
        moveByAxes(me, dx, dy, cgroup, precision) {
            if (dx === dy === 0) {
                return false;
            }
            if (typeof cgroup === 'number') {
                precision = cgroup;
                cgroup = void 0;
            }
            const obstacles = {
                x: false,
                y: false
            };
            precision = Math.abs(precision || 1);
            while (Math.abs(dx) > precision) {
                const occupied =
                    place.occupied(me, me.x + Math.sign(dx) * precision, me.y, cgroup);
                if (!occupied) {
                    me.x += Math.sign(dx) * precision;
                    dx -= Math.sign(dx) * precision;
                } else {
                    obstacles.x = occupied;
                    break;
                }
            }
            while (Math.abs(dy) > precision) {
                const occupied =
                    place.occupied(me, me.x, me.y + Math.sign(dy) * precision, cgroup);
                if (!occupied) {
                    me.y += Math.sign(dy) * precision;
                    dy -= Math.sign(dy) * precision;
                } else {
                    obstacles.y = occupied;
                    break;
                }
            }
            // A fraction of precision may be left but completely reachable; jump to this point.
            if (Math.abs(dx) < precision) {
                if (place.free(me, me.x + dx, me.y, cgroup)) {
                    me.x += dx;
                }
            }
            if (Math.abs(dy) < precision) {
                if (place.free(me, me.x, me.y + dy, cgroup)) {
                    me.y += dy;
                }
            }
            if (!obstacles.x && !obstacles.y) {
                return false;
            }
            return obstacles;
        },
        go(me, x, y, length, cgroup) {
            // place.go(<me: Copy, x: number, y: number, length: number>[, cgroup: String])
            // tries to reach the target with a simple obstacle avoidance algorithm

            // if we are too close to the destination, exit
            if (u.pdc(me.x, me.y, x, y) < length) {
                if (place.free(me, x, y, cgroup)) {
                    me.x = x;
                    me.y = y;
                    delete me._shape;
                }
                return;
            }
            var dir = u.pdn(me.x, me.y, x, y);

            //if there are no obstackles in front of us, go forward
            let projectedX = me.x + u.ldx(length, dir),
                projectedY = me.y + u.ldy(length, dir);
            if (place.free(me, projectedX, projectedY, cgroup)) {
                me.x = projectedX;
                me.y = projectedY;
                delete me._shape;
                me.dir = dir;
            // otherwise, try to change direction by 30...60...90 degrees.
            // Direction changes over time (place.m).
            } else {
                for (var i = -1; i <= 1; i += 2) {
                    for (var j = 30; j < 150; j += 30) {
                        projectedX = me.x + u.ldx(length, dir + j * place.m * i);
                        projectedY = me.y + u.ldy(length, dir + j * place.m * i);
                        if (place.free(me, projectedX, projectedY, cgroup)) {
                            me.x = projectedX;
                            me.y = projectedY;
                            delete me._shape;
                            me.dir = dir + j * place.m * i;
                            return;
                        }
                    }
                }
            }
        },
        traceCustom(shape, oversized, cgroup, getAll) {
            const results = [];
            if (debugMode) {
                shape.$cDebugCollision = place.debugTraceGraphics;
                place.drawDebugGraphic.apply(shape, [true]);
            }
            // Oversized tracing shapes won't work with partitioning table, and thus
            // will need to loop over all the copies and tiles in the room.
            // Non-oversized shapes can use plain place.occupied.
            if (!oversized) {
                if (getAll) {
                    return place.occupiedMultiple(shape, cgroup);
                }
                return place.occupied(shape, cgroup);
            }
            // Oversized shapes.
            // Loop over all the copies in the room.
            for (const copy of stack) {
                if (!cgroup || copy.cgroup === cgroup) {
                    if (place.collide(shape, copy)) {
                        if (getAll) {
                            results.push(copy);
                        } else {
                            return copy;
                        }
                    }
                }
            }
            // Additionally, loop over all the tilesets and their tiles.
            for (const tilemap of templates.list.TILEMAP) {
                if (!tilemap.addedCollisions) {
                    continue;
                }
                if (cgroup && tilemap.cgroup !== cgroup) {
                    continue;
                }
                for (const tile of tilemap.pixiTiles) {
                    if (place.collide(shape, tile)) {
                        if (getAll) {
                            results.push(tile);
                        } else {
                            return tile;
                        }
                    }
                }
            }
            if (!getAll) {
                return false;
            }
            return results;
        },
        /**
         * Tests for intersections with a line segment.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the line segment; otherwise, returns the first one that fits the conditions.
         *
         * @param {ICtPlaceLineSegment} line An object that describes the line segment.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        traceLine(line, cgroup, getAll) {
            let oversized = false;
            if (Math.abs(line.x1 - line.x2) > place.gridX) {
                oversized = true;
            } else if (Math.abs(line.y1 - line.y2) > place.gridY) {
                oversized = true;
            }
            const shape = {
                x: line.x1,
                y: line.y1,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: line.x2 - line.x1,
                    y2: line.y2 - line.y1
                }
            };
            const result = place.traceCustom(shape, oversized, cgroup, getAll);
            if (getAll) {
                // An approximate sorting by distance
                result.sort(function sortCopies(a, b) {
                    var dist1, dist2;
                    dist1 = u.pdc(line.x1, line.y1, a.x, a.y);
                    dist2 = u.pdc(line.x1, line.y1, b.x, b.y);
                    return dist1 - dist2;
                });
            }
            return result;
        },
        /**
         * Tests for intersections with a filled rectangle.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the rectangle; otherwise, returns the first one that fits the conditions.
         *
         * @param {ICtPlaceRectangle} rect An object that describes the line segment.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        traceRect(rect, cgroup, getAll) {
            let oversized = false;
            rect = { // Copy the object
                ...rect
            };
            // Turn x1, x2, y1, y2 into x, y, width, and height
            if ('x1' in rect) {
                rect.x = rect.x1;
                rect.y = rect.y1;
                rect.width = rect.x2 - rect.x1;
                rect.height = rect.y2 - rect.y1;
            }
            if (Math.abs(rect.width) > place.gridX || Math.abs(rect.height) > place.gridY) {
                oversized = true;
            }
            const shape = {
                x: rect.x,
                y: rect.y,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'rect',
                    left: 0,
                    top: 0,
                    right: rect.width,
                    bottom: rect.height
                }
            };
            return place.traceCustom(shape, oversized, cgroup, getAll);
        },
        /**
         * Tests for intersections with a filled circle.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the circle; otherwise, returns the first one that fits the conditions.
         *
         * @param {ICtPlaceCircle} rect An object that describes the line segment.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        traceCircle(circle, cgroup, getAll) {
            let oversized = false;
            if (circle.radius * 2 > place.gridX || circle.radius * 2 > place.gridY) {
                oversized = true;
            }
            const shape = {
                x: circle.x,
                y: circle.y,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'circle',
                    r: circle.radius
                }
            };
            return place.traceCustom(shape, oversized, cgroup, getAll);
        },
        /**
         * Tests for intersections with a polyline. It is a hollow shape made
         * of connected line segments. The shape is not closed unless you add
         * the closing point by yourself.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the polyline; otherwise, returns the first one that fits the conditions.
         *
         * @param {Array<IPoint>} polyline An array of objects with `x` and `y` properties.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        tracePolyline(polyline, cgroup, getAll) {
            const shape = {
                x: 0,
                y: 0,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'strip',
                    points: polyline
                }
            };
            return place.traceCustom(shape, true, cgroup, getAll);
        },
        /**
         * Tests for intersections with a point.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the point; otherwise, returns the first one that fits the conditions.
         *
         * @param {object} point An object with `x` and `y` properties.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        tracePoint(point, cgroup, getAll) {
            const shape = {
                x: point.x,
                y: point.y,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'point'
                }
            };
            return place.traceCustom(shape, false, cgroup, getAll);
        }
    };

    // Aliases
    place.traceRectange = place.traceRect;
    // a magic procedure which tells 'go' function to change its direction
    setInterval(function switchCtPlaceGoDirection() {
        place.m *= -1;
    }, 789);
    Object.defineProperty(templates.CopyProto, 'moveContinuous', {
        value: function (cgroup, precision) {
            if (this.gravity) {
                this.hspeed += this.gravity * u.time * Math.cos(this.gravityDir * Math.PI / 180);
                this.vspeed += this.gravity * u.time * Math.sin(this.gravityDir * Math.PI / 180);
            }
            return place.moveAlong(this, this.direction, this.speed * u.time, cgroup, precision);
        }
    });
    Object.defineProperty(templates.CopyProto, 'moveBullet', {
        value: function (cgroup, precision) {
            return this.moveContinuous(cgroup, precision);
        }
    });
    Object.defineProperty(templates.CopyProto, 'moveContinuousByAxes', {
        value: function (cgroup, precision) {
            if (this.gravity) {
                this.hspeed += this.gravity * u.time * Math.cos(this.gravityDir * Math.PI / 180);
                this.vspeed += this.gravity * u.time * Math.sin(this.gravityDir * Math.PI / 180);
            }
            return place.moveByAxes(
                this,
                this.hspeed * u.time,
                this.vspeed * u.time,
                cgroup,
                precision
            );
        }
    });
    Object.defineProperty(templates.CopyProto, 'moveSmart', {
        value: function (cgroup, precision) {
            return this.moveContinuousByAxes(cgroup, precision);
        }
    });
    Object.defineProperty(templates.Tilemap.prototype, 'enableCollisions', {
        value: function (cgroup) {
            place.enableTilemapCollisions(this, cgroup);
        }
    });

    window.place = place;
    return place;
})();

const pointer = (function mountCtPointer() {
    const keyPrefix = 'pointer.';
    const setKey = function (key, value) {
        inputs.registry[keyPrefix + key] = value;
    };
    const getKey = function (key) {
        return inputs.registry[keyPrefix + key];
    };
    const buttonMappings = {
        Primary: 1,
        Middle: 4,
        Secondary: 2,
        ExtraOne: 8,
        ExtraTwo: 16,
        Eraser: 32
    };
    var lastPanNum = 0,
        lastPanX = 0,
        lastPanY = 0,
        lastScaleDistance = 0,
        lastAngle = 0;

    // updates Action system's input methods for singular, double and triple pointers
    var countPointers = () => {
        setKey('Any', pointer.down.length > 0 ? 1 : 0);
        setKey('Double', pointer.down.length > 1 ? 1 : 0);
        setKey('Triple', pointer.down.length > 2 ? 1 : 0);
    };
    // returns a new object with the necessary information about a pointer event
    var copyPointer = e => {
        const rect = pixiApp.view.getBoundingClientRect();
        const xui = (e.clientX - rect.left) / rect.width * camera.width,
              yui = (e.clientY - rect.top) / rect.height * camera.height;
        const positionGame = camera.uiToGameCoord(xui, yui);
        const p = {
            id: e.pointerId,
            x: positionGame.x,
            y: positionGame.y,
            clientX: e.clientX,
            clientY: e.clientY,
            xui: xui,
            yui: yui,
            xprev: positionGame.x,
            yprev: positionGame.y,
            buttons: e.buttons,
            xuiprev: xui,
            yuiprev: yui,
            pressure: e.pressure,
            tiltX: e.tiltX,
            tiltY: e.tiltY,
            twist: e.twist,
            type: e.pointerType,
            width: e.width / rect.width * camera.width,
            height: e.height / rect.height * camera.height
        };
        return p;
    };
    var updatePointer = (p, e) => {
        const rect = pixiApp.view.getBoundingClientRect();
        const xui = (e.clientX - rect.left) / rect.width * camera.width,
              yui = (e.clientY - rect.top) / rect.height * camera.height;
        const positionGame = camera.uiToGameCoord(xui, yui);
        Object.assign(p, {
            x: positionGame.x,
            y: positionGame.y,
            xui: xui,
            yui: yui,
            clientX: e.clientX,
            clientY: e.clientY,
            pressure: e.pressure,
            buttons: e.buttons,
            tiltX: e.tiltX,
            tiltY: e.tiltY,
            twist: e.twist,
            width: e.width / rect.width * camera.width,
            height: e.height / rect.height * camera.height
        });
    };
    var writePrimary = function (p) {
        Object.assign(pointer, {
            x: p.x,
            y: p.y,
            xui: p.xui,
            yui: p.yui,
            pressure: p.pressure,
            buttons: p.buttons,
            tiltX: p.tiltX,
            tiltY: p.tiltY,
            twist: p.twist
        });
    };

    var handleHoverStart = function (e) {
        window.focus();
        const p = copyPointer(e);
        pointer.hover.push(p);
        if (e.isPrimary) {
            writePrimary(p);
        }
    };
    var handleHoverEnd = function (e) {
        const p = pointer.hover.find(p => p.id === e.pointerId);
        if (p) {
            p.invalid = true;
            pointer.hover.splice(pointer.hover.indexOf(p), 1);
        }
        // Handles mouse pointers that were dragged out of the js frame while pressing,
        // as they don't trigger pointercancel or such
        const downId = pointer.down.findIndex(p => p.id === e.pointerId);
        if (downId !== -1) {
            pointer.down.splice(downId, 1);
        }
    };
    var handleMove = function (e) {
        // Allow default browser events inside error messages
        if (settings.preventDefault && !(e.target.closest && e.target.closest('.ct-Errors'))) {
            e.preventDefault();
        }
        let pointerHover = pointer.hover.find(p => p.id === e.pointerId);
        if (!pointerHover) {
            // Catches hover events that started before the game has loaded
            handleHoverStart(e);
            pointerHover = pointer.hover.find(p => p.id === e.pointerId);
        }
        const pointerDown = pointer.down.find(p => p.id === e.pointerId);
        if (!pointerHover && !pointerDown) {
            return;
        }
        if (pointerHover) {
            updatePointer(pointerHover, e);
        }
        if (pointerDown) {
            updatePointer(pointerDown, e);
        }
        if (e.isPrimary) {
            writePrimary(pointerHover || pointerDown);
        }
    };
    var handleDown = function (e) {
        // Allow default browser events inside error messages
        if (settings.preventDefault && !(e.target.closest && e.target.closest('.ct-Errors'))) {
            e.preventDefault();
        }
        pointer.type = e.pointerType;
        const p = copyPointer(e);
        pointer.down.push(p);
        countPointers();
        if (e.isPrimary) {
            writePrimary(p);
        }
    };
    var handleUp = function (e) {
        // Allow default browser events inside error messages
        if (settings.preventDefault && !(e.target.closest && e.target.closest('.ct-Errors'))) {
            e.preventDefault();
        }
        const p = pointer.down.find(p => p.id === e.pointerId);
        if (p) {
            pointer.released.push(p);
        }
        if (pointer.down.indexOf(p) !== -1) {
            pointer.down.splice(pointer.down.indexOf(p), 1);
        }
        countPointers();
    };
    var handleWheel = function handleWheel(e) {
        setKey('Wheel', ((e.wheelDelta || -e.detail) < 0) ? -1 : 1);
        // Allow default browser events inside error messages
        if (settings.preventDefault && !(e.target.closest && e.target.closest('.ct-Errors'))) {
            e.preventDefault();
        }
    };

    let locking = false;
    const genericCollisionCheck = function genericCollisionCheck(
        copy,
        specificPointer,
        set,
        uiSpace
    ) {
        if (locking) {
            return false;
        }
        for (const p of set) {
            if (specificPointer && p.id !== specificPointer.id) {
                continue;
            }
            if (place.collide(copy, {
                x: uiSpace ? p.xui : p.x,
                y: uiSpace ? p.yui : p.y,
                scale: {
                    x: 1,
                    y: 1
                },
                angle: 0,
                shape: {
                    type: 'rect',
                    top: p.height / 2,
                    bottom: p.height / 2,
                    left: p.width / 2,
                    right: p.width / 2
                }
            })) {
                return p;
            }
        }
        return false;
    };
    // Triggers on every mouse press event to capture pointer after it was released by a user,
    // e.g. after the window was blurred
    const pointerCapturer = function pointerCapturer() {
        if (!document.pointerLockElement && !document.mozPointerLockElement) {
            const request = document.body.requestPointerLock || document.body.mozRequestPointerLock;
            request.apply(document.body);
        }
    };
    const capturedPointerMove = function capturedPointerMove(e) {
        const rect = pixiApp.view.getBoundingClientRect();
        const dx = e.movementX / rect.width * camera.width,
              dy = e.movementY / rect.height * camera.height;
        pointer.xlocked += dx;
        pointer.ylocked += dy;
        pointer.xmovement = dx;
        pointer.ymovement = dy;
    };

    const pointer = {
        setupListeners() {
            document.addEventListener('pointerenter', handleHoverStart, {
                capture: true
            });
            document.addEventListener('pointerout', handleHoverEnd, {
                capture: true
            });
            document.addEventListener('pointerleave', handleHoverEnd, {
                capture: true
            });
            document.addEventListener('pointerdown', handleDown, {
                capture: true
            });
            document.addEventListener('pointerup', handleUp, {
                capture: true
            });
            document.addEventListener('pointercancel', handleUp, {
                capture: true
            });
            document.addEventListener('pointermove', handleMove, {
                capture: true
            });
            document.addEventListener('wheel', handleWheel, {
                passive: false
            });
            document.addEventListener('DOMMouseScroll', handleWheel, {
                passive: false
            });
            document.addEventListener('contextmenu', e => {
                if (settings.preventDefault) {
                    e.preventDefault();
                }
            });
        },
        hover: [],
        down: [],
        released: [],
        x: 0,
        y: 0,
        xprev: 0,
        yprev: 0,
        xui: 0,
        yui: 0,
        xuiprev: 0,
        yuiprev: 0,
        xlocked: 0,
        ylocked: 0,
        xmovement: 0,
        ymovement: 0,
        pressure: 1,
        buttons: 0,
        tiltX: 0,
        tiltY: 0,
        twist: 0,
        width: 1,
        height: 1,
        type: null,
        clear() {
            pointer.down.length = 0;
            pointer.hover.length = 0;
            pointer.clearReleased();
            countPointers();
        },
        clearReleased() {
            pointer.released.length = 0;
        },
        collides(copy, p, checkReleased) {
            var set = checkReleased ? pointer.released : pointer.down;
            return genericCollisionCheck(copy, p, set, false);
        },
        collidesUi(copy, p, checkReleased) {
            var set = checkReleased ? pointer.released : pointer.down;
            return genericCollisionCheck(copy, p, set, true);
        },
        hovers(copy, p) {
            return genericCollisionCheck(copy, p, pointer.hover, false);
        },
        hoversUi(copy, p) {
            return genericCollisionCheck(copy, p, pointer.hover, true);
        },
        isButtonPressed(button, p) {
            if (!p) {
                return Boolean(getKey(button));
            }
            // eslint-disable-next-line no-bitwise
            return (p.buttons & buttonMappings[button]) === button ? 1 : 0;
        },
        updateGestures() {
            let x = 0,
                y = 0;
            const rect = pixiApp.view.getBoundingClientRect();
            // Get the middle point of all the pointers
            for (const event of pointer.down) {
                x += (event.clientX - rect.left) / rect.width;
                y += (event.clientY - rect.top) / rect.height;
            }
            x /= pointer.down.length;
            y /= pointer.down.length;

            let angle = 0,
                distance = lastScaleDistance;
            if (pointer.down.length > 1) {
                const events = [
                    pointer.down[0],
                    pointer.down[1]
                ].sort((a, b) => a.id - b.id);
                angle = u.pdn(
                    events[0].x,
                    events[0].y,
                    events[1].x,
                    events[1].y
                );
                distance = u.pdc(
                    events[0].x,
                    events[0].y,
                    events[1].x,
                    events[1].y
                );
            }
            if (lastPanNum === pointer.down.length) {
                if (pointer.down.length > 1) {
                    setKey('DeltaRotation', (u.degToRad(u.deltaDir(lastAngle, angle))));
                    setKey('DeltaPinch', distance / lastScaleDistance - 1);
                } else {
                    setKey('DeltaPinch', 0);
                    setKey('DeltaRotation', 0);
                }
                if (!pointer.down.length) {
                    setKey('PanX', 0);
                    setKey('PanY', 0);
                } else {
                    setKey('PanX', x - lastPanX);
                    setKey('PanY', y - lastPanY);
                }
            } else {
                // skip gesture updates to avoid shaking on new presses
                lastPanNum = pointer.down.length;
                setKey('DeltaPinch', 0);
                setKey('DeltaRotation', 0);
                setKey('PanX', 0);
                setKey('PanY', 0);
            }
            lastPanX = x;
            lastPanY = y;
            lastAngle = angle;
            lastScaleDistance = distance;

            for (const button in buttonMappings) {
                setKey(button, 0);
                for (const p of pointer.down) {
                    // eslint-disable-next-line no-bitwise
                    if ((p.buttons & buttonMappings[button]) === buttonMappings[button]) {
                        setKey(button, 1);
                    }
                }
            }
        },
        lock() {
            if (locking) {
                return;
            }
            locking = true;
            pointer.xlocked = pointer.xui;
            pointer.ylocked = pointer.yui;
            const request = document.body.requestPointerLock || document.body.mozRequestPointerLock;
            request.apply(document.body);
            document.addEventListener('click', pointerCapturer, {
                capture: true
            });
            document.addEventListener('pointermove', capturedPointerMove, {
                capture: true
            });
        },
        unlock() {
            if (!locking) {
                return;
            }
            locking = false;
            if (document.pointerLockElement || document.mozPointerLockElement) {
                (document.exitPointerLock || document.mozExitPointerLock)();
            }
            document.removeEventListener('click', pointerCapturer);
            document.removeEventListener('pointermove', capturedPointerMove);
        },
        get locked() {
            // Do not return the Document object
            return Boolean(document.pointerLockElement || document.mozPointerLockElement);
        }
    };
    setKey('Wheel', 0);
    if ([false][0]) {
        pointer.lock();
    }

    window.pointer = pointer;
    return pointer;
})();

const keyboard = (function ctKeyboard() {
    var keyPrefix = 'keyboard.';
    var setKey = function (key, value) {
        inputs.registry[keyPrefix + key] = value;
    };

    const keyboard = {
        string: '',
        lastKey: '',
        lastCode: '',
        alt: false,
        shift: false,
        ctrl: false,
        clear() {
            delete keyboard.lastKey;
            delete keyboard.lastCode;
            keyboard.string = '';
            keyboard.alt = false;
            keyboard.shift = false;
            keyboard.ctrl = false;
        },
        check: [],
        onDown(e) {
            keyboard.shift = e.shiftKey;
            keyboard.alt = e.altKey;
            keyboard.ctrl = e.ctrlKey;
            keyboard.lastKey = e.key;
            keyboard.lastCode = e.code;
            if (e.code) {
                setKey(e.code, 1);
            } else {
                setKey('Unknown', 1);
            }
            if (e.key) {
                if (e.key.length === 1) {
                    keyboard.string += e.key;
                } else if (e.key === 'Backspace') {
                    keyboard.string = keyboard.string.slice(0, -1);
                } else if (e.key === 'Enter') {
                    keyboard.string = '';
                }
            }
            if (settings.preventDefault) {
                e.preventDefault();
            }
        },
        onUp(e) {
            keyboard.shift = e.shiftKey;
            keyboard.alt = e.altKey;
            keyboard.ctrl = e.ctrlKey;
            if (e.code) {
                setKey(e.code, 0);
            } else {
                setKey('Unknown', 0);
            }
            if (settings.preventDefault) {
                e.preventDefault();
            }
        }
    };

    if (document.addEventListener) {
        document.addEventListener('keydown', keyboard.onDown, false);
        document.addEventListener('keyup', keyboard.onUp, false);
    } else {
        document.attachEvent('onkeydown', keyboard.onDown);
        document.attachEvent('onkeyup', keyboard.onUp);
    }

    window.keyboard = keyboard;
    return keyboard;
})();

(function(global) {
    'use strict';
  
    var nativeKeyboardEvent = ('KeyboardEvent' in global);
    if (!nativeKeyboardEvent)
      global.KeyboardEvent = function KeyboardEvent() { throw TypeError('Illegal constructor'); };
  
    [
      ['DOM_KEY_LOCATION_STANDARD', 0x00], // Default or unknown location
      ['DOM_KEY_LOCATION_LEFT', 0x01], // e.g. Left Alt key
      ['DOM_KEY_LOCATION_RIGHT', 0x02], // e.g. Right Alt key
      ['DOM_KEY_LOCATION_NUMPAD', 0x03], // e.g. Numpad 0 or +
    ].forEach(function(p) { if (!(p[0] in global.KeyboardEvent)) global.KeyboardEvent[p[0]] = p[1]; });
  
    var STANDARD = global.KeyboardEvent.DOM_KEY_LOCATION_STANDARD,
        LEFT = global.KeyboardEvent.DOM_KEY_LOCATION_LEFT,
        RIGHT = global.KeyboardEvent.DOM_KEY_LOCATION_RIGHT,
        NUMPAD = global.KeyboardEvent.DOM_KEY_LOCATION_NUMPAD;
  
    //--------------------------------------------------------------------
    //
    // Utilities
    //
    //--------------------------------------------------------------------
  
    function contains(s, ss) { return String(s).indexOf(ss) !== -1; }
  
    var os = (function() {
      if (contains(navigator.platform, 'Win')) { return 'win'; }
      if (contains(navigator.platform, 'Mac')) { return 'mac'; }
      if (contains(navigator.platform, 'CrOS')) { return 'cros'; }
      if (contains(navigator.platform, 'Linux')) { return 'linux'; }
      if (contains(navigator.userAgent, 'iPad') || contains(navigator.platform, 'iPod') || contains(navigator.platform, 'iPhone')) { return 'ios'; }
      return '';
    } ());
  
    var browser = (function() {
      if (contains(navigator.userAgent, 'Chrome/')) { return 'chrome'; }
      if (contains(navigator.vendor, 'Apple')) { return 'safari'; }
      if (contains(navigator.userAgent, 'MSIE')) { return 'ie'; }
      if (contains(navigator.userAgent, 'Gecko/')) { return 'moz'; }
      if (contains(navigator.userAgent, 'Opera/')) { return 'opera'; }
      return '';
    } ());
  
    var browser_os = browser + '-' + os;
  
    function mergeIf(baseTable, select, table) {
      if (browser_os === select || browser === select || os === select) {
        Object.keys(table).forEach(function(keyCode) {
          baseTable[keyCode] = table[keyCode];
        });
      }
    }
  
    function remap(o, key) {
      var r = {};
      Object.keys(o).forEach(function(k) {
        var item = o[k];
        if (key in item) {
          r[item[key]] = item;
        }
      });
      return r;
    }
  
    function invert(o) {
      var r = {};
      Object.keys(o).forEach(function(k) {
        r[o[k]] = k;
      });
      return r;
    }
  
    //--------------------------------------------------------------------
    //
    // Generic Mappings
    //
    //--------------------------------------------------------------------
  
    // "keyInfo" is a dictionary:
    //   code: string - name from UI Events KeyboardEvent code Values
    //     https://w3c.github.io/uievents-code/
    //   location (optional): number - one of the DOM_KEY_LOCATION values
    //   keyCap (optional): string - keyboard label in en-US locale
    // USB code Usage ID from page 0x07 unless otherwise noted (Informative)
  
    // Map of keyCode to keyInfo
    var keyCodeToInfoTable = {
      // 0x01 - VK_LBUTTON
      // 0x02 - VK_RBUTTON
      0x03: { code: 'Cancel' }, // [USB: 0x9b] char \x0018 ??? (Not in D3E)
      // 0x04 - VK_MBUTTON
      // 0x05 - VK_XBUTTON1
      // 0x06 - VK_XBUTTON2
      0x06: { code: 'Help' }, // [USB: 0x75] ???
      // 0x07 - undefined
      0x08: { code: 'Backspace' }, // [USB: 0x2a] Labelled Delete on Macintosh keyboards.
      0x09: { code: 'Tab' }, // [USB: 0x2b]
      // 0x0A-0x0B - reserved
      0X0C: { code: 'Clear' }, // [USB: 0x9c] NumPad Center (Not in D3E)
      0X0D: { code: 'Enter' }, // [USB: 0x28]
      // 0x0E-0x0F - undefined
  
      0x10: { code: 'Shift' },
      0x11: { code: 'Control' },
      0x12: { code: 'Alt' },
      0x13: { code: 'Pause' }, // [USB: 0x48]
      0x14: { code: 'CapsLock' }, // [USB: 0x39]
      0x15: { code: 'KanaMode' }, // [USB: 0x88]
      0x16: { code: 'Lang1' }, // [USB: 0x90]
      // 0x17: VK_JUNJA
      // 0x18: VK_FINAL
      0x19: { code: 'Lang2' }, // [USB: 0x91]
      // 0x1A - undefined
      0x1B: { code: 'Escape' }, // [USB: 0x29]
      0x1C: { code: 'Convert' }, // [USB: 0x8a]
      0x1D: { code: 'NonConvert' }, // [USB: 0x8b]
      0x1E: { code: 'Accept' }, // [USB: ????]
      0x1F: { code: 'ModeChange' }, // [USB: ????]
  
      0x20: { code: 'Space' }, // [USB: 0x2c]
      0x21: { code: 'PageUp' }, // [USB: 0x4b]
      0x22: { code: 'PageDown' }, // [USB: 0x4e]
      0x23: { code: 'End' }, // [USB: 0x4d]
      0x24: { code: 'Home' }, // [USB: 0x4a]
      0x25: { code: 'ArrowLeft' }, // [USB: 0x50]
      0x26: { code: 'ArrowUp' }, // [USB: 0x52]
      0x27: { code: 'ArrowRight' }, // [USB: 0x4f]
      0x28: { code: 'ArrowDown' }, // [USB: 0x51]
      0x29: { code: 'Select' }, // (Not in D3E)
      0x2A: { code: 'Print' }, // (Not in D3E)
      0x2B: { code: 'Execute' }, // [USB: 0x74] (Not in D3E)
      0x2C: { code: 'PrintScreen' }, // [USB: 0x46]
      0x2D: { code: 'Insert' }, // [USB: 0x49]
      0x2E: { code: 'Delete' }, // [USB: 0x4c]
      0x2F: { code: 'Help' }, // [USB: 0x75] ???
  
      0x30: { code: 'Digit0', keyCap: '0' }, // [USB: 0x27] 0)
      0x31: { code: 'Digit1', keyCap: '1' }, // [USB: 0x1e] 1!
      0x32: { code: 'Digit2', keyCap: '2' }, // [USB: 0x1f] 2@
      0x33: { code: 'Digit3', keyCap: '3' }, // [USB: 0x20] 3#
      0x34: { code: 'Digit4', keyCap: '4' }, // [USB: 0x21] 4$
      0x35: { code: 'Digit5', keyCap: '5' }, // [USB: 0x22] 5%
      0x36: { code: 'Digit6', keyCap: '6' }, // [USB: 0x23] 6^
      0x37: { code: 'Digit7', keyCap: '7' }, // [USB: 0x24] 7&
      0x38: { code: 'Digit8', keyCap: '8' }, // [USB: 0x25] 8*
      0x39: { code: 'Digit9', keyCap: '9' }, // [USB: 0x26] 9(
      // 0x3A-0x40 - undefined
  
      0x41: { code: 'KeyA', keyCap: 'a' }, // [USB: 0x04]
      0x42: { code: 'KeyB', keyCap: 'b' }, // [USB: 0x05]
      0x43: { code: 'KeyC', keyCap: 'c' }, // [USB: 0x06]
      0x44: { code: 'KeyD', keyCap: 'd' }, // [USB: 0x07]
      0x45: { code: 'KeyE', keyCap: 'e' }, // [USB: 0x08]
      0x46: { code: 'KeyF', keyCap: 'f' }, // [USB: 0x09]
      0x47: { code: 'KeyG', keyCap: 'g' }, // [USB: 0x0a]
      0x48: { code: 'KeyH', keyCap: 'h' }, // [USB: 0x0b]
      0x49: { code: 'KeyI', keyCap: 'i' }, // [USB: 0x0c]
      0x4A: { code: 'KeyJ', keyCap: 'j' }, // [USB: 0x0d]
      0x4B: { code: 'KeyK', keyCap: 'k' }, // [USB: 0x0e]
      0x4C: { code: 'KeyL', keyCap: 'l' }, // [USB: 0x0f]
      0x4D: { code: 'KeyM', keyCap: 'm' }, // [USB: 0x10]
      0x4E: { code: 'KeyN', keyCap: 'n' }, // [USB: 0x11]
      0x4F: { code: 'KeyO', keyCap: 'o' }, // [USB: 0x12]
  
      0x50: { code: 'KeyP', keyCap: 'p' }, // [USB: 0x13]
      0x51: { code: 'KeyQ', keyCap: 'q' }, // [USB: 0x14]
      0x52: { code: 'KeyR', keyCap: 'r' }, // [USB: 0x15]
      0x53: { code: 'KeyS', keyCap: 's' }, // [USB: 0x16]
      0x54: { code: 'KeyT', keyCap: 't' }, // [USB: 0x17]
      0x55: { code: 'KeyU', keyCap: 'u' }, // [USB: 0x18]
      0x56: { code: 'KeyV', keyCap: 'v' }, // [USB: 0x19]
      0x57: { code: 'KeyW', keyCap: 'w' }, // [USB: 0x1a]
      0x58: { code: 'KeyX', keyCap: 'x' }, // [USB: 0x1b]
      0x59: { code: 'KeyY', keyCap: 'y' }, // [USB: 0x1c]
      0x5A: { code: 'KeyZ', keyCap: 'z' }, // [USB: 0x1d]
      0x5B: { code: 'MetaLeft', location: LEFT }, // [USB: 0xe3]
      0x5C: { code: 'MetaRight', location: RIGHT }, // [USB: 0xe7]
      0x5D: { code: 'ContextMenu' }, // [USB: 0x65] Context Menu
      // 0x5E - reserved
      0x5F: { code: 'Standby' }, // [USB: 0x82] Sleep
  
      0x60: { code: 'Numpad0', keyCap: '0', location: NUMPAD }, // [USB: 0x62]
      0x61: { code: 'Numpad1', keyCap: '1', location: NUMPAD }, // [USB: 0x59]
      0x62: { code: 'Numpad2', keyCap: '2', location: NUMPAD }, // [USB: 0x5a]
      0x63: { code: 'Numpad3', keyCap: '3', location: NUMPAD }, // [USB: 0x5b]
      0x64: { code: 'Numpad4', keyCap: '4', location: NUMPAD }, // [USB: 0x5c]
      0x65: { code: 'Numpad5', keyCap: '5', location: NUMPAD }, // [USB: 0x5d]
      0x66: { code: 'Numpad6', keyCap: '6', location: NUMPAD }, // [USB: 0x5e]
      0x67: { code: 'Numpad7', keyCap: '7', location: NUMPAD }, // [USB: 0x5f]
      0x68: { code: 'Numpad8', keyCap: '8', location: NUMPAD }, // [USB: 0x60]
      0x69: { code: 'Numpad9', keyCap: '9', location: NUMPAD }, // [USB: 0x61]
      0x6A: { code: 'NumpadMultiply', keyCap: '*', location: NUMPAD }, // [USB: 0x55]
      0x6B: { code: 'NumpadAdd', keyCap: '+', location: NUMPAD }, // [USB: 0x57]
      0x6C: { code: 'NumpadComma', keyCap: ',', location: NUMPAD }, // [USB: 0x85]
      0x6D: { code: 'NumpadSubtract', keyCap: '-', location: NUMPAD }, // [USB: 0x56]
      0x6E: { code: 'NumpadDecimal', keyCap: '.', location: NUMPAD }, // [USB: 0x63]
      0x6F: { code: 'NumpadDivide', keyCap: '/', location: NUMPAD }, // [USB: 0x54]
  
      0x70: { code: 'F1' }, // [USB: 0x3a]
      0x71: { code: 'F2' }, // [USB: 0x3b]
      0x72: { code: 'F3' }, // [USB: 0x3c]
      0x73: { code: 'F4' }, // [USB: 0x3d]
      0x74: { code: 'F5' }, // [USB: 0x3e]
      0x75: { code: 'F6' }, // [USB: 0x3f]
      0x76: { code: 'F7' }, // [USB: 0x40]
      0x77: { code: 'F8' }, // [USB: 0x41]
      0x78: { code: 'F9' }, // [USB: 0x42]
      0x79: { code: 'F10' }, // [USB: 0x43]
      0x7A: { code: 'F11' }, // [USB: 0x44]
      0x7B: { code: 'F12' }, // [USB: 0x45]
      0x7C: { code: 'F13' }, // [USB: 0x68]
      0x7D: { code: 'F14' }, // [USB: 0x69]
      0x7E: { code: 'F15' }, // [USB: 0x6a]
      0x7F: { code: 'F16' }, // [USB: 0x6b]
  
      0x80: { code: 'F17' }, // [USB: 0x6c]
      0x81: { code: 'F18' }, // [USB: 0x6d]
      0x82: { code: 'F19' }, // [USB: 0x6e]
      0x83: { code: 'F20' }, // [USB: 0x6f]
      0x84: { code: 'F21' }, // [USB: 0x70]
      0x85: { code: 'F22' }, // [USB: 0x71]
      0x86: { code: 'F23' }, // [USB: 0x72]
      0x87: { code: 'F24' }, // [USB: 0x73]
      // 0x88-0x8F - unassigned
  
      0x90: { code: 'NumLock', location: NUMPAD }, // [USB: 0x53]
      0x91: { code: 'ScrollLock' }, // [USB: 0x47]
      // 0x92-0x96 - OEM specific
      // 0x97-0x9F - unassigned
  
      // NOTE: 0xA0-0xA5 usually mapped to 0x10-0x12 in browsers
      0xA0: { code: 'ShiftLeft', location: LEFT }, // [USB: 0xe1]
      0xA1: { code: 'ShiftRight', location: RIGHT }, // [USB: 0xe5]
      0xA2: { code: 'ControlLeft', location: LEFT }, // [USB: 0xe0]
      0xA3: { code: 'ControlRight', location: RIGHT }, // [USB: 0xe4]
      0xA4: { code: 'AltLeft', location: LEFT }, // [USB: 0xe2]
      0xA5: { code: 'AltRight', location: RIGHT }, // [USB: 0xe6]
  
      0xA6: { code: 'BrowserBack' }, // [USB: 0x0c/0x0224]
      0xA7: { code: 'BrowserForward' }, // [USB: 0x0c/0x0225]
      0xA8: { code: 'BrowserRefresh' }, // [USB: 0x0c/0x0227]
      0xA9: { code: 'BrowserStop' }, // [USB: 0x0c/0x0226]
      0xAA: { code: 'BrowserSearch' }, // [USB: 0x0c/0x0221]
      0xAB: { code: 'BrowserFavorites' }, // [USB: 0x0c/0x0228]
      0xAC: { code: 'BrowserHome' }, // [USB: 0x0c/0x0222]
      0xAD: { code: 'AudioVolumeMute' }, // [USB: 0x7f]
      0xAE: { code: 'AudioVolumeDown' }, // [USB: 0x81]
      0xAF: { code: 'AudioVolumeUp' }, // [USB: 0x80]
  
      0xB0: { code: 'MediaTrackNext' }, // [USB: 0x0c/0x00b5]
      0xB1: { code: 'MediaTrackPrevious' }, // [USB: 0x0c/0x00b6]
      0xB2: { code: 'MediaStop' }, // [USB: 0x0c/0x00b7]
      0xB3: { code: 'MediaPlayPause' }, // [USB: 0x0c/0x00cd]
      0xB4: { code: 'LaunchMail' }, // [USB: 0x0c/0x018a]
      0xB5: { code: 'MediaSelect' },
      0xB6: { code: 'LaunchApp1' },
      0xB7: { code: 'LaunchApp2' },
      // 0xB8-0xB9 - reserved
      0xBA: { code: 'Semicolon',  keyCap: ';' }, // [USB: 0x33] ;: (US Standard 101)
      0xBB: { code: 'Equal', keyCap: '=' }, // [USB: 0x2e] =+
      0xBC: { code: 'Comma', keyCap: ',' }, // [USB: 0x36] ,<
      0xBD: { code: 'Minus', keyCap: '-' }, // [USB: 0x2d] -_
      0xBE: { code: 'Period', keyCap: '.' }, // [USB: 0x37] .>
      0xBF: { code: 'Slash', keyCap: '/' }, // [USB: 0x38] /? (US Standard 101)
  
      0xC0: { code: 'Backquote', keyCap: '`' }, // [USB: 0x35] `~ (US Standard 101)
      // 0xC1-0xCF - reserved
  
      // 0xD0-0xD7 - reserved
      // 0xD8-0xDA - unassigned
      0xDB: { code: 'BracketLeft', keyCap: '[' }, // [USB: 0x2f] [{ (US Standard 101)
      0xDC: { code: 'Backslash',  keyCap: '\\' }, // [USB: 0x31] \| (US Standard 101)
      0xDD: { code: 'BracketRight', keyCap: ']' }, // [USB: 0x30] ]} (US Standard 101)
      0xDE: { code: 'Quote', keyCap: '\'' }, // [USB: 0x34] '" (US Standard 101)
      // 0xDF - miscellaneous/varies
  
      // 0xE0 - reserved
      // 0xE1 - OEM specific
      0xE2: { code: 'IntlBackslash',  keyCap: '\\' }, // [USB: 0x64] \| (UK Standard 102)
      // 0xE3-0xE4 - OEM specific
      0xE5: { code: 'Process' }, // (Not in D3E)
      // 0xE6 - OEM specific
      // 0xE7 - VK_PACKET
      // 0xE8 - unassigned
      // 0xE9-0xEF - OEM specific
  
      // 0xF0-0xF5 - OEM specific
      0xF6: { code: 'Attn' }, // [USB: 0x9a] (Not in D3E)
      0xF7: { code: 'CrSel' }, // [USB: 0xa3] (Not in D3E)
      0xF8: { code: 'ExSel' }, // [USB: 0xa4] (Not in D3E)
      0xF9: { code: 'EraseEof' }, // (Not in D3E)
      0xFA: { code: 'Play' }, // (Not in D3E)
      0xFB: { code: 'ZoomToggle' }, // (Not in D3E)
      // 0xFC - VK_NONAME - reserved
      // 0xFD - VK_PA1
      0xFE: { code: 'Clear' } // [USB: 0x9c] (Not in D3E)
    };
  
    // No legacy keyCode, but listed in D3E:
  
    // code: usb
    // 'IntlHash': 0x070032,
    // 'IntlRo': 0x070087,
    // 'IntlYen': 0x070089,
    // 'NumpadBackspace': 0x0700bb,
    // 'NumpadClear': 0x0700d8,
    // 'NumpadClearEntry': 0x0700d9,
    // 'NumpadMemoryAdd': 0x0700d3,
    // 'NumpadMemoryClear': 0x0700d2,
    // 'NumpadMemoryRecall': 0x0700d1,
    // 'NumpadMemoryStore': 0x0700d0,
    // 'NumpadMemorySubtract': 0x0700d4,
    // 'NumpadParenLeft': 0x0700b6,
    // 'NumpadParenRight': 0x0700b7,
  
    //--------------------------------------------------------------------
    //
    // Browser/OS Specific Mappings
    //
    //--------------------------------------------------------------------
  
    mergeIf(keyCodeToInfoTable,
            'moz', {
              0x3B: { code: 'Semicolon', keyCap: ';' }, // [USB: 0x33] ;: (US Standard 101)
              0x3D: { code: 'Equal', keyCap: '=' }, // [USB: 0x2e] =+
              0x6B: { code: 'Equal', keyCap: '=' }, // [USB: 0x2e] =+
              0x6D: { code: 'Minus', keyCap: '-' }, // [USB: 0x2d] -_
              0xBB: { code: 'NumpadAdd', keyCap: '+', location: NUMPAD }, // [USB: 0x57]
              0xBD: { code: 'NumpadSubtract', keyCap: '-', location: NUMPAD } // [USB: 0x56]
            });
  
    mergeIf(keyCodeToInfoTable,
            'moz-mac', {
              0x0C: { code: 'NumLock', location: NUMPAD }, // [USB: 0x53]
              0xAD: { code: 'Minus', keyCap: '-' } // [USB: 0x2d] -_
            });
  
    mergeIf(keyCodeToInfoTable,
            'moz-win', {
              0xAD: { code: 'Minus', keyCap: '-' } // [USB: 0x2d] -_
            });
  
    mergeIf(keyCodeToInfoTable,
            'chrome-mac', {
              0x5D: { code: 'MetaRight', location: RIGHT } // [USB: 0xe7]
            });
  
    // Windows via Bootcamp (!)
    if (0) {
      mergeIf(keyCodeToInfoTable,
              'chrome-win', {
                0xC0: { code: 'Quote', keyCap: '\'' }, // [USB: 0x34] '" (US Standard 101)
                0xDE: { code: 'Backslash',  keyCap: '\\' }, // [USB: 0x31] \| (US Standard 101)
                0xDF: { code: 'Backquote', keyCap: '`' } // [USB: 0x35] `~ (US Standard 101)
              });
  
      mergeIf(keyCodeToInfoTable,
              'ie', {
                0xC0: { code: 'Quote', keyCap: '\'' }, // [USB: 0x34] '" (US Standard 101)
                0xDE: { code: 'Backslash',  keyCap: '\\' }, // [USB: 0x31] \| (US Standard 101)
                0xDF: { code: 'Backquote', keyCap: '`' } // [USB: 0x35] `~ (US Standard 101)
              });
    }
  
    mergeIf(keyCodeToInfoTable,
            'safari', {
              0x03: { code: 'Enter' }, // [USB: 0x28] old Safari
              0x19: { code: 'Tab' } // [USB: 0x2b] old Safari for Shift+Tab
            });
  
    mergeIf(keyCodeToInfoTable,
            'ios', {
              0x0A: { code: 'Enter', location: STANDARD } // [USB: 0x28]
            });
  
    mergeIf(keyCodeToInfoTable,
            'safari-mac', {
              0x5B: { code: 'MetaLeft', location: LEFT }, // [USB: 0xe3]
              0x5D: { code: 'MetaRight', location: RIGHT }, // [USB: 0xe7]
              0xE5: { code: 'KeyQ', keyCap: 'Q' } // [USB: 0x14] On alternate presses, Ctrl+Q sends this
            });
  
    //--------------------------------------------------------------------
    //
    // Identifier Mappings
    //
    //--------------------------------------------------------------------
  
    // Cases where newer-ish browsers send keyIdentifier which can be
    // used to disambiguate keys.
  
    // keyIdentifierTable[keyIdentifier] -> keyInfo
  
    var keyIdentifierTable = {};
    if ('cros' === os) {
      keyIdentifierTable['U+00A0'] = { code: 'ShiftLeft', location: LEFT };
      keyIdentifierTable['U+00A1'] = { code: 'ShiftRight', location: RIGHT };
      keyIdentifierTable['U+00A2'] = { code: 'ControlLeft', location: LEFT };
      keyIdentifierTable['U+00A3'] = { code: 'ControlRight', location: RIGHT };
      keyIdentifierTable['U+00A4'] = { code: 'AltLeft', location: LEFT };
      keyIdentifierTable['U+00A5'] = { code: 'AltRight', location: RIGHT };
    }
    if ('chrome-mac' === browser_os) {
      keyIdentifierTable['U+0010'] = { code: 'ContextMenu' };
    }
    if ('safari-mac' === browser_os) {
      keyIdentifierTable['U+0010'] = { code: 'ContextMenu' };
    }
    if ('ios' === os) {
      // These only generate keyup events
      keyIdentifierTable['U+0010'] = { code: 'Function' };
  
      keyIdentifierTable['U+001C'] = { code: 'ArrowLeft' };
      keyIdentifierTable['U+001D'] = { code: 'ArrowRight' };
      keyIdentifierTable['U+001E'] = { code: 'ArrowUp' };
      keyIdentifierTable['U+001F'] = { code: 'ArrowDown' };
  
      keyIdentifierTable['U+0001'] = { code: 'Home' }; // [USB: 0x4a] Fn + ArrowLeft
      keyIdentifierTable['U+0004'] = { code: 'End' }; // [USB: 0x4d] Fn + ArrowRight
      keyIdentifierTable['U+000B'] = { code: 'PageUp' }; // [USB: 0x4b] Fn + ArrowUp
      keyIdentifierTable['U+000C'] = { code: 'PageDown' }; // [USB: 0x4e] Fn + ArrowDown
    }
  
    //--------------------------------------------------------------------
    //
    // Location Mappings
    //
    //--------------------------------------------------------------------
  
    // Cases where newer-ish browsers send location/keyLocation which
    // can be used to disambiguate keys.
  
    // locationTable[location][keyCode] -> keyInfo
    var locationTable = [];
    locationTable[LEFT] = {
      0x10: { code: 'ShiftLeft', location: LEFT }, // [USB: 0xe1]
      0x11: { code: 'ControlLeft', location: LEFT }, // [USB: 0xe0]
      0x12: { code: 'AltLeft', location: LEFT } // [USB: 0xe2]
    };
    locationTable[RIGHT] = {
      0x10: { code: 'ShiftRight', location: RIGHT }, // [USB: 0xe5]
      0x11: { code: 'ControlRight', location: RIGHT }, // [USB: 0xe4]
      0x12: { code: 'AltRight', location: RIGHT } // [USB: 0xe6]
    };
    locationTable[NUMPAD] = {
      0x0D: { code: 'NumpadEnter', location: NUMPAD } // [USB: 0x58]
    };
  
    mergeIf(locationTable[NUMPAD], 'moz', {
      0x6D: { code: 'NumpadSubtract', location: NUMPAD }, // [USB: 0x56]
      0x6B: { code: 'NumpadAdd', location: NUMPAD } // [USB: 0x57]
    });
    mergeIf(locationTable[LEFT], 'moz-mac', {
      0xE0: { code: 'MetaLeft', location: LEFT } // [USB: 0xe3]
    });
    mergeIf(locationTable[RIGHT], 'moz-mac', {
      0xE0: { code: 'MetaRight', location: RIGHT } // [USB: 0xe7]
    });
    mergeIf(locationTable[RIGHT], 'moz-win', {
      0x5B: { code: 'MetaRight', location: RIGHT } // [USB: 0xe7]
    });
  
  
    mergeIf(locationTable[RIGHT], 'mac', {
      0x5D: { code: 'MetaRight', location: RIGHT } // [USB: 0xe7]
    });
  
    mergeIf(locationTable[NUMPAD], 'chrome-mac', {
      0x0C: { code: 'NumLock', location: NUMPAD } // [USB: 0x53]
    });
  
    mergeIf(locationTable[NUMPAD], 'safari-mac', {
      0x0C: { code: 'NumLock', location: NUMPAD }, // [USB: 0x53]
      0xBB: { code: 'NumpadAdd', location: NUMPAD }, // [USB: 0x57]
      0xBD: { code: 'NumpadSubtract', location: NUMPAD }, // [USB: 0x56]
      0xBE: { code: 'NumpadDecimal', location: NUMPAD }, // [USB: 0x63]
      0xBF: { code: 'NumpadDivide', location: NUMPAD } // [USB: 0x54]
    });
  
  
    //--------------------------------------------------------------------
    //
    // Key Values
    //
    //--------------------------------------------------------------------
  
    // Mapping from `code` values to `key` values. Values defined at:
    // https://w3c.github.io/uievents-key/
    // Entries are only provided when `key` differs from `code`. If
    // printable, `shiftKey` has the shifted printable character. This
    // assumes US Standard 101 layout
  
    var codeToKeyTable = {
      // Modifier Keys
      ShiftLeft: { key: 'Shift' },
      ShiftRight: { key: 'Shift' },
      ControlLeft: { key: 'Control' },
      ControlRight: { key: 'Control' },
      AltLeft: { key: 'Alt' },
      AltRight: { key: 'Alt' },
      MetaLeft: { key: 'Meta' },
      MetaRight: { key: 'Meta' },
  
      // Whitespace Keys
      NumpadEnter: { key: 'Enter' },
      Space: { key: ' ' },
  
      // Printable Keys
      Digit0: { key: '0', shiftKey: ')' },
      Digit1: { key: '1', shiftKey: '!' },
      Digit2: { key: '2', shiftKey: '@' },
      Digit3: { key: '3', shiftKey: '#' },
      Digit4: { key: '4', shiftKey: '$' },
      Digit5: { key: '5', shiftKey: '%' },
      Digit6: { key: '6', shiftKey: '^' },
      Digit7: { key: '7', shiftKey: '&' },
      Digit8: { key: '8', shiftKey: '*' },
      Digit9: { key: '9', shiftKey: '(' },
      KeyA: { key: 'a', shiftKey: 'A' },
      KeyB: { key: 'b', shiftKey: 'B' },
      KeyC: { key: 'c', shiftKey: 'C' },
      KeyD: { key: 'd', shiftKey: 'D' },
      KeyE: { key: 'e', shiftKey: 'E' },
      KeyF: { key: 'f', shiftKey: 'F' },
      KeyG: { key: 'g', shiftKey: 'G' },
      KeyH: { key: 'h', shiftKey: 'H' },
      KeyI: { key: 'i', shiftKey: 'I' },
      KeyJ: { key: 'j', shiftKey: 'J' },
      KeyK: { key: 'k', shiftKey: 'K' },
      KeyL: { key: 'l', shiftKey: 'L' },
      KeyM: { key: 'm', shiftKey: 'M' },
      KeyN: { key: 'n', shiftKey: 'N' },
      KeyO: { key: 'o', shiftKey: 'O' },
      KeyP: { key: 'p', shiftKey: 'P' },
      KeyQ: { key: 'q', shiftKey: 'Q' },
      KeyR: { key: 'r', shiftKey: 'R' },
      KeyS: { key: 's', shiftKey: 'S' },
      KeyT: { key: 't', shiftKey: 'T' },
      KeyU: { key: 'u', shiftKey: 'U' },
      KeyV: { key: 'v', shiftKey: 'V' },
      KeyW: { key: 'w', shiftKey: 'W' },
      KeyX: { key: 'x', shiftKey: 'X' },
      KeyY: { key: 'y', shiftKey: 'Y' },
      KeyZ: { key: 'z', shiftKey: 'Z' },
      Numpad0: { key: '0' },
      Numpad1: { key: '1' },
      Numpad2: { key: '2' },
      Numpad3: { key: '3' },
      Numpad4: { key: '4' },
      Numpad5: { key: '5' },
      Numpad6: { key: '6' },
      Numpad7: { key: '7' },
      Numpad8: { key: '8' },
      Numpad9: { key: '9' },
      NumpadMultiply: { key: '*' },
      NumpadAdd: { key: '+' },
      NumpadComma: { key: ',' },
      NumpadSubtract: { key: '-' },
      NumpadDecimal: { key: '.' },
      NumpadDivide: { key: '/' },
      Semicolon: { key: ';', shiftKey: ':' },
      Equal: { key: '=', shiftKey: '+' },
      Comma: { key: ',', shiftKey: '<' },
      Minus: { key: '-', shiftKey: '_' },
      Period: { key: '.', shiftKey: '>' },
      Slash: { key: '/', shiftKey: '?' },
      Backquote: { key: '`', shiftKey: '~' },
      BracketLeft: { key: '[', shiftKey: '{' },
      Backslash: { key: '\\', shiftKey: '|' },
      BracketRight: { key: ']', shiftKey: '}' },
      Quote: { key: '\'', shiftKey: '"' },
      IntlBackslash: { key: '\\', shiftKey: '|' }
    };
  
    mergeIf(codeToKeyTable, 'mac', {
      MetaLeft: { key: 'Meta' },
      MetaRight: { key: 'Meta' }
    });
  
    // Corrections for 'key' names in older browsers (e.g. FF36-, IE9, etc)
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.key#Key_values
    var keyFixTable = {
      Add: '+',
      Decimal: '.',
      Divide: '/',
      Subtract: '-',
      Multiply: '*',
      Spacebar: ' ',
      Esc: 'Escape',
      Nonconvert: 'NonConvert',
      Left: 'ArrowLeft',
      Up: 'ArrowUp',
      Right: 'ArrowRight',
      Down: 'ArrowDown',
      Del: 'Delete',
      Menu: 'ContextMenu',
      MediaNextTrack: 'MediaTrackNext',
      MediaPreviousTrack: 'MediaTrackPrevious',
      SelectMedia: 'MediaSelect',
      HalfWidth: 'Hankaku',
      FullWidth: 'Zenkaku',
      RomanCharacters: 'Romaji',
      Crsel: 'CrSel',
      Exsel: 'ExSel',
      Zoom: 'ZoomToggle'
    };
  
    //--------------------------------------------------------------------
    //
    // Exported Functions
    //
    //--------------------------------------------------------------------
  
  
    var codeTable = remap(keyCodeToInfoTable, 'code');
  
    try {
      var nativeLocation = nativeKeyboardEvent && ('location' in new KeyboardEvent(''));
    } catch (_) {}
  
    function keyInfoForEvent(event) {
      var keyCode = 'keyCode' in event ? event.keyCode : 'which' in event ? event.which : 0;
      var keyInfo = (function(){
        if (nativeLocation || 'keyLocation' in event) {
          var location = nativeLocation ? event.location : event.keyLocation;
          if (location && keyCode in locationTable[location]) {
            return locationTable[location][keyCode];
          }
        }
        if ('keyIdentifier' in event && event.keyIdentifier in keyIdentifierTable) {
          return keyIdentifierTable[event.keyIdentifier];
        }
        if (keyCode in keyCodeToInfoTable) {
          return keyCodeToInfoTable[keyCode];
        }
        return null;
      }());
  
      // TODO: Track these down and move to general tables
      if (0) {
        // TODO: Map these for newerish browsers?
        // TODO: iOS only?
        // TODO: Override with more common keyIdentifier name?
        switch (event.keyIdentifier) {
        case 'U+0010': keyInfo = { code: 'Function' }; break;
        case 'U+001C': keyInfo = { code: 'ArrowLeft' }; break;
        case 'U+001D': keyInfo = { code: 'ArrowRight' }; break;
        case 'U+001E': keyInfo = { code: 'ArrowUp' }; break;
        case 'U+001F': keyInfo = { code: 'ArrowDown' }; break;
        }
      }
  
      if (!keyInfo)
        return null;
  
      var key = (function() {
        var entry = codeToKeyTable[keyInfo.code];
        if (!entry) return keyInfo.code;
        return (event.shiftKey && 'shiftKey' in entry) ? entry.shiftKey : entry.key;
      }());
  
      return {
        code: keyInfo.code,
        key: key,
        location: keyInfo.location,
        keyCap: keyInfo.keyCap
      };
    }
  
    function queryKeyCap(code, locale) {
      code = String(code);
      if (!codeTable.hasOwnProperty(code)) return 'Undefined';
      if (locale && String(locale).toLowerCase() !== 'en-us') throw Error('Unsupported locale');
      var keyInfo = codeTable[code];
      return keyInfo.keyCap || keyInfo.code || 'Undefined';
    }
  
    if ('KeyboardEvent' in global && 'defineProperty' in Object) {
      (function() {
        function define(o, p, v) {
          if (p in o) return;
          Object.defineProperty(o, p, v);
        }
  
        define(KeyboardEvent.prototype, 'code', { get: function() {
          var keyInfo = keyInfoForEvent(this);
          return keyInfo ? keyInfo.code : '';
        }});
  
        // Fix for nonstandard `key` values (FF36-)
        if ('key' in KeyboardEvent.prototype) {
          var desc = Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, 'key');
          Object.defineProperty(KeyboardEvent.prototype, 'key', { get: function() {
            var key = desc.get.call(this);
            return keyFixTable.hasOwnProperty(key) ? keyFixTable[key] : key;
          }});
        }
  
        define(KeyboardEvent.prototype, 'key', { get: function() {
          var keyInfo = keyInfoForEvent(this);
          return (keyInfo && 'key' in keyInfo) ? keyInfo.key : 'Unidentified';
        }});
  
        define(KeyboardEvent.prototype, 'location', { get: function() {
          var keyInfo = keyInfoForEvent(this);
          return (keyInfo && 'location' in keyInfo) ? keyInfo.location : STANDARD;
        }});
  
        define(KeyboardEvent.prototype, 'locale', { get: function() {
          return '';
        }});
      }());
    }
  
    if (!('queryKeyCap' in global.KeyboardEvent))
      global.KeyboardEvent.queryKeyCap = queryKeyCap;
  
    // Helper for IE8-
    global.identifyKey = function(event) {
      if ('code' in event)
        return;
  
      var keyInfo = keyInfoForEvent(event);
      event.code = keyInfo ? keyInfo.code : '';
      event.key = (keyInfo && 'key' in keyInfo) ? keyInfo.key : 'Unidentified';
      event.location = ('location' in event) ? event.location :
        ('keyLocation' in event) ? event.keyLocation :
        (keyInfo && 'location' in keyInfo) ? keyInfo.location : STANDARD;
      event.locale = '';
    };
  
  }(self));
  
/*!
 * PEP v0.4.3 | https://github.com/jquery/PEP
 * Copyright jQuery Foundation and other contributors | http://jquery.org/license
 */
!function(a,b){"object"==typeof exports&&"undefined"!=typeof module?module.exports=b():"function"==typeof define&&define.amd?define(b):a.PointerEventsPolyfill=b()}(this,function(){"use strict";function a(a,b){b=b||Object.create(null);var c=document.createEvent("Event");c.initEvent(a,b.bubbles||!1,b.cancelable||!1);
// define inherited MouseEvent properties
// skip bubbles and cancelable since they're set above in initEvent()
for(var d,e=2;e<m.length;e++)d=m[e],c[d]=b[d]||n[e];c.buttons=b.buttons||0;
// Spec requires that pointers without pressure specified use 0.5 for down
// state and 0 for up state.
var f=0;
// add x/y properties aliased to clientX/Y
// define the properties of the PointerEvent interface
return f=b.pressure&&c.buttons?b.pressure:c.buttons?.5:0,c.x=c.clientX,c.y=c.clientY,c.pointerId=b.pointerId||0,c.width=b.width||0,c.height=b.height||0,c.pressure=f,c.tiltX=b.tiltX||0,c.tiltY=b.tiltY||0,c.twist=b.twist||0,c.tangentialPressure=b.tangentialPressure||0,c.pointerType=b.pointerType||"",c.hwTimestamp=b.hwTimestamp||0,c.isPrimary=b.isPrimary||!1,c}function b(){this.array=[],this.size=0}function c(a,b,c,d){this.addCallback=a.bind(d),this.removeCallback=b.bind(d),this.changedCallback=c.bind(d),A&&(this.observer=new A(this.mutationWatcher.bind(this)))}function d(a){return"body /shadow-deep/ "+e(a)}function e(a){return'[touch-action="'+a+'"]'}function f(a){return"{ -ms-touch-action: "+a+"; touch-action: "+a+"; }"}function g(){if(F){D.forEach(function(a){String(a)===a?(E+=e(a)+f(a)+"\n",G&&(E+=d(a)+f(a)+"\n")):(E+=a.selectors.map(e)+f(a.rule)+"\n",G&&(E+=a.selectors.map(d)+f(a.rule)+"\n"))});var a=document.createElement("style");a.textContent=E,document.head.appendChild(a)}}function h(){
// only activate if this platform does not have pointer events
if(!window.PointerEvent){if(window.PointerEvent=a,window.navigator.msPointerEnabled){var b=window.navigator.msMaxTouchPoints;Object.defineProperty(window.navigator,"maxTouchPoints",{value:b,enumerable:!0}),u.registerSource("ms",_)}else Object.defineProperty(window.navigator,"maxTouchPoints",{value:0,enumerable:!0}),u.registerSource("mouse",N),void 0!==window.ontouchstart&&u.registerSource("touch",V);u.register(document)}}function i(a){if(!u.pointermap.has(a)){var b=new Error("InvalidPointerId");throw b.name="InvalidPointerId",b}}function j(a){for(var b=a.parentNode;b&&b!==a.ownerDocument;)b=b.parentNode;if(!b){var c=new Error("InvalidStateError");throw c.name="InvalidStateError",c}}function k(a){var b=u.pointermap.get(a);return 0!==b.buttons}function l(){window.Element&&!Element.prototype.setPointerCapture&&Object.defineProperties(Element.prototype,{setPointerCapture:{value:W},releasePointerCapture:{value:X},hasPointerCapture:{value:Y}})}/**
   * This is the constructor for new PointerEvents.
   *
   * New Pointer Events must be given a type, and an optional dictionary of
   * initialization properties.
   *
   * Due to certain platform requirements, events returned from the constructor
   * identify as MouseEvents.
   *
   * @constructor
   * @param {String} inType The type of the event to create.
   * @param {Object} [inDict] An optional dictionary of initial event properties.
   * @return {Event} A new PointerEvent of type `inType`, initialized with properties from `inDict`.
   */
var m=["bubbles","cancelable","view","detail","screenX","screenY","clientX","clientY","ctrlKey","altKey","shiftKey","metaKey","button","relatedTarget","pageX","pageY"],n=[!1,!1,null,null,0,0,0,0,!1,!1,!1,!1,0,null,0,0],o=window.Map&&window.Map.prototype.forEach,p=o?Map:b;b.prototype={set:function(a,b){return void 0===b?this["delete"](a):(this.has(a)||this.size++,void(this.array[a]=b))},has:function(a){return void 0!==this.array[a]},"delete":function(a){this.has(a)&&(delete this.array[a],this.size--)},get:function(a){return this.array[a]},clear:function(){this.array.length=0,this.size=0},
// return value, key, map
forEach:function(a,b){return this.array.forEach(function(c,d){a.call(b,c,d,this)},this)}};var q=[
// MouseEvent
"bubbles","cancelable","view","detail","screenX","screenY","clientX","clientY","ctrlKey","altKey","shiftKey","metaKey","button","relatedTarget",
// DOM Level 3
"buttons",
// PointerEvent
"pointerId","width","height","pressure","tiltX","tiltY","pointerType","hwTimestamp","isPrimary",
// event instance
"type","target","currentTarget","which","pageX","pageY","timeStamp"],r=[
// MouseEvent
!1,!1,null,null,0,0,0,0,!1,!1,!1,!1,0,null,
// DOM Level 3
0,
// PointerEvent
0,0,0,0,0,0,"",0,!1,
// event instance
"",null,null,0,0,0,0],s={pointerover:1,pointerout:1,pointerenter:1,pointerleave:1},t="undefined"!=typeof SVGElementInstance,u={pointermap:new p,eventMap:Object.create(null),captureInfo:Object.create(null),
// Scope objects for native events.
// This exists for ease of testing.
eventSources:Object.create(null),eventSourceList:[],/**
     * Add a new event source that will generate pointer events.
     *
     * `inSource` must contain an array of event names named `events`, and
     * functions with the names specified in the `events` array.
     * @param {string} name A name for the event source
     * @param {Object} source A new source of platform events.
     */
registerSource:function(a,b){var c=b,d=c.events;d&&(d.forEach(function(a){c[a]&&(this.eventMap[a]=c[a].bind(c))},this),this.eventSources[a]=c,this.eventSourceList.push(c))},register:function(a){for(var b,c=this.eventSourceList.length,d=0;d<c&&(b=this.eventSourceList[d]);d++)
// call eventsource register
b.register.call(b,a)},unregister:function(a){for(var b,c=this.eventSourceList.length,d=0;d<c&&(b=this.eventSourceList[d]);d++)
// call eventsource register
b.unregister.call(b,a)},contains:/*scope.external.contains || */function(a,b){try{return a.contains(b)}catch(c){
// most likely: https://bugzilla.mozilla.org/show_bug.cgi?id=208427
return!1}},
// EVENTS
down:function(a){a.bubbles=!0,this.fireEvent("pointerdown",a)},move:function(a){a.bubbles=!0,this.fireEvent("pointermove",a)},up:function(a){a.bubbles=!0,this.fireEvent("pointerup",a)},enter:function(a){a.bubbles=!1,this.fireEvent("pointerenter",a)},leave:function(a){a.bubbles=!1,this.fireEvent("pointerleave",a)},over:function(a){a.bubbles=!0,this.fireEvent("pointerover",a)},out:function(a){a.bubbles=!0,this.fireEvent("pointerout",a)},cancel:function(a){a.bubbles=!0,this.fireEvent("pointercancel",a)},leaveOut:function(a){this.out(a),this.propagate(a,this.leave,!1)},enterOver:function(a){this.over(a),this.propagate(a,this.enter,!0)},
// LISTENER LOGIC
eventHandler:function(a){
// This is used to prevent multiple dispatch of pointerevents from
// platform events. This can happen when two elements in different scopes
// are set up to create pointer events, which is relevant to Shadow DOM.
if(!a._handledByPE){var b=a.type,c=this.eventMap&&this.eventMap[b];c&&c(a),a._handledByPE=!0}},
// set up event listeners
listen:function(a,b){b.forEach(function(b){this.addEvent(a,b)},this)},
// remove event listeners
unlisten:function(a,b){b.forEach(function(b){this.removeEvent(a,b)},this)},addEvent:/*scope.external.addEvent || */function(a,b){a.addEventListener(b,this.boundHandler)},removeEvent:/*scope.external.removeEvent || */function(a,b){a.removeEventListener(b,this.boundHandler)},
// EVENT CREATION AND TRACKING
/**
     * Creates a new Event of type `inType`, based on the information in
     * `inEvent`.
     *
     * @param {string} inType A string representing the type of event to create
     * @param {Event} inEvent A platform event with a target
     * @return {Event} A PointerEvent of type `inType`
     */
makeEvent:function(b,c){
// relatedTarget must be null if pointer is captured
this.captureInfo[c.pointerId]&&(c.relatedTarget=null);var d=new a(b,c);return c.preventDefault&&(d.preventDefault=c.preventDefault),d._target=d._target||c.target,d},
// make and dispatch an event in one call
fireEvent:function(a,b){var c=this.makeEvent(a,b);return this.dispatchEvent(c)},/**
     * Returns a snapshot of inEvent, with writable properties.
     *
     * @param {Event} inEvent An event that contains properties to copy.
     * @return {Object} An object containing shallow copies of `inEvent`'s
     *    properties.
     */
cloneEvent:function(a){for(var b,c=Object.create(null),d=0;d<q.length;d++)b=q[d],c[b]=a[b]||r[d],
// Work around SVGInstanceElement shadow tree
// Return the <use> element that is represented by the instance for Safari, Chrome, IE.
// This is the behavior implemented by Firefox.
!t||"target"!==b&&"relatedTarget"!==b||c[b]instanceof SVGElementInstance&&(c[b]=c[b].correspondingUseElement);
// keep the semantics of preventDefault
return a.preventDefault&&(c.preventDefault=function(){a.preventDefault()}),c},getTarget:function(a){var b=this.captureInfo[a.pointerId];return b?a._target!==b&&a.type in s?void 0:b:a._target},propagate:function(a,b,c){
// Order of conditions due to document.contains() missing in IE.
for(var d=a.target,e=[];d!==document&&!d.contains(a.relatedTarget);)
// Touch: Do not propagate if node is detached.
if(e.push(d),d=d.parentNode,!d)return;c&&e.reverse(),e.forEach(function(c){a.target=c,b.call(this,a)},this)},setCapture:function(b,c,d){this.captureInfo[b]&&this.releaseCapture(b,d),this.captureInfo[b]=c,this.implicitRelease=this.releaseCapture.bind(this,b,d),document.addEventListener("pointerup",this.implicitRelease),document.addEventListener("pointercancel",this.implicitRelease);var e=new a("gotpointercapture");e.pointerId=b,e._target=c,d||this.asyncDispatchEvent(e)},releaseCapture:function(b,c){var d=this.captureInfo[b];if(d){this.captureInfo[b]=void 0,document.removeEventListener("pointerup",this.implicitRelease),document.removeEventListener("pointercancel",this.implicitRelease);var e=new a("lostpointercapture");e.pointerId=b,e._target=d,c||this.asyncDispatchEvent(e)}},/**
     * Dispatches the event to its target.
     *
     * @param {Event} inEvent The event to be dispatched.
     * @return {Boolean} True if an event handler returns true, false otherwise.
     */
dispatchEvent:/*scope.external.dispatchEvent || */function(a){var b=this.getTarget(a);if(b)return b.dispatchEvent(a)},asyncDispatchEvent:function(a){requestAnimationFrame(this.dispatchEvent.bind(this,a))}};u.boundHandler=u.eventHandler.bind(u);var v={shadow:function(a){if(a)return a.shadowRoot||a.webkitShadowRoot},canTarget:function(a){return a&&Boolean(a.elementFromPoint)},targetingShadow:function(a){var b=this.shadow(a);if(this.canTarget(b))return b},olderShadow:function(a){var b=a.olderShadowRoot;if(!b){var c=a.querySelector("shadow");c&&(b=c.olderShadowRoot)}return b},allShadows:function(a){for(var b=[],c=this.shadow(a);c;)b.push(c),c=this.olderShadow(c);return b},searchRoot:function(a,b,c){if(a){var d,e,f=a.elementFromPoint(b,c);for(
// is element a shadow host?
e=this.targetingShadow(f);e;){if(
// find the the element inside the shadow root
d=e.elementFromPoint(b,c)){
// shadowed element may contain a shadow root
var g=this.targetingShadow(d);return this.searchRoot(g,b,c)||d}
// check for older shadows
e=this.olderShadow(e)}
// light dom element is the target
return f}},owner:function(a){
// walk up until you hit the shadow root or document
for(var b=a;b.parentNode;)b=b.parentNode;
// the owner element is expected to be a Document or ShadowRoot
return b.nodeType!==Node.DOCUMENT_NODE&&b.nodeType!==Node.DOCUMENT_FRAGMENT_NODE&&(b=document),b},findTarget:function(a){var b=a.clientX,c=a.clientY,d=this.owner(a.target);
// if x, y is not in this root, fall back to document search
return d.elementFromPoint(b,c)||(d=document),this.searchRoot(d,b,c)}},w=Array.prototype.forEach.call.bind(Array.prototype.forEach),x=Array.prototype.map.call.bind(Array.prototype.map),y=Array.prototype.slice.call.bind(Array.prototype.slice),z=Array.prototype.filter.call.bind(Array.prototype.filter),A=window.MutationObserver||window.WebKitMutationObserver,B="[touch-action]",C={subtree:!0,childList:!0,attributes:!0,attributeOldValue:!0,attributeFilter:["touch-action"]};c.prototype={watchSubtree:function(a){
// Only watch scopes that can target find, as these are top-level.
// Otherwise we can see duplicate additions and removals that add noise.
//
// TODO(dfreedman): For some instances with ShadowDOMPolyfill, we can see
// a removal without an insertion when a node is redistributed among
// shadows. Since it all ends up correct in the document, watching only
// the document will yield the correct mutations to watch.
this.observer&&v.canTarget(a)&&this.observer.observe(a,C)},enableOnSubtree:function(a){this.watchSubtree(a),a===document&&"complete"!==document.readyState?this.installOnLoad():this.installNewSubtree(a)},installNewSubtree:function(a){w(this.findElements(a),this.addElement,this)},findElements:function(a){return a.querySelectorAll?a.querySelectorAll(B):[]},removeElement:function(a){this.removeCallback(a)},addElement:function(a){this.addCallback(a)},elementChanged:function(a,b){this.changedCallback(a,b)},concatLists:function(a,b){return a.concat(y(b))},
// register all touch-action = none nodes on document load
installOnLoad:function(){document.addEventListener("readystatechange",function(){"complete"===document.readyState&&this.installNewSubtree(document)}.bind(this))},isElement:function(a){return a.nodeType===Node.ELEMENT_NODE},flattenMutationTree:function(a){
// find children with touch-action
var b=x(a,this.findElements,this);
// flatten the list
// make sure the added nodes are accounted for
return b.push(z(a,this.isElement)),b.reduce(this.concatLists,[])},mutationWatcher:function(a){a.forEach(this.mutationHandler,this)},mutationHandler:function(a){if("childList"===a.type){var b=this.flattenMutationTree(a.addedNodes);b.forEach(this.addElement,this);var c=this.flattenMutationTree(a.removedNodes);c.forEach(this.removeElement,this)}else"attributes"===a.type&&this.elementChanged(a.target,a.oldValue)}};var D=["none","auto","pan-x","pan-y",{rule:"pan-x pan-y",selectors:["pan-x pan-y","pan-y pan-x"]}],E="",F=window.PointerEvent||window.MSPointerEvent,G=!window.ShadowDOMPolyfill&&document.head.createShadowRoot,H=u.pointermap,I=25,J=[1,4,2,8,16],K=!1;try{K=1===new MouseEvent("test",{buttons:1}).buttons}catch(L){}
// handler block for native mouse events
var M,N={POINTER_ID:1,POINTER_TYPE:"mouse",events:["mousedown","mousemove","mouseup","mouseover","mouseout"],register:function(a){u.listen(a,this.events)},unregister:function(a){u.unlisten(a,this.events)},lastTouches:[],
// collide with the global mouse listener
isEventSimulatedFromTouch:function(a){for(var b,c=this.lastTouches,d=a.clientX,e=a.clientY,f=0,g=c.length;f<g&&(b=c[f]);f++){
// simulated mouse events will be swallowed near a primary touchend
var h=Math.abs(d-b.x),i=Math.abs(e-b.y);if(h<=I&&i<=I)return!0}},prepareEvent:function(a){var b=u.cloneEvent(a),c=b.preventDefault;return b.preventDefault=function(){a.preventDefault(),c()},b.pointerId=this.POINTER_ID,b.isPrimary=!0,b.pointerType=this.POINTER_TYPE,b},prepareButtonsForMove:function(a,b){var c=H.get(this.POINTER_ID);
// Update buttons state after possible out-of-document mouseup.
0!==b.which&&c?a.buttons=c.buttons:a.buttons=0,b.buttons=a.buttons},mousedown:function(a){if(!this.isEventSimulatedFromTouch(a)){var b=H.get(this.POINTER_ID),c=this.prepareEvent(a);K||(c.buttons=J[c.button],b&&(c.buttons|=b.buttons),a.buttons=c.buttons),H.set(this.POINTER_ID,a),b&&0!==b.buttons?u.move(c):u.down(c)}},mousemove:function(a){if(!this.isEventSimulatedFromTouch(a)){var b=this.prepareEvent(a);K||this.prepareButtonsForMove(b,a),b.button=-1,H.set(this.POINTER_ID,a),u.move(b)}},mouseup:function(a){if(!this.isEventSimulatedFromTouch(a)){var b=H.get(this.POINTER_ID),c=this.prepareEvent(a);if(!K){var d=J[c.button];
// Produces wrong state of buttons in Browsers without `buttons` support
// when a mouse button that was pressed outside the document is released
// inside and other buttons are still pressed down.
c.buttons=b?b.buttons&~d:0,a.buttons=c.buttons}H.set(this.POINTER_ID,a),
// Support: Firefox <=44 only
// FF Ubuntu includes the lifted button in the `buttons` property on
// mouseup.
// https://bugzilla.mozilla.org/show_bug.cgi?id=1223366
c.buttons&=~J[c.button],0===c.buttons?u.up(c):u.move(c)}},mouseover:function(a){if(!this.isEventSimulatedFromTouch(a)){var b=this.prepareEvent(a);K||this.prepareButtonsForMove(b,a),b.button=-1,H.set(this.POINTER_ID,a),u.enterOver(b)}},mouseout:function(a){if(!this.isEventSimulatedFromTouch(a)){var b=this.prepareEvent(a);K||this.prepareButtonsForMove(b,a),b.button=-1,u.leaveOut(b)}},cancel:function(a){var b=this.prepareEvent(a);u.cancel(b),this.deactivateMouse()},deactivateMouse:function(){H["delete"](this.POINTER_ID)}},O=u.captureInfo,P=v.findTarget.bind(v),Q=v.allShadows.bind(v),R=u.pointermap,S=2500,T=200,U="touch-action",V={events:["touchstart","touchmove","touchend","touchcancel"],register:function(a){M.enableOnSubtree(a)},unregister:function(){},elementAdded:function(a){var b=a.getAttribute(U),c=this.touchActionToScrollType(b);c&&(a._scrollType=c,u.listen(a,this.events),
// set touch-action on shadows as well
Q(a).forEach(function(a){a._scrollType=c,u.listen(a,this.events)},this))},elementRemoved:function(a){a._scrollType=void 0,u.unlisten(a,this.events),
// remove touch-action from shadow
Q(a).forEach(function(a){a._scrollType=void 0,u.unlisten(a,this.events)},this)},elementChanged:function(a,b){var c=a.getAttribute(U),d=this.touchActionToScrollType(c),e=this.touchActionToScrollType(b);
// simply update scrollType if listeners are already established
d&&e?(a._scrollType=d,Q(a).forEach(function(a){a._scrollType=d},this)):e?this.elementRemoved(a):d&&this.elementAdded(a)},scrollTypes:{EMITTER:"none",XSCROLLER:"pan-x",YSCROLLER:"pan-y",SCROLLER:/^(?:pan-x pan-y)|(?:pan-y pan-x)|auto$/},touchActionToScrollType:function(a){var b=a,c=this.scrollTypes;return"none"===b?"none":b===c.XSCROLLER?"X":b===c.YSCROLLER?"Y":c.SCROLLER.exec(b)?"XY":void 0},POINTER_TYPE:"touch",firstTouch:null,isPrimaryTouch:function(a){return this.firstTouch===a.identifier},setPrimaryTouch:function(a){
// set primary touch if there no pointers, or the only pointer is the mouse
(0===R.size||1===R.size&&R.has(1))&&(this.firstTouch=a.identifier,this.firstXY={X:a.clientX,Y:a.clientY},this.scrolling=!1,this.cancelResetClickCount())},removePrimaryPointer:function(a){a.isPrimary&&(this.firstTouch=null,this.firstXY=null,this.resetClickCount())},clickCount:0,resetId:null,resetClickCount:function(){var a=function(){this.clickCount=0,this.resetId=null}.bind(this);this.resetId=setTimeout(a,T)},cancelResetClickCount:function(){this.resetId&&clearTimeout(this.resetId)},typeToButtons:function(a){var b=0;return"touchstart"!==a&&"touchmove"!==a||(b=1),b},touchToPointer:function(a){var b=this.currentTouchEvent,c=u.cloneEvent(a),d=c.pointerId=a.identifier+2;c.target=O[d]||P(c),c.bubbles=!0,c.cancelable=!0,c.detail=this.clickCount,c.button=0,c.buttons=this.typeToButtons(b.type),c.width=2*(a.radiusX||a.webkitRadiusX||0),c.height=2*(a.radiusY||a.webkitRadiusY||0),c.pressure=a.force||a.webkitForce||.5,c.isPrimary=this.isPrimaryTouch(a),c.pointerType=this.POINTER_TYPE,
// forward modifier keys
c.altKey=b.altKey,c.ctrlKey=b.ctrlKey,c.metaKey=b.metaKey,c.shiftKey=b.shiftKey;
// forward touch preventDefaults
var e=this;return c.preventDefault=function(){e.scrolling=!1,e.firstXY=null,b.preventDefault()},c},processTouches:function(a,b){var c=a.changedTouches;this.currentTouchEvent=a;for(var d,e=0;e<c.length;e++)d=c[e],b.call(this,this.touchToPointer(d))},
// For single axis scrollers, determines whether the element should emit
// pointer events or behave as a scroller
shouldScroll:function(a){if(this.firstXY){var b,c=a.currentTarget._scrollType;if("none"===c)
// this element is a touch-action: none, should never scroll
b=!1;else if("XY"===c)
// this element should always scroll
b=!0;else{var d=a.changedTouches[0],e=c,f="Y"===c?"X":"Y",g=Math.abs(d["client"+e]-this.firstXY[e]),h=Math.abs(d["client"+f]-this.firstXY[f]);
// if delta in the scroll axis > delta other axis, scroll instead of
// making events
b=g>=h}return this.firstXY=null,b}},findTouch:function(a,b){for(var c,d=0,e=a.length;d<e&&(c=a[d]);d++)if(c.identifier===b)return!0},
// In some instances, a touchstart can happen without a touchend. This
// leaves the pointermap in a broken state.
// Therefore, on every touchstart, we remove the touches that did not fire a
// touchend event.
// To keep state globally consistent, we fire a
// pointercancel for this "abandoned" touch
vacuumTouches:function(a){var b=a.touches;
// pointermap.size should be < tl.length here, as the touchstart has not
// been processed yet.
if(R.size>=b.length){var c=[];R.forEach(function(a,d){
// Never remove pointerId == 1, which is mouse.
// Touch identifiers are 2 smaller than their pointerId, which is the
// index in pointermap.
if(1!==d&&!this.findTouch(b,d-2)){var e=a.out;c.push(e)}},this),c.forEach(this.cancelOut,this)}},touchstart:function(a){this.vacuumTouches(a),this.setPrimaryTouch(a.changedTouches[0]),this.dedupSynthMouse(a),this.scrolling||(this.clickCount++,this.processTouches(a,this.overDown))},overDown:function(a){R.set(a.pointerId,{target:a.target,out:a,outTarget:a.target}),u.enterOver(a),u.down(a)},touchmove:function(a){this.scrolling||(this.shouldScroll(a)?(this.scrolling=!0,this.touchcancel(a)):(a.preventDefault(),this.processTouches(a,this.moveOverOut)))},moveOverOut:function(a){var b=a,c=R.get(b.pointerId);
// a finger drifted off the screen, ignore it
if(c){var d=c.out,e=c.outTarget;u.move(b),d&&e!==b.target&&(d.relatedTarget=b.target,b.relatedTarget=e,
// recover from retargeting by shadow
d.target=e,b.target?(u.leaveOut(d),u.enterOver(b)):(
// clean up case when finger leaves the screen
b.target=e,b.relatedTarget=null,this.cancelOut(b))),c.out=b,c.outTarget=b.target}},touchend:function(a){this.dedupSynthMouse(a),this.processTouches(a,this.upOut)},upOut:function(a){this.scrolling||(u.up(a),u.leaveOut(a)),this.cleanUpPointer(a)},touchcancel:function(a){this.processTouches(a,this.cancelOut)},cancelOut:function(a){u.cancel(a),u.leaveOut(a),this.cleanUpPointer(a)},cleanUpPointer:function(a){R["delete"](a.pointerId),this.removePrimaryPointer(a)},
// prevent synth mouse events from creating pointer events
dedupSynthMouse:function(a){var b=N.lastTouches,c=a.changedTouches[0];
// only the primary finger will synth mouse events
if(this.isPrimaryTouch(c)){
// remember x/y of last touch
var d={x:c.clientX,y:c.clientY};b.push(d);var e=function(a,b){var c=a.indexOf(b);c>-1&&a.splice(c,1)}.bind(null,b,d);setTimeout(e,S)}}};M=new c(V.elementAdded,V.elementRemoved,V.elementChanged,V);var W,X,Y,Z=u.pointermap,$=window.MSPointerEvent&&"number"==typeof window.MSPointerEvent.MSPOINTER_TYPE_MOUSE,_={events:["MSPointerDown","MSPointerMove","MSPointerUp","MSPointerOut","MSPointerOver","MSPointerCancel","MSGotPointerCapture","MSLostPointerCapture"],register:function(a){u.listen(a,this.events)},unregister:function(a){u.unlisten(a,this.events)},POINTER_TYPES:["","unavailable","touch","pen","mouse"],prepareEvent:function(a){var b=a;return $&&(b=u.cloneEvent(a),b.pointerType=this.POINTER_TYPES[a.pointerType]),b},cleanup:function(a){Z["delete"](a)},MSPointerDown:function(a){Z.set(a.pointerId,a);var b=this.prepareEvent(a);u.down(b)},MSPointerMove:function(a){var b=this.prepareEvent(a);u.move(b)},MSPointerUp:function(a){var b=this.prepareEvent(a);u.up(b),this.cleanup(a.pointerId)},MSPointerOut:function(a){var b=this.prepareEvent(a);u.leaveOut(b)},MSPointerOver:function(a){var b=this.prepareEvent(a);u.enterOver(b)},MSPointerCancel:function(a){var b=this.prepareEvent(a);u.cancel(b),this.cleanup(a.pointerId)},MSLostPointerCapture:function(a){var b=u.makeEvent("lostpointercapture",a);u.dispatchEvent(b)},MSGotPointerCapture:function(a){var b=u.makeEvent("gotpointercapture",a);u.dispatchEvent(b)}},aa=window.navigator;aa.msPointerEnabled?(W=function(a){i(a),j(this),k(a)&&(u.setCapture(a,this,!0),this.msSetPointerCapture(a))},X=function(a){i(a),u.releaseCapture(a,!0),this.msReleasePointerCapture(a)}):(W=function(a){i(a),j(this),k(a)&&u.setCapture(a,this)},X=function(a){i(a),u.releaseCapture(a)}),Y=function(a){return!!u.captureInfo[a]},g(),h(),l();var ba={dispatcher:u,Installer:c,PointerEvent:a,PointerMap:p,targetFinding:v};return ba});
  
  scripts['highlight']({});
scripts['lowlight']({});
scripts['pawnMoves']({});
scripts['bishopMoves']({});
scripts['kingMoves']({});
scripts['moves']({});
scripts['towerMoves']({});
scripts['horseMoves']({});
scripts['queenMoves']({});
scripts['validateMove']({});
scripts['isInCheck']({});

  
})();
