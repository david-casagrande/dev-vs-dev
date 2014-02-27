Router.configure({
  layoutTemplate: 'layout'
});

Router.map(function () {

  this.route('start', {
    path: '/',
    template: 'start',
    before: function(){
      var viewer = Players.findOne({ _id: Session.get('playerId') });
      if(viewer){
        Players.update(Session.get('playerId'), { $set: { watching: null } })
      }      
    }
  });

  this.route('game', {
    path: '/:_id',
    template: 'game',
    before: function () {
      var game   = Games.findOne({ _id: this.params._id });
      if(game){
        Session.set('current_game', this.params._id);
      }

      var viewer = Players.findOne({ _id: Session.get('playerId') });
      if(viewer && game){
        Players.update(Session.get('playerId'), { $set: { watching: this.params._id } })
      }
    }

  });

});