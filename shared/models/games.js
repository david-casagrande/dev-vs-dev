Games = new Meteor.Collection('games');

Games.allow({
  insert: function (userId, doc) {
    // the user must be logged in, and the document must be owned by the user
    console.log(userId)
    return true;
  },
  update: function (userId, doc) {
    // the user must be logged in, and the document must be owned by the user
    return true;
  },
  remove: function (userId, doc) {
    // can only remove your own documents
    return true;
  }
});