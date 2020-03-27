const EventUtils = require('util-events')
const ConsoleLogger = require('util-console-logger');
cc.Class({
  name: 'Gif',
  extends: cc.Component,
  properties: {
    atlas: {
      type: cc.SpriteAtlas,
      default: null
    },
    frames: {
      type: [cc.SpriteFrame],
      default: () => []
    },
    srcBlendFactor: {
      type: cc.macro ? cc.macro.BlendFactor : cc.BlendFunc.BlendFactor,
      default: cc.macro.BlendFactor ? cc.macro.BlendFactor.SRC_ALPHA : cc.BlendFunc.BlendFactor.SRC_ALPHA,
    },
    dstBlendFactor: {
      type: cc.macro ? cc.macro.BlendFactor : cc.BlendFunc.BlendFactor,
      default: cc.macro.BlendFactor ? cc.macro.BlendFactor.ONE_MINUS_SRC_ALPHA : cc.BlendFunc.BlendFactor.ONE_MINUS_SRC_ALPHA,
    },
    wrapMode: {
      type: cc.WrapMode,
      default: cc.WrapMode.Loop
    },
    playOnLoad: true,
    onAnimateFinished: {
      type: cc.Component.EventHandler,
      default: null
    },
    prefix: '',
    suffix: '',
    from: -1,
    to: -1,
    frameSequence: '',
    sample: 10,
    repeatCount: -1
  },
  onLoad () {
    this.logger = new ConsoleLogger(this.name);
    this.init();
  },
  init () {
    const noFrames = !this.frames || !this.frames.length;
    const noAtlas = !this.atlas;
    if (noFrames && noAtlas) {
      this.logger.warn(`one of frames and atlas is required!`);
      return;
    }
    if (this.atlas) {
      this.logger.log(`using atlas`);
      this._frames = this.atlas.getSpriteFrames();
      if (!this._frames.length) {
        this.logger.log(`with frames`);
        this._frames = this.frames;
      }
      this._createAtlas();
    } else {
      this.logger.log(`using frames`);
      this._frames = this.frames;
    }

    let sprite = this.getComponent(cc.Sprite)
    if (!sprite) sprite = this.addComponent(cc.Sprite);
    sprite.srcBlendFactor = this.srcBlendFactor;
    sprite.dstBlendFactor = this.dstBlendFactor;
    const anim = this.animation = this.addComponent(cc.Animation);
    const clip = this.clip = cc.AnimationClip.createWithSpriteFrames(this._getFrames(), this.sample);

    // animation clip name must be set before add to animation
    clip.name = 'comp-spriteframe-anim'
    anim.addClip(clip);
    if (this.playOnLoad) {
      this.play(this.repeatCount, this.wrapMode);
    }
  },
  showFrameAt (index) {
    const frame = (this.frames || this._frames)[this.frameIndex = index];
    if (!frame) return false;
    const sprite = this.node.getComponent(cc.Sprite)
    sprite.spriteFrame = frame;
    return frame;
  },
  showFrame (name) {
    const frame = (this.frames || this._frames).find(f => f._name === name);
    if (!frame) return false;
    this.frameName = name;
    const sprite = this.node.getComponent(cc.Sprite)
    sprite.spriteFrame = frame;
    return frame;
  },
  play (repeatCount = Infinity, wrapMode = cc.WrapMode.Loop, callback = null) {
    const state = this.animation.play(this.clip.name);
    state.wrapMode = wrapMode;
    state.repeatCount = this.repeatCount < 0 ? Infinity : repeatCount;
    this.animation.once('finished', callback || this._onAnimateFinished, this);
  },
  playp (repeatCount = 1) {
    return new Promise((resolve) => {
      this.play(repeatCount, cc.WrapMode.Normal, _ => {
        resolve();
      });
    })
  },
  _onAnimateFinished (e) {
    if (this.onAnimateFinished) {
      EventUtils.callHandler(this.onAnimateFinished, [e, this.animation, this]);
    }
  },
  _createAtlas () {
    this.atlas = new cc.SpriteAtlas();
    this._frames.forEach(f => this.atlas._spriteFrames[f._name] = f);
  },
  _getFrames () {
    if (this.frames && this.frames.length) return this.frames;
    // frame sequence has higher priority thant from+to
    if (this.frameSequence) {
      let indices = this.frameSequence.split(',');
      return indices.map(i => this.atlas.getSpriteFrame(`${this.prefix}${i}${this.suffix}`));
    }

    if (this.from < 0 || this.to < 0) {
      return this._frames;
    }
    const frames = [];
    for(let i = this.from; i <= this.to; ++i) {
      let frame = this.atlas.getSpriteFrame(`${this.prefix}${i}${this.suffix}`);
      if (frame) frames.push(frame);
    }
    return frames;
  }
});
