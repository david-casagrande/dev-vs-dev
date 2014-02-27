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
    'click #new_game': function (e) {
      var game = Games.insert({ timer: 30, player1: Players.findOne({ _id: Session.get('playerId') }) });
      Router.go('game', {_id: game});
      return false;
    }
  });

  Template.start.games = function(){
    return Games.find({});
  };

  Template.game.game = function(){
    return Games.findOne({ _id: Session.get('current_game') });
  };

  Template.game.loading = function(){
    return Session.get('loading_games');
  };

  Template.game.is_player = function(){
    return Games.findOne({ _id: Session.get('current_game'), 'player1._id': Session.get('playerId') });
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
      var game = Games.findOne({ _id: Session.get('current_game') });
      if(game.player1._id !== Session.get('playerId')) {
        var player2 = Players.findOne({ _id: Session.get('playerId') });
        if(player2) {
          Games.update(Session.get('current_game'), { $set: { player2: player2 } })
        }
      }
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

    }

  });

}