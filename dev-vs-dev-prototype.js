var findPlayer = function (id) {
  return Players.findOne({ _id: id });
};

if (Meteor.isClient) {

  Template.hello.events({
    'change input[type="text"]': function (e) {
      // template data, if any, is available in 'this'
      var val = e.target.value;
      if(val && Session.get('playerId')){
        Players.update(Session.get('playerId'), {$set: { name: val } });
      }
    }
  });

  Template.hello.player = function () {
    return Players.findOne({ _id: Session.get('playerId') });
  };

  Template.hello.players = function () {
    return Players.find();
  };  

  Template.start.events({
    'click #new_game': function () {
      Meteor.call('newGame', Session.get('playerId'), function(error, result){
        if(result){ Router.go('game', { _id: result }); }
      });
      return false;
    }
  });
/*
  Template.start.games = function(){
    return Games.find({});
  };
*/
  Template.game.game = function(){
    return Games.findOne({ _id: Session.get('current_game') });
  };

  Template.game.loading = function(){
    return Session.get('loading_games');
  };

  Template.game.player1 = function(){
    return Games.findOne({ _id: Session.get('current_game'), 'player1._id': Session.get('playerId') });
  }; 

  Template.game.player2 = function(){
    return Games.findOne({ _id: Session.get('current_game'), 'player2._id': Session.get('playerId') });
  }; 

  Template.game.viewers = function(){
    return Players.find({ watching: Session.get('current_game') });
  };  

  Template.game.events({
    'click #start_game': function () {
      Meteor.call('startGame', Session.get('current_game'));
      return false;
    },

    'click #player-2-join': function(){
      Meteor.call('joinGame', { game: Session.get('current_game'), player: Session.get('playerId') });
      return false;
    },

    'keydown #answer': function(e){
      var keyCode = e.keyCode || e.which;
      if(keyCode === 9) {
        e.preventDefault();
        e.target.value += '\t';
      }
    },

    'click #done': function(e){
      var answer = document.getElementById('answer'),
          data = {
            answer:   answer.value, 
            gameId:   Session.get('current_game'),
            playerId: Session.get('playerId')
          };
      Meteor.call('saveAnswer', data);
      return false;
    }

  
  });

  Meteor.startup(function () {
    Session.set('loading_games', true);

    Deps.autorun(function () {
      Meteor.subscribe('players');
      Meteor.subscribe('games', function(){
        Session.set('loading_games', false);
      });
    });

    Meteor.call('createGame', window.localStorage['dev_vs_dev_player_id'], function(error, result){
      if(typeof result === 'string'){
        window.localStorage['dev_vs_dev_player_id'] = result;
        Session.set('playerId', result);
      }
      else {
        Session.set('playerId', result._id);
      }
    });

  });

}

if (Meteor.isServer) {

  Meteor.onConnection(function(connection){
    //var playerId = Players.insert({name: '', idle: false});
    connection.onClose(function() {
      console.log(connection)
      //Players.remove(playerId);
    });
  });

  Meteor.publish('players', function () {
    return Players.find({});
  });

  Meteor.publish('games', function () {
    return Games.find({});
  });

  Meteor.methods({
    
    createGame: function(playerId){
      var player = findPlayer(playerId);
      if(player){
        return player;
      }
      else {
        return Players.insert({ name: '', idle: false, last_played: new Date() });
      }
    },

    newGame: function(player1){
      player1 = Players.findOne({ _id: player1 });
      var game = Games.insert({ timer: 240, player1: player1 });
      console.log(game);
      return game;
    },

    startGame: function(gameId){
      
      var game        = Games.findOne({ _id: gameId }),
          currentTime = game.timer;

      var reduceTime = function(){
          Meteor.setTimeout(function(){
            if(currentTime > 0){
              Games.update(gameId, { $set: { timer: currentTime -= 1 } } );
              reduceTime();
            }
            else {
              Games.update(gameId, { $set: { game_on: false, game_completed: true } } );
            }
          }, 1000);
      }

      Games.update(gameId, { $set: { game_on: true } } );
      reduceTime();

    },

    joinGame: function(data){
      var game = Games.findOne({ _id: data.game });

      if(game.player1._id !== data.player) {
        var player2 = Players.findOne({ _id: data.player });
        if(player2) {
          Games.update(data.game, { $set: { player2: player2 } })
        }
      }

    },

    saveAnswer: function(data){
      var game      = Games.findOne({ _id: data.gameId }),
          isPlayer1 = game.player1._id === data.playerId ? true : false,
          isPlayer2 = game.player2._id === data.playerId ? true : false,
          answer    = null;

      var checkAnswer = function(){
        var a = eval(data.answer);
        return a[0] === 0 && a[9] === 9 && a.length === 10;
      }

      if(isPlayer1) {
        answer = { 'answer1' : data.answer };
        if(!game.winner && checkAnswer()) {
          answer.winner = 'player1';
        }
      }
      if(isPlayer2) {
        answer = { 'answer2' : data.answer };
        if(!game.winner && checkAnswer()) {
          answer.winner = 'player2';
        } 
      }

      if(answer){
        Games.update(data.gameId, { $set: answer } );
      }

    }    

  });

}