'use strict'

/**
 * @module @yoda/audio
 * @description The `audio` module exports `AudioManager`, which provides APIs to
 * to control volume of audio.
 *
 * ```js
 * var AudioManager = require('@yoda/audio').AudioManager;
 * AudioManager.setVolume(AudioManager.STREAM_TTS, 30); // this sets the tts vol to 30.
 * AudioManager.getVolume(AudioManager.STREAM_AUDIO); // get the audio tts.
 * ```
 */

var native = require('./audio.node')
var property = require('@yoda/property')

/**
 * This define the streams config
 */
var AudioBase = {
  /**
   * default volume
   */
  DEFAULT_VOLUME: _getNumber('audio.volume.default', 60)
}

function _getNumber (key, defaults) {
  var num = parseInt(property.get(key, 'persist'))
  return isNaN(num) ? defaults : num
}

function _storeVolume (stream, vol) {
  vol = Math.floor(vol)
  property.set(stream.key, vol, 'persist')
  native.setStreamVolume(stream.id, vol)
}

function _getVolume (stream) {
  var vol = parseInt(property.get(stream.key, 'persist'))
  if (isNaN(vol)) {
    return false
  } else {
    return vol
  }
}

function _getPlayingStatus (stream) {
  return native.getStreamPlayingStatus(stream.id)
}

function defineStream (id, name, options) {
  options = options || {}
  var stream = AudioBase[id] = {
    id: id,
    name: name,
    readonly: options.readonly || undefined,
    get key () {
      return `audio.volume.${this.name}`
    }
  }

  if (_getVolume(stream) === false) {
    _storeVolume(stream, AudioBase.DEFAULT_VOLUME)
  }
}

/**
 * @class
 */
function AudioManager () {
  throw new TypeError('should not call this function')
}
exports.AudioManager = AudioManager

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_AUDIO - Used to identify the volume of audio streams for audio.
 */
AudioManager.STREAM_AUDIO = native.STREAM_AUDIO

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_TTS  - Used to identify the volume of audio streams for tts.
 */
AudioManager.STREAM_TTS = native.STREAM_TTS

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_RING  - Used to identify the volume of audio streams for ring.
 */
AudioManager.STREAM_RING = native.STREAM_RING

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_RING  - Used to identify the volume of audio streams for voice call.
 */
AudioManager.STREAM_VOICE_CALL = native.STREAM_VOICE_CALL

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_PLAYBACK  - Used to identify the volume of audio streams for
 * multimedia.
 */
AudioManager.STREAM_PLAYBACK = native.STREAM_PLAYBACK

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_ALARM - Used to identify the volume of audio streams for alarm.
 */
AudioManager.STREAM_ALARM = native.STREAM_ALARM

/**
 * @memberof module:@yoda/audio~AudioManager
 * @member {Number} STREAM_SYSTEM - Used to identify the volume of audio streams for system.
 */
AudioManager.STREAM_SYSTEM = native.STREAM_SYSTEM

/**
 * @typedef Shaper
 */

/**
 * The linear curve function for `setVolumeShaper`.
 * @memberof module:@yoda/audio~AudioManager
 * @member {module:@yoda/audio~Shaper} LINEAR_RAMP
 */
AudioManager.LINEAR_RAMP = function (len) {
  var shape = []
  for (var i = 0; i <= len; i++) {
    shape[i] = i
  }
  return shape
}

/**
 * Set the volume of the given stream.
 * @memberof module:@yoda/audio~AudioManager
 * @method setVolume
 * @param {Number} [stream=AudioManager.STREAM_TTS] - The stream type.
 * @param {Number} vol - The volume to set
 * @throws {TypeError} vol must be a number
 * @throws {TypeError} invalid stream type
 * @throws {Error} stream type readonly
 */
AudioManager.setVolume = function (type, vol) {
  if (arguments.length === 1) {
    vol = type
    type = null
  }
  if (type && !AudioBase[type]) {
    throw new TypeError('invalid stream type')
  }
  if (typeof vol !== 'number') {
    throw new TypeError('vol must be a number')
  }
  if (vol > 100) {
    vol = 100
  } else if (vol < 0) {
    vol = 0
  }

  if (type === null) {
    AudioManager.setVolume(AudioManager.STREAM_AUDIO, vol)
    AudioManager.setVolume(AudioManager.STREAM_PLAYBACK, vol)
    AudioManager.setVolume(AudioManager.STREAM_TTS, vol)
    AudioManager.setVolume(AudioManager.STREAM_RING, vol)
    return
  }

  var stream = AudioBase[type]
  if (stream.readonly) {
    throw new Error(`stream type "${stream.name}" is readonly`)
  }
  return _storeVolume(stream, vol)
}

/**
 * Get the volume of the given stream.
 * @memberof module:@yoda/audio~AudioManager
 * @method getVolume
 * @param {Number} [stream=AudioManager.STREAM_AUDIO] - The stream type.
 * @throws {TypeError} invalid stream type
 */
AudioManager.getVolume = function (stream) {
  if (stream !== undefined) {
    if (!AudioBase[stream]) {
      throw new TypeError('invalid stream type')
    }
    return _getVolume(AudioBase[stream])
  } else {
    return _getVolume(AudioBase[native.STREAM_TTS])
  }
}

/**
 * Get if the volume is muted.
 * @memberof module:@yoda/audio~AudioManager
 * @method isMuted
 * @returns {Boolean} if muted.
 */
AudioManager.isMuted = function () {
  return native.isMuted()
}

/**
 * Set the volume to be mute or not.
 * @memberof module:@yoda/audio~AudioManager
 * @method setMute
 * @param {Boolean} val - If muted.
 */
AudioManager.setMute = function (val) {
  return native.setMute(!!val)
}

/**
 * Set the shaper of the volume.
 * @memberof module:@yoda/audio~AudioManager
 * @method setVolumeShaper
 * @param {module:@yoda/audio~Shaper} shaper - The volume shaper function which returns an array with 100 elements.
 * @throws {Error} shaper function should return an array with 100 elements.
 * @throws {RangeError} out of range when set volume shape.
 * @example
 * AudioManager.setVolumeShaper(AudioManager.LINEAR_RAMP)
 */
AudioManager.setVolumeShaper = function setVolumeShaper (shaper) {
  var max = 100
  var shape = shaper(max)
  if (!Array.isArray(shape)) { throw new Error('shaper function should return an array with 100 elements.') }

  for (var i = 0; i <= max; i++) {
    if (!native.setCurveForVolume(i, shape[i])) {
      throw new RangeError('out of range when set volume shape.')
    }
  }
  return true
}

/**
 * Get the playing status of the given stream.
 * @memberof module:@yoda/audio~AudioManager
 * @method getPlayingStatus
 * @param {Number} [stream=AudioManager.STREAM_AUDIO] - The stream type.
 * @throws {TypeError} invalid stream type
 * @returns {Boolean} true: stream is connected and playing, false: stream is unconnected.
 */
AudioManager.getPlayingStatus = function (stream) {
  if (stream !== undefined) {
    if (!AudioBase[stream]) {
      throw new TypeError('invalid stream type')
    }
    return _getPlayingStatus(AudioBase[stream])
  } else {
    return _getPlayingStatus(AudioBase[native.STREAM_TTS])
  }
}

/**
 * Get the human readable string for the stream type
 * @method getStreamName
 * @returns {string} return the stream type name, "audio", "tts", "playback", "alarm" and "system".
 */
AudioManager.getStreamName = function getStreamName (type) {
  return AudioBase[type] && AudioBase[type].name
}

;(function init () {
  defineStream(native.STREAM_AUDIO, 'audio')
  defineStream(native.STREAM_TTS, 'tts')
  defineStream(native.STREAM_RING, 'ring')
  defineStream(native.STREAM_VOICE_CALL, 'voiceCall')
  defineStream(native.STREAM_PLAYBACK, 'playback')
  defineStream(native.STREAM_ALARM, 'alarm')
  defineStream(native.STREAM_SYSTEM, 'system', {
    readonly: true
  })
})()
