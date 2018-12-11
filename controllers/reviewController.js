const mongoose = require('mongoose');
const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
  // we get the user id from the user object and the store id from the params
  req.body.author = req.user._id;
  req.body.store = req.params.id;
  const review = await new Review(req.body).save();

  req.flash('success', 'Review Saved!');
  res.redirect('back');
};
