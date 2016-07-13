var game = new Phaser.Game(360, 640, Phaser.AUTO, '',
  { preload: preload, create: create, update: update, render: render });

function preload()
{
    // Scaling
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;

    // Assets Loading
    game.load.image('ball', 'assets/ball.png');
    game.load.image('platform', 'assets/platform.png');
    game.load.image('teaser', 'assets/teaser.png');
    game.load.image('border_top', 'assets/border_top.png');
    game.load.image('border_bottom', 'assets/border_bottom.png');
    game.load.image('particle', 'assets/particle.png');
    game.load.image('yellow_particle', 'assets/yellow_particle.png');
    game.load.image('flyer', 'assets/flyer.png');
    game.load.image('bonus', 'assets/bonus.png');
    game.load.image('tutorial_take', 'assets/tutorial_take.png');
    game.load.image('tutorial_avoid', 'assets/tutorial_avoid.png');
    game.load.image('tutorial_keys', 'assets/tutorial_keys.png');
    game.load.image('tutorial_bounce', 'assets/tutorial_bounce.png');
    game.load.image('button_left', 'assets/button_left.png');
    game.load.image('button_right', 'assets/button_right.png');
    game.load.image('button_down', 'assets/button_down.png');
    game.load.image('button_up', 'assets/button_up.png');

    game.load.bitmapFont('font', 'assets/font.png', 'assets/font.fnt');

    game.load.audio('bounce_1', 'sounds/bounce_1.wav');
    game.load.audio('bounce_2', 'sounds/bounce_2.wav');
    game.load.audio('bounce_3', 'sounds/bounce_3.wav');
    game.load.audio('bounce_4', 'sounds/bounce_4.wav');
    game.load.audio('explosion', 'sounds/explosion.wav');
    game.load.audio('lightning', 'sounds/lightning.wav');
}

// Constants
var BALL_SPEED = 128;
var BALL_ROTATION = 0.5;
var BALL_JUMP = 256;
var BALL_BOUNCE = 0.8;
var PLATFORM_SPEED = 32;
var GRAVITY = 512;
var EMITTER_TIMEOUT = 2000;
var SPIKE_CHANCE = 0.5;
var TEASER_CHANCE = 0.2;
var BONUS_CHANCE = 0.1;
var LIGHTNING_VERTICAL_RANGE = 4;
var PLATFORM_DISTANCE = 200;
var MAX_MULTIPLIER = 10;
var FLYER_SPEED = 64;
var FLYER_MIN_TIME = 5;
var FLYER_MAX_TIME = 15;

// Globals
var ball;
var borders;
var platforms;
var lastPlatform;     // Used to spawn next platform
var touchedPlatform;  // Used to check which is the last platform that has been touched
var teasers;
var spikes;
var flyers;
var bonuses;
var cursors;
var speedMultiplier = 1;
var level = 0;
var goal;  // 16 - 32 - 64 - 128 ecc..

// UI
var levelText, gameOverText, goalText, titleText;

// Touch Screen
var buttonLeft, buttonRight, buttonUp, buttonDown;

// Sounds
var soundBounce1, soundBounce2, soundBounce3, soundBounce4;
var soundExplosion;
var soundLightning;
var soundBounceIndex = 0;

var gameState = 'state_start'; // splash, start, game, over

function create()
{
    game.physics.startSystem(Phaser.Physics.ARCADE);

    // Background
    game.stage.backgroundColor = '#333333';

    // Make the world a bit bigger than the stage so we can shake the camera
    game.camera.bounds = null;

    // Level Text
    levelText = game.add.bitmapText(game.world.width/2, game.world.height + 64, 'font', '0', 64);
    levelText.anchor.setTo(0.5, 0.5);

    // Game Over Text
    gameOverText = game.add.bitmapText(game.world.width/2, game.world.height + 64, 'font', 'GAME OVER', 48);
    gameOverText.anchor.setTo(0.5, 0.5);

    // Next Goal Text
    goalText = game.add.bitmapText(game.world.width/2, game.world.height + 64, 'font', 'NEXT GOAL ', 32);
    goalText.anchor.setTo(0.5, 0.5);

    // Title Text
    titleText = game.add.bitmapText(game.world.width/2, game.world.height + 64, 'font', 'HARDBOUNCE', 48);
    titleText.anchor.setTo(0.5, 0.5);

    // Borders
    borders = game.add.group();
    var border = borders.create(game.world.width/2, 0, 'border_top');
    game.physics.enable(border, Phaser.Physics.ARCADE);
    border = borders.create(game.world.width/2, game.world.height, 'border_bottom');
    game.physics.enable(border, Phaser.Physics.ARCADE);
    borders.setAll('anchor', new Phaser.Point(0.5, 0.5));

    // Spikes
    spikes = game.add.group();
    spikes.createMultiple(16, 'teaser');

    // Teaser
    teasers = game.add.group();
    teasers.createMultiple(8);

    // Bonuses
    bonuses = game.add.group();
    bonuses.createMultiple(8, 'bonus');

    // Platforms
    platforms = game.add.group();
    platforms.createMultiple(8, 'platform');

    // Flyers
    flyers = game.add.group();
    flyers.createMultiple(8);

    // Local Storage
    if(typeof(Storage) !== "undefined")
    {
      // Next Goal
      if (localStorage.goal === undefined)
        localStorage.setItem('goal', 16);

      goal = localStorage.goal;

      // Tutorial
      if (localStorage.tutorial_keys === undefined)
        localStorage.setItem('tutorial_keys', 'true');
      if (localStorage.tutorial_bounce === undefined)
        localStorage.setItem('tutorial_bounce', 'true');
      if (localStorage.tutorial_spike === undefined)
        localStorage.setItem('tutorial_spike', 'true');
      if (localStorage.tutorial_flyer === undefined)
        localStorage.setItem('tutorial_flyer', 'true');
      if (localStorage.tutorial_bonus === undefined)
        localStorage.setItem('tutorial_bonus', 'true');
    }

    // Sounds
    soundBounce1 = game.add.audio('bounce_1');
    soundBounce2 = game.add.audio('bounce_2');
    soundBounce3 = game.add.audio('bounce_3');
    soundBounce4 = game.add.audio('bounce_4');
    soundExplosion = game.add.audio('explosion');
    soundLightning = game.add.audio('lightning');

    // Input
    cursors = game.input.keyboard.createCursorKeys();

    //toStateStart();
    toStateSplash();

    // Detect Mobile Device
    if (!game.device.desktop)
    {
      buttonLeft = game.add.button(10, game.world.height - 80, 'button_left', null, this);
      buttonRight = game.add.button(80, game.world.height - 80, 'button_right', null, this);
      buttonUp = game.add.button(game.world.width - 64 - 10, game.world.height - 150, 'button_up', null, this);
      buttonDown = game.add.button(game.world.width - 64 - 10, game.world.height - 80, 'button_down', null, this);

      buttonLeft.onInputDown.add(function() { cursors.left.isDown = true; });
      buttonLeft.onInputUp.add(function() { cursors.left.isDown = false; });
      buttonRight.onInputDown.add(function() { cursors.right.isDown = true; });
      buttonRight.onInputUp.add(function() { cursors.right.isDown = false; });
      buttonUp.onInputDown.add(function() { cursors.up.isDown = true; });
      buttonUp.onInputUp.add(function() { cursors.up.isDown = false; });
      buttonDown.onInputDown.add(function() { cursors.down.isDown = true; });
      buttonDown.onInputUp.add(function() { cursors.down.isDown = false; });
    }
}

function update()
{
  if (gameState === 'state_tutorial')
    return;

  // Game State
  switch (gameState)
  {
    case 'state_splash':
      stateSplash()
      break;

    case 'state_start':
      stateStart();
      break;

    case 'state_game':
      stateGame();
      break;
  }

  // Ball State
  if (gameState === 'state_game')
  {
    // Check for next goal
    if (level >= goal)
    {
      goal *= 2;
      showGoalReached();
    }

    if (ball.alive)
    {
      switch (ball.state)
      {
        case 'state_fall':
          stateFall();
          break;

        case 'state_touch':
          stateTouch();
          break;
      }
      stateGlobal();
    }

    // Boost Emitter
    ball.boostEmitter.x = ball.body.position.x + ball.width/2;
    ball.boostEmitter.y = ball.body.position.y + ball.height/2;

    // Explode Emitter
    ball.explodeEmitter.x = ball.body.position.x + ball.width/2;
    ball.explodeEmitter.y = ball.body.position.y + ball.height/2;
  }

  // Spawn new platform
  if (lastPlatform && lastPlatform.body.position.y <= game.world.height - PLATFORM_DISTANCE)
    createPlatform();

  // Platforms Logic
  platforms.forEachAlive(function(platform)
  {
    // Tutorial
    if (localStorage.tutorial_bounce === 'true' && platform.body.position.y < 400)
    {
      showTutorialBounce(game.world.width/2, platform.body.position.y + PLATFORM_DISTANCE/2 + 8);
      localStorage.tutorial_bounce = 'false';
    }

    if (platform.body.position.y + platform.height < 0)
    {
      platform.kill();
    }

    platform.body.velocity.y = -PLATFORM_SPEED * speedMultiplier;
  }, null, this);

  // Teaser Logic
  teasers.forEachAlive(function(teaser)
  {
    // Check for Player Killing
    if (teaser.zapping && !ball.boost)
    {
      var boundTop = teaser.body.position.y - LIGHTNING_VERTICAL_RANGE;
      var boundBottom = teaser.body.position.y + LIGHTNING_VERTICAL_RANGE;
      if (ball.body.position.y >= boundTop && ball.body.position.y <= boundBottom)
        toStateOver();
    }

    if (teaser.body.position.y + teaser.height < 0)
    {
      game.time.events.remove(teaser.timer);
      teaser.lightning.kill();
      teaser.kill();
    }

    teaser.body.velocity.y = -PLATFORM_SPEED * speedMultiplier;
    teaser.lightning.position.y = teaser.body.position.y + 8;
  }, null, this);

  // Spikes Logic
  spikes.forEachAlive(function(spike)
  {
    // Tutorial
    if (localStorage.tutorial_spike === 'true' && spike.body.position.y < 500)
    {
      showTutorialTag(spike.body.position.x + 8, spike.body.position.y + 8, 'tutorial_avoid');
      localStorage.tutorial_spike = 'false';
    }

    if (spike.body.position.y + spike.height < 0)
    {
      spike.kill();
    }

    spike.body.velocity.y = -PLATFORM_SPEED * speedMultiplier;
  }, null, this);

  // Flyer Logic
  flyers.forEachAlive(function(flyer)
  {
    // Tutorial
    if (localStorage.tutorial_flyer === 'true' && flyer.body.position.y < 500)
    {
      showTutorialTag(flyer.body.position.x + 16, flyer.body.position.y + 16, 'tutorial_avoid');
      localStorage.tutorial_flyer = 'false';
    }

    if (flyer.body.position.y + flyer.height + 128 < 0)
    {
      flyer.kill();
    }

    flyer.body.velocity.y = -FLYER_SPEED * speedMultiplier;
  }, null, this);

  // Bonus Logic
  bonuses.forEachAlive(function(bonus)
  {
    // Tutorial
    if (localStorage.tutorial_bonus === 'true' && bonus.body.position.y < 500)
    {
      showTutorialTag(bonus.body.position.x + 4, bonus.body.position.y + 8, 'tutorial_take');
      localStorage.tutorial_bonus = 'false';
    }

    if (bonus.body.position.y + bonus.height + 128 < 0)
    {
      bonus.kill();
    }

    bonus.body.velocity.y = -PLATFORM_SPEED * speedMultiplier;
  }, null, this);
}

function render()
{
    //game.debug.text(result, 10, 20);
}

//---------------------------------BALL STATES---------------------------------\\
function stateGlobal()
{
  // Check for player killing
  game.physics.arcade.overlap(ball, borders, function(ball, border)
  {
      toStateOver();
  });

  game.physics.arcade.collide(ball, spikes, function(ball, spike)
  {
    if (ball.boost)
    {
      createExplosion(spike.body.position.x, spike.body.position.y);
      shake();
      spike.kill();
    }
    else
      toStateOver();
  });

  game.physics.arcade.overlap(ball, flyers, function(ball, flyer)
  {
    if (ball.boost)
    {
      createExplosion(flyer.body.position.x, flyer.body.position.y);
      shake();
      flyer.kill();
    }
    else
      toStateOver();
  });

  game.physics.arcade.overlap(ball, teasers, function(ball, teaser)
  {
      toStateOver();
  });

  if (!ball.alive)
    return;

  // Bonus
  game.physics.arcade.overlap(ball, bonuses, function(ball, bonus)
  {
      bonusShot();
      bonus.kill();
  });

  // Ball Movement
  ball.body.acceleration.set(0, GRAVITY);
  ball.body.velocity.x = 0;

  if (cursors.left.isDown)
  {
    ball.body.velocity.x -= BALL_SPEED;
    ball.rotation -= BALL_ROTATION;
  }
  else if (cursors.right.isDown)
  {
    ball.body.velocity.x += BALL_SPEED;
    ball.rotation += BALL_ROTATION;
  }

  // Jump
  if (ball.body.touching.down && cursors.up.isDown)
    ball.body.velocity.y -= BALL_JUMP;

  // Touch Boost
  if (ball.lastTouch === 'down' && ball.body.touching.up)
  {
    ball.lastTouch = 'up';
    boost();
  }
  if (ball.lastTouch === 'up' && ball.body.touching.down)
  {
    ball.lastTouch = 'down';
    boost();
  }
}

function stateTouch()
{
  game.physics.arcade.collide(ball, platforms, null, function(ball, platform)
  {
    // Fall Down
    if (cursors.down.isDown && ball.body.position.y <= platform.body.position.y)
    {
      ball.state = 'state_fall';
      return false;
    }
  });
}

function stateFall()
{
  // Collisions
  game.physics.arcade.collide(ball, platforms,
  function(ball, platform)
  {
    if (touchedPlatform !== platform)
    {
      playSound('bounce');
      ball.state = 'state_touch';
      touchedPlatform = platform;
    }
  },
  function(ball, platform)
  {
    // Skip if platform is above player
    if (platform.body.position.y < ball.body.position.y)
      return true;

    // Skip Collision check with touched platform
    if (platform === touchedPlatform)
    {
      return false;
    }
    else  // Ball touched a new platform
    {
      // If player keeps pressing "down", avoid bouncing
      if (cursors.down.isDown && ball.body.position.y <= platform.body.position.y)
      {
        playSound('bounce');

        // Platform Touched Effect
        platform.flash.alpha = 1;
        game.add.tween(platform.flash)
            .to({ alpha: 0 }, 100, Phaser.Easing.Cubic.In)
            .start();

        // Increase Level
        level += 1;
        levelText.text = level;

        touchedPlatform = platform;
        return false;
      }
    }

    // Increase Level
    level += 1;
    levelText.text = level;

    // Platform Touched Effect
    platform.flash.alpha = 1;
    game.add.tween(platform.flash)
        .to({ alpha: 0 }, 100, Phaser.Easing.Cubic.In)
        .start();

  }, this);
}
//------------------------------ENTITIES CREATION------------------------------\\
function createBall()
{
  // Boost Timer
  var boostTimer = game.time.create(false);

  // Boost Emitter
  var boostEmitter = game.add.emitter(0, 0, 32);
  boostEmitter.gravity = 0;
  boostEmitter.setXSpeed(0, 0);
  boostEmitter.setYSpeed(-80, -50);
  boostEmitter.setAlpha(0.8, 0, EMITTER_TIMEOUT, Phaser.Easing.Linear.InOut);
  boostEmitter.makeParticles('ball');

  // Explode Emitter
  var explodeEmitter = game.add.emitter(0, 0, 32);
  explodeEmitter.gravity = 200;
  explodeEmitter.setAlpha(1, 0, EMITTER_TIMEOUT, Phaser.Easing.Linear.InOut);
  explodeEmitter.makeParticles('particle');

  // Ball
  ball = game.add.sprite(game.world.width/2, 80, 'ball');
  game.physics.enable(ball, Phaser.Physics.ARCADE);
  ball.anchor.set(0.5, 0.5);
  ball.body.collideWorldBounds = true;
  ball.body.bounce.setTo(BALL_BOUNCE, BALL_BOUNCE);
  ball.state = 'state_fall';
  ball.boostTimer = boostTimer;
  ball.boostEmitter = boostEmitter;
  ball.explodeEmitter = explodeEmitter;
  ball.boost = false;
  ball.lastTouch = 'up'; // Down - Up, used to know when to activate Boost

  // Spawn
  ball.alpha = 0;
  var tween = game.add.tween(ball)
      .to({ alpha: 1.0 }, 1000, Phaser.Easing.Quadratic.In)
      .start();
}

function createPlatform()
{
  var platform = platforms.getFirstExists(false);

  if (platform)
  {
    platform.reset(game.world.width/2, game.world.height + 16);
    game.physics.enable(platform, Phaser.Physics.ARCADE);
    platform.body.immovable = true;
    platform.anchor.setTo(0.5, 0.5);

    // Flash Effect
    platform.flash = game.add.graphics(-platform.width/2, -platform.height/2);
    platform.flash.beginFill(0xffffff, 1);
    platform.flash.drawRect(0, 0, platform.width, platform.height);
    platform.flash.endFill();
    platform.flash.alpha = 0;
    platform.addChild(platform.flash);

    lastPlatform = platform;

    // Random Spike
    if (game.rnd.frac() <= SPIKE_CHANCE)
      createSpike(game.rnd.integerInRange(1, 4));

    // Random Teaser
    if (game.rnd.frac() <= TEASER_CHANCE)
      createTeaser();

    // Random Bonus
    if (game.rnd.frac() <= BONUS_CHANCE)
      createBonus();
  }
}

function createTeaser()
{
  if (gameState !== 'state_game')
    return;

  var teaser = teasers.getFirstDead(false);

  if (teaser)
  {
    teaser.reset(0, game.world.height + PLATFORM_DISTANCE/2 + 8, '');
    game.physics.enable(teaser, Phaser.Physics.ARCADE);

    var teaserLeft = game.add.sprite(-8, 0, 'teaser');
    var teaserRight = game.add.sprite(game.world.width - 8, 0, 'teaser');

    teaser.addChild(teaserLeft);
    teaser.addChild(teaserRight);

    teaser.teaserLeft = teaserLeft;
    teaser.teaserRight = teaserRight;

    // Lightning
    if (!teaser.lightningBitmap)
      teaser.lightningBitmap = game.add.bitmapData(game.world.width-16, 200);

    if (!teaser.lightning)
      teaser.lightning = game.add.image(8, teaser.body.position.y + 16, teaser.lightningBitmap);
    else
      teaser.lightning.reset(8, teaser.body.position.y + 16);

    teaser.lightning.anchor.setTo(0, 0.5);
    teaser.timer = game.time.events.loop(Phaser.Timer.SECOND * 2, zap, this, teaser);
  }
}

function createSpike(count)
{
  var randX = game.rnd.integerInRange(16, game.world.width - (count * 16));
  for (var i = 0; i < count; i++)
  {
    var spike = spikes.getFirstExists(false);

    if (spike)
    {
      spike.reset(randX + (i * spike.width), game.world.height);
      game.physics.enable(spike, Phaser.Physics.ARCADE);
      spike.body.immovable = true;
      spike.anchor.setTo(0.5, 0.5);
    }
  }
}

function createFlyer()
{
  var randX = game.rnd.integerInRange(32, game.world.width - 32);

  for (var i = 0; i < 3; i++)
  {
    var flyer = flyers.getFirstExists(false);
    if (flyer)
    {
      if (i === 0)
        flyer.reset(randX - 16, game.world.height + 16);
      else if (i === 1)
        flyer.reset(randX, game.world.height);
      else if (i === 2)
        flyer.reset(randX + 16, game.world.height + 16);

      game.physics.enable(flyer, Phaser.Physics.ARCADE);
      flyer.body.immovable = true;
      flyer.anchor.setTo(0.5, 0.5);

      // Flyer Emitter
      if (!flyer.emitter)
      {
        flyer.emitter = game.add.emitter(0, 0, 32);
        flyer.emitter.gravity = 0;
        flyer.emitter.setXSpeed(0, 0);
        flyer.emitter.setYSpeed(80, 50);
        flyer.emitter.setAlpha(1, 0, EMITTER_TIMEOUT, Phaser.Easing.Linear.InOut);
        flyer.emitter.makeParticles('yellow_particle');
        flyer.emitter.start(false, EMITTER_TIMEOUT, 200);
        flyer.addChild(flyer.emitter);
      }

      // Flyer Sprite
      if (!flyer.sprite)
      {
        flyer.sprite = game.add.sprite(0, 0, 'flyer');
        flyer.sprite.anchor.setTo(0.5, 0.5);
        flyer.addChild(flyer.sprite);
      }
    }
  }

  // Spawn Next Random Flyer
  game.time.events.add(game.rnd.integerInRange(Phaser.Timer.SECOND * FLYER_MIN_TIME,
    Phaser.Timer.SECOND * FLYER_MAX_TIME), createFlyer, this);
}

function createBonus()
{
  var randX = game.rnd.integerInRange(32, game.world.width - 32);
  var bonus = bonuses.getFirstExists(false);

  if (bonus)
  {
    bonus.reset(randX, game.world.height + PLATFORM_DISTANCE/2 + 16);
    game.physics.enable(bonus, Phaser.Physics.ARCADE);
    bonus.body.immovable = true;
    bonus.anchor.setTo(0.5, 0.5);

    game.add.tween(bonus)
      .to({ x: randX - 16 }, 1000, Phaser.Easing.Sinusoidal.InOut, false, 0, -1, true)
      .start();
  }
}

function createExplosion(x, y)
{
  explosion = game.add.emitter(x, y, 8);
  explosion.gravity = 200;
  explosion.setAlpha(1, 0, EMITTER_TIMEOUT, Phaser.Easing.Linear.InOut);
  explosion.makeParticles('yellow_particle');
  explosion.start(true, EMITTER_TIMEOUT, null, 32);
  playSound('explosion');
}
//---------------------------------GAME STATE----------------------------------\\
function toStateSplash()
{
  // Show Title Text
  titleText.y = -64;
  game.add.tween(titleText)
    .to({ y: 100 }, 1000, Phaser.Easing.Elastic.Out)
    .start();

  // Start game after 2 seconds
  game.time.events.add(Phaser.Timer.SECOND * 2, function()
  {
    // Show Level Text
    levelText.y = -64;
    game.add.tween(levelText)
      .to({ y: 100 }, 1000, Phaser.Easing.Elastic.Out)
      .start();

    // Bring title text back to bottom
    game.add.tween(titleText)
      .to({ y: game.world.height + 64 }, 1000, Phaser.Easing.Elastic.Out)
      .start();

    toStateGame();
  }, this);

  state = 'state_splash';
}

function stateSplash() {}

function toStateGame()
{
  // Spawn Random Flyer
  game.time.events.add(game.rnd.integerInRange(Phaser.Timer.SECOND * FLYER_MIN_TIME,
    Phaser.Timer.SECOND * FLYER_MAX_TIME), createFlyer, this);

  touchedPlatform = null;

  // Create Platform
  createPlatform();

  // Create Ball
  createBall();

  // Tutorial
  if (localStorage.tutorial_keys === 'true')
  {
    showTutorialTag(ball.body.position.x, ball.body.position.y, 'tutorial_keys');
    localStorage.tutorial_keys = 'false';
  }

  gameState = 'state_game';
}

function stateGame() {}

// Slide all game objects in screen down
function toStateStart()
{
  // Reset Level
  level = 0;
  levelText.text = 0;

  // Start game after 1 second
  game.time.events.add(Phaser.Timer.SECOND * 1, function()
  {
    toStateGame();
  }, this);

  state = 'state_start';
}

function stateStart() {}

function toStateOver()
{
  playSound('explosion');
  gameState = 'state_over';

  // Reset All Timers
  game.time.removeAll();

  speedMultiplier = 1;

  // Kill all traps
  bonusShot();

  // Kill Player
  ball.boostEmitter.on = false;
  ball.explodeEmitter.start(true, EMITTER_TIMEOUT, null, 32);
  ball.kill();

  // Save Score
  localStorage.goal = goal;

  // Show Game Over Text
  gameOverText.y = game.world.height + 64;
  game.add.tween(gameOverText)
    .to({ y: 400 }, 1000, Phaser.Easing.Elastic.Out)
    .start();

  // Show Next Goal Text
  goalText.text = 'NEXT GOAL ' + goal;
  goalText.y = game.world.height + 64;
  game.add.tween(goalText)
    .to({ y: 500 }, 1000, Phaser.Easing.Elastic.Out)
    .start();

  game.time.events.add(Phaser.Timer.SECOND * 2, function()
  {
    // Bring texts back to bottom
    game.add.tween(gameOverText)
      .to({ y: game.world.height + 64 }, 1000, Phaser.Easing.Elastic.Out)
      .start();

    game.add.tween(goalText)
      .to({ y: game.world.height + 64 }, 1000, Phaser.Easing.Elastic.Out)
      .start();

    toStateStart();
  }, this);

  // Kill Bonuses
  bonuses.forEachAlive(function(bonus)
  {
    var tween = game.add.tween(bonus)
      .to({ alpha: 0 }, 600, Phaser.Easing.Linear.In)
      .start();

    tween.onComplete.add(function() { bonus.kill(); }, this);
  }, this);

  // Tween platforms down
  platforms.forEachAlive(function(platform)
  {
    var tween = game.add.tween(platform)
      .to({ y: game.world.height + 32 }, 600, Phaser.Easing.Cubic.In)
      .start();

    tween.onComplete.add(function() { platform.kill(); }, this);
  }, this);
}

function gameOver()
{

}
//-----------------------------------EFFECTS-----------------------------------\\
function showGoalReached()
{
  goalText.text = 'GOAL!';
  goalText.y = game.world.height + 64;
  game.add.tween(goalText)
    .to({ y: 500 }, 1000, Phaser.Easing.Elastic.Out)
    .start();

  game.time.events.add(Phaser.Timer.SECOND * 2, function()
  {
    // Bring texts back to bottom
    game.add.tween(goalText)
      .to({ y: game.world.height + 64 }, 1000, Phaser.Easing.Elastic.Out)
      .start();
  }, this);
}

function shake()
{
  game.camera.y = 0;
  game.add.tween(game.camera)
    .to({ y: -10 }, 40, Phaser.Easing.Sinusoidal.InOut, false, 0, 5, true)
    .start();
}

function bonusShot()
{
  // Shake!
  shake();

  // Kill Traps
  spikes.forEachAlive(function(spike)
  {
    createExplosion(spike.body.position.x, spike.body.position.y);
    spike.kill();
  }, this);

  flyers.forEachAlive(function(flyer)
  {
    createExplosion(flyer.body.position.x, flyer.body.position.y);
    flyer.kill();
  }, this);

  teasers.forEachAlive(function(teaser)
  {
    createExplosion(teaser.teaserLeft.position.x, teaser.teaserLeft.position.y);
    createExplosion(teaser.teaserRight.position.x, teaser.teaserRight.position.y);

    teaser.lightning.kill();
    teaser.kill();
  }, this);
}

function boost()
{
  ball.boostTimer.stop(true); // Remove previous time events
  ball.boost = true;
  ball.boostEmitter.start(false, EMITTER_TIMEOUT, 60);

  speedMultiplier += 1;
  if (speedMultiplier > MAX_MULTIPLIER)
    speedMultiplier = MAX_MULTIPLIER;

  ball.boostTimer.add(EMITTER_TIMEOUT, function()
  {
    ball.boostEmitter.on = false;
    ball.boost = false;
    speedMultiplier = 1;
  }, this);

  ball.boostTimer.start();
}

function zap(teaser)
{
  playSound('lightning');
  teaser.zapping = true;

  // Create the lightning texture
  createLightningTexture(teaser);

  // Make the lightning sprite visible
  teaser.lightning.alpha = 1;

  // Fade out the lightning sprite using a tween on the alpha property
  // Check out the "Easing function" examples for more info.
  var zapTween = game.add.tween(teaser.lightning)
      .to({ alpha: 0.5 }, 100, Phaser.Easing.Bounce.Out)
      .to({ alpha: 1.0 }, 100, Phaser.Easing.Bounce.Out)
      .to({ alpha: 0.5 }, 100, Phaser.Easing.Bounce.Out)
      .to({ alpha: 1.0 }, 100, Phaser.Easing.Bounce.Out)
      .to({ alpha: 0 }, 250, Phaser.Easing.Cubic.In)
      .start();

  zapTween.onComplete.add(function()
  {
    teaser.zapping = false;
  }, this);
}

function createLightningTexture(teaser)
{
  // Get the canvas drawing context for the lightningBitmap
  var ctx = teaser.lightningBitmap.context;
  var width = teaser.lightningBitmap.width;
  var height = teaser.lightningBitmap.height;

  // Clear the canvas
  ctx.clearRect(0, 0, width, height);

  // Set the starting position and number of line segments
  var x = 0;
  var y = height/2;
  var segments = 20;

  // Draw each of the segments
  for(var i = 0; i < segments; i++)
  {
      // Set the lightning color and bolt width
      ctx.strokeStyle = 'rgb(255, 255, 255)';
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.moveTo(x, y);

      // Calculate an y offset from the end of the last line segment and
      // keep it within the bounds of the bitmap
      if (i == segments - 1)
      {
        y = height/2;
      }
      else
      {
        y += game.rnd.integerInRange(-LIGHTNING_VERTICAL_RANGE, LIGHTNING_VERTICAL_RANGE);
        if (y <= LIGHTNING_VERTICAL_RANGE) y = LIGHTNING_VERTICAL_RANGE;
        if (y >= height-LIGHTNING_VERTICAL_RANGE) y = height-LIGHTNING_VERTICAL_RANGE;
      }


      // Calculate a x offset from the end of the last line segment.
      // When we've reached the ground or there are no more segments left,
      // set the y position to the height of the bitmap.
      x += game.rnd.integerInRange(20, height/segments);
      if (i == segments - 1 || x > width) {
          x = width;
      }

      // Draw the line segment
      ctx.lineTo(x, y);
      ctx.stroke();

      // Quit when we've reached the end point
      if (x >= width) break;
  }

  // This just tells the engine it should update the texture cache
  teaser.lightningBitmap.dirty = true;
}

function freezeObjects()
{
  ball.body.enable = false;
  platforms.forEachAlive(function(platform) { platform.body.enable = false; }, this);
  flyers.forEachAlive(function(flyer) { flyer.body.enable = false; }, this);
  spikes.forEachAlive(function(spike) { spike.body.enable = false; }, this);
  teasers.forEachAlive(function(teaser) { teaser.body.enable = false; }, this);
  bonuses.forEachAlive(function(bonus) { bonus.body.enable = false; }, this);
}

function unFreezeObjects()
{
  ball.body.enable = true;
  platforms.forEachAlive(function(platform) { platform.body.enable = true; }, this);
  flyers.forEachAlive(function(flyer) { flyer.body.enable = true; }, this);
  spikes.forEachAlive(function(spike) { spike.body.enable = true; }, this);
  teasers.forEachAlive(function(teaser) { teaser.body.enable = true; }, this);
  bonuses.forEachAlive(function(bonus) { bonus.body.enable = true; }, this);
}
//-----------------------------------AUDIO-------------------------------------\\
function playSound(sound)
{
  switch (sound)
  {
    case 'bounce':

      if (soundBounceIndex === 0)
        soundBounce1.play();
      if (soundBounceIndex === 1)
        soundBounce2.play();
      if (soundBounceIndex === 2)
        soundBounce3.play();
      if (soundBounceIndex === 3)
        soundBounce4.play();

      soundBounceIndex = (soundBounceIndex + 1) % 4;
      break;

    case 'explosion':

      if (soundExplosion.isPlaying)
        return;

      soundExplosion.play();
      break;

    case 'lightning':
      soundLightning.play();
      break;

  }
}
//----------------------------------TUTORIAL-----------------------------------\\
function showTutorialTag(x, y, sprite)
{
  var tag = game.add.sprite(x, y, sprite);
  game.physics.enable(tag, Phaser.Physics.ARCADE);
  tag.anchor.setTo(0.5, 0.5);
  tag.body.angularVelocity = 200;
  gameState = 'state_tutorial';

  // Stop all game objects
  freezeObjects();

  game.time.events.add(Phaser.Timer.SECOND * 4, function()
  {
    var tween = game.add.tween(tag)
        .to({ alpha: 0 }, 1000, Phaser.Easing.Linear.In)
        .start();

    // Re-enable physics
    unFreezeObjects();

    tween.onComplete.add(function() { tag.kill(); }, this);
    gameState = 'state_game';

  }, this);
}

function showTutorialBounce(x, y)
{
  var tag = game.add.sprite(x, y, 'tutorial_bounce');
  game.physics.enable(tag, Phaser.Physics.ARCADE);
  tag.anchor.setTo(0.5, 0.5);
  gameState = 'state_tutorial';

  game.add.tween(tag)
      .to({ y: y + 16 }, 1000, Phaser.Easing.Sinusoidal.InOut, false, 0, -1, true)
      .start();

  // Stop all game objects
  freezeObjects();

  game.time.events.add(Phaser.Timer.SECOND * 4, function()
  {
    var tween = game.add.tween(tag)
        .to({ alpha: 0 }, 1000, Phaser.Easing.Linear.In)
        .start();

    // Re-enable physics
    unFreezeObjects();

    tween.onComplete.add(function() { tag.kill(); }, this);
    gameState = 'state_game';

  }, this);
}
